import { Card, RiggedDeckDeque, DeckTelemetry } from './structures/RiggedDeckDeque.js';
import {
  SoulPotStack,
  SoulVaultMap,
  SoulOwner,
  SoulPotTelemetry,
  SoulVaultTelemetry
} from './structures/SoulStructures.js';
import {
  DarbyBrainFSM,
  DarbyDecisionTree,
  DarbyMetrics,
  DarbyFSMState,
  DioDemandEvaluation,
  DarbyBrainTelemetry
} from './structures/DarbyBrain.js';
import { IntelComboDAG, DAGTelemetry } from './structures/IntelComboDAG.js';
import { PlayerPatternQueue, QueueTelemetry, TacticalAction } from './structures/PlayerPatternQueue.js';
import { PokerHandEvaluator, EvaluatedHand } from './structures/PokerHandEvaluator.js';

export type GamePhase =
  | 'BETWEEN_HANDS'
  | 'BLIND_SELECTION'
  | 'DEALING'
  | 'OBSERVE_WINDOW'
  | 'ACCUSATION_WINDOW'
  | 'PRE_DRAW_BETTING'
  | 'DRAW_PHASE'
  | 'POST_DRAW_BETTING'
  | 'BETTING_ROUND' // backward compatibility alias
  | 'DIO_DEMAND_RESPONSE'
  | 'SHOWDOWN'
  | 'VICTORY'
  | 'DEFEAT';

export type PortraitMood =
  | 'NEUTRAL'
  | 'CONFIDENT'
  | 'SMUG'
  | 'GREEDY'
  | 'SUSPICIOUS'
  | 'SWEATING'
  | 'PANICKED'
  | 'WHITE_HAIR'
  | 'RESOLUTE';

export interface DialogueState {
  speaker: 'JOTARO KUJO' | 'DANIEL J. D\'ARBY' | 'MUHAMMAD AVDOL' | 'DEALER BOY' | 'SYSTEM';
  text: string;
  portraitMood: PortraitMood;
}

export type ActionReportType = 'CHEAT_BOTTOM' | 'CHEAT_SECOND' | 'CLEAN' | 'TAMPER' | 'STUNT' | 'BLUFF' | 'MISS';

export interface ActionReport {
  type: ActionReportType;
  title: string;
  text: string;
}

export interface AvdolAdvice {
  available: boolean;
  darbyDiscardCount: number;
  estimatedDarbyHand: string;
  bluffProbability: number;
  recommendation: 'CALL' | 'RAISE' | 'FOLD' | 'CHECK';
  adviceText: string;
}

export interface SanitizedGameState {
  phase: GamePhase;
  handNumber: number;
  dealer: 'DANIEL J. D\'ARBY' | 'DEALER BOY';
  isBlindHand: boolean;
  cardsLookedAt: boolean;
  starPlatinumCharges: number;
  dioDemandCharges: number;
  jotaroHand: Card[]; // Strictly masked if isBlindHand unless showdown/victory/defeat
  darbyHand: Card[];  // STRICTLY masked until showdown/victory/defeat
  darbyHandCount: number;
  discardedIndices: number[];
  darbyDiscardCount: number;
  currentStreet: 'PRE_DRAW' | 'POST_DRAW';
  jotaroStreetBet: number;
  darbyStreetBet: number;
  toCall: number;
  potDeficit: number;
  actionFeed: string[];
  canTamper: boolean;
  canPhantomStunt: boolean;
  canDemandDio: boolean;
  demandDioDisabledReason?: string;
  hasPocketedIntel: boolean;
  hasPhantomStunt: boolean;
  hasTamperedThisHand: boolean;
  hasBluffedThisHand: boolean;
  isDarbyBluffing: boolean;
  remainingDeckCards: number;
  recentCheatType: 'BOTTOM_DEAL' | 'SECOND_DEAL' | 'NONE';
  actionReport: ActionReport | null;
  dialogue: DialogueState;
  showdownResult: {
    winner: 'PLAYER' | 'DARBY' | 'PUSH' | null;
    playerHandEval: EvaluatedHand | null;
    darbyHandEval: EvaluatedHand | null;
    message: string;
  } | null;
  avdolAdvice: AvdolAdvice;
  dsTelemetry: {
    deck: DeckTelemetry;
    soulPot: SoulPotTelemetry;
    soulVault: SoulVaultTelemetry;
    darbyBrain: DarbyBrainTelemetry;
    intelDAG: DAGTelemetry;
    patternQueue: QueueTelemetry;
  };
}

function formatCard(card: Card): string {
  const rankNames: Record<string, string> = {
    'A': 'Ace',
    'K': 'King',
    'Q': 'Queen',
    'J': 'Jack',
    '10': '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2'
  };
  const suitNames: Record<string, string> = {
    'SPADES': 'Spades',
    'HEARTS': 'Hearts',
    'DIAMONDS': 'Diamonds',
    'CLUBS': 'Clubs'
  };
  const r = rankNames[card.rank] || card.rank;
  const s = suitNames[card.suit] || card.suit;
  return `${r} of ${s}`;
}

export class GameEngine {
  public deck: RiggedDeckDeque;
  public soulPot: SoulPotStack;
  public soulVault: SoulVaultMap;
  public darbyFSM: DarbyBrainFSM;
  public decisionTree: DarbyDecisionTree;
  public intelDAG: IntelComboDAG;
  public patternQueue: PlayerPatternQueue;

  // Game tracking state
  public phase: GamePhase = 'BLIND_SELECTION';
  public handNumber: number = 1;
  public dealer: 'DANIEL J. D\'ARBY' | 'DEALER BOY' = 'DANIEL J. D\'ARBY';
  public isBlindHand: boolean = false;
  public cardsLookedAt: boolean = false;
  public starPlatinumCharges: number = 3;
  public dioDemandCharges: number = 3;

  // Street Betting & Ticker tracking
  public currentStreet: 'PRE_DRAW' | 'POST_DRAW' = 'PRE_DRAW';
  public jotaroStreetBet: number = 0;
  public darbyStreetBet: number = 0;
  public darbyDiscardCount: number = 0;
  public actionFeed: string[] = [];

  public get toCall(): number {
    return Math.max(0, this.darbyStreetBet - this.jotaroStreetBet);
  }

  // Real authoritative cards (server only!)
  private authoritativeJotaroHand: Card[] = [];
  private authoritativeDarbyHand: Card[] = [];

  // Cheat state & inspection
  public recentCheatType: 'BOTTOM_DEAL' | 'SECOND_DEAL' | 'NONE' = 'NONE';
  public lastBottomDealtCard: Card | null = null;
  public wasPreviouslyAccused: boolean = false;
  public isBaiting: boolean = false;
  public hasPocketedIntel: boolean = false;
  public hasPhantomStunt: boolean = false;
  public hasTamperedThisHand: boolean = false;
  public hasBluffedThisHand: boolean = false;
  public isDarbyBluffing: boolean = false;
  public discardedIndices: number[] = [];

  // Permanent vs Turn Paranoia:
  // rawBaseParanoia starts at 10 and changes only through the mental-state helper.
  public rawBaseParanoia: number = 10;
  public isNeutralDealerActive: boolean = false;

  public metrics: DarbyMetrics = {
    rawBaseParanoia: 10,
    paranoia: 10,
    composure: 90,
    suspicion: 20,
    greed: 40,
    threatImmunity: 0,
    stuntSucceeded: false,
    cheatExposed: false,
    dioDemandChargesUsed: 0
  };

  // Dialogue
  public dialogue: DialogueState = {
    speaker: 'DANIEL J. D\'ARBY',
    text: '"Good evening, Jotaro Kujo. To recover your friends Polnareff and Joseph, you must match my wagers. I shall deal the opening cards myself..."',
    portraitMood: 'CONFIDENT'
  };

  // Star Platinum Action Report (separate from D'Arby's in-character dialogue)
  public actionReport: ActionReport | null = null;

  public showdownResult: SanitizedGameState['showdownResult'] = null;

  constructor() {
    this.deck = new RiggedDeckDeque();
    this.soulPot = new SoulPotStack();
    this.soulVault = new SoulVaultMap();
    this.darbyFSM = new DarbyBrainFSM();
    this.decisionTree = new DarbyDecisionTree();
    this.intelDAG = new IntelComboDAG();
    this.patternQueue = new PlayerPatternQueue();

    this.initHand();
  }

  public resetGame(): void {
    this.handNumber = 1;
    this.isNeutralDealerActive = false;
    this.dealer = 'DANIEL J. D\'ARBY';
    this.rawBaseParanoia = 10;
    this.isBlindHand = false;
    this.cardsLookedAt = false;
    this.hasPocketedIntel = false;
    this.metrics = {
      rawBaseParanoia: 10,
      composure: 90,
      paranoia: 10,
      suspicion: 20,
      greed: 40,
      threatImmunity: 0,
      stuntSucceeded: false,
      cheatExposed: false,
      dioDemandChargesUsed: 0
    };
    this.wasPreviouslyAccused = false;
    this.soulPot.clear();
    this.soulVault.initVault();
    this.darbyFSM.resetState();
    this.starPlatinumCharges = 3;
    this.dioDemandCharges = 3;
    this.initHand();
  }

  /**
   * Couple Composure and Paranoia dynamically on an inverse scale (cannot exceed 100% combined).
   * Separates rawBaseParanoia from turn-effective Paranoia.
   */
  public syncComposureAndParanoia(paranoiaDelta: number = 0): void {
    if (paranoiaDelta !== 0) {
      this.rawBaseParanoia = Math.min(100, Math.max(10, this.rawBaseParanoia + paranoiaDelta));
    }

    const hollyInPot = this.soulVault.get('HOLLY').inPot > 0;
    const hollyMult = hollyInPot ? 1.6 : 1.0;
    const blindMult = this.isBlindHand ? 1.5 : 1.0;
    const stuntBonus = this.hasPhantomStunt ? 35 : 0;
    const intelBonus = this.hasPocketedIntel ? 20 : 0;
    const accusationPenalty = this.wasPreviouslyAccused ? 25 : 0;
    const immunity = this.metrics.threatImmunity;

    const effectiveParanoia = Math.min(100, Math.max(
      10,
      Math.round(this.rawBaseParanoia * hollyMult * blindMult + stuntBonus + intelBonus + accusationPenalty - immunity)
    ));

    this.metrics.rawBaseParanoia = this.rawBaseParanoia;
    this.metrics.paranoia = effectiveParanoia;
    this.metrics.composure = 100 - effectiveParanoia;

    // Sync FSM
    this.darbyFSM.evaluateFSM(this.metrics);

    // Sync dialogue portrait mood with current FSM state so they NEVER contradict
    const fsmState = this.darbyFSM.getState();
    if (fsmState === 'CATATONIC') {
      this.dialogue.portraitMood = 'WHITE_HAIR';
    } else if (fsmState === 'PARANOID') {
      this.dialogue.portraitMood = 'PANICKED';
    } else if (fsmState === 'SUSPICIOUS') {
      this.dialogue.portraitMood = 'SWEATING';
    } else if (fsmState === 'GREEDY') {
      this.dialogue.portraitMood = 'GREEDY';
    } else if (fsmState === 'CALCULATING') {
      this.dialogue.portraitMood = 'CONFIDENT';
    } else {
      this.dialogue.portraitMood = 'SMUG';
    }
  }

  private adjustDarbyParanoia(deltaParanoia: number): void {
    const targetParanoia = Math.min(100, Math.max(10, Math.round(this.metrics.paranoia + deltaParanoia)));
    const hollyMult = this.soulVault.get('HOLLY').inPot > 0 ? 1.6 : 1.0;
    const blindMult = this.isBlindHand ? 1.5 : 1.0;
    const additiveModifiers =
      (this.hasPhantomStunt ? 35 : 0) +
      (this.hasPocketedIntel ? 20 : 0) +
      (this.wasPreviouslyAccused ? 25 : 0) -
      this.metrics.threatImmunity;

    this.rawBaseParanoia = Math.min(
      100,
      Math.max(10, (targetParanoia - additiveModifiers) / (hollyMult * blindMult))
    );
    this.syncComposureAndParanoia();
  }

  public drawSafeCard(): Card {
    try {
      if (this.deck.size > 0) {
        return this.deck.dealFair();
      }
    } catch (e) {
      console.warn('drawSafeCard deck empty, resetting:', e);
    }
    this.deck.reset(this.dealer === 'DANIEL J. D\'ARBY');
    return this.deck.dealFair();
  }

  public initHand(): void {
    this.dealer = this.isNeutralDealerActive ? 'DEALER BOY' : 'DANIEL J. D\'ARBY';
    this.deck.reset(this.dealer === 'DANIEL J. D\'ARBY');
    this.isBlindHand = false;
    this.cardsLookedAt = false;
    this.authoritativeJotaroHand = [];
    this.authoritativeDarbyHand = [];
    this.discardedIndices = [];
    this.darbyDiscardCount = 0;
    this.recentCheatType = 'NONE';
    this.lastBottomDealtCard = null;
    this.isBaiting = false;
    this.hasPhantomStunt = false;
    this.hasTamperedThisHand = false;
    this.hasBluffedThisHand = false;
    this.isDarbyBluffing = false;
    this.hasPocketedIntel = false;
    this.showdownResult = null;
    this.actionReport = null;
    this.currentStreet = 'PRE_DRAW';
    this.jotaroStreetBet = 0;
    this.darbyStreetBet = 0;
    this.intelDAG.resetHand();

    // Reset action ticker feed
    this.actionFeed = ['Hand initialized: 1 Ante chip posted by each player.'];

    // Post 1 Ante chip from Jotaro and 1 D'Arby chip using captured-chip priority.
    this.soulVault.pledgeToPot('JOTARO', 1, this.soulPot, 'ANTE', true);
    this.soulVault.darbyMatchCall(1, this.soulPot, 'ANTE');

    this.phase = 'BLIND_SELECTION';
    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"Before I deal, will you look at your cards like a normal mortal... or dare to play blind?"',
      portraitMood: 'CONFIDENT'
    };

    this.syncComposureAndParanoia();
  }

  /* ------------------------------------------------------------------
     1. Blind Toggle
     ------------------------------------------------------------------ */
  public setBlindChoice(isBlind: boolean): void {
    if (this.phase !== 'BLIND_SELECTION') return;

    const vaultTele = this.soulVault.toTelemetry();
    if (isBlind && vaultTele.isBlindHandLockedOut) {
      this.dialogue = {
        speaker: 'SYSTEM',
        text: 'Cannot lock hand blind! Kakyoin\'s soul has been compromised (Guilt Lock active).',
        portraitMood: 'NEUTRAL'
      };
      return;
    }

    this.isBlindHand = isBlind;
    this.cardsLookedAt = !isBlind;

    if (isBlind) {
      this.intelDAG.activateNode('LOCKED_BLIND_HAND');
      this.patternQueue.enqueue('BLIND_LOCK');

      // Check adaptation: >= 2 BLIND_LOCK in the last 3 actions
      const blindRepetition = this.patternQueue.countRecentAction('BLIND_LOCK', 3);
      if (blindRepetition >= 2) {
        this.metrics.threatImmunity += 30;
        this.syncComposureAndParanoia();
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"Playing blind again, Jotaro? Lightning doesn\'t strike twice. I\'ll call your blind gambit every time!"',
          portraitMood: 'CONFIDENT'
        };
      } else {
        this.syncComposureAndParanoia(15);
        this.dialogue = {
          speaker: 'JOTARO KUJO',
          text: '"I won\'t even look at my hand. A gambler who relies on peeking at his cards already lacks conviction."',
          portraitMood: 'RESOLUTE'
        };
      }
    } else {
      this.intelDAG.deactivateNode('LOCKED_BLIND_HAND');
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"A sensible choice. Let us see if your poker face can withstand Osiris!"',
        portraitMood: 'CONFIDENT'
      };
    }

    this.phase = 'DEALING';
    this.dealOpeningCards();
    this.syncComposureAndParanoia();
  }

  /* ------------------------------------------------------------------
     2. Dealing Opening Cards (Probabilistic & Dynamic Cheating)
     ------------------------------------------------------------------ */
  public calculateCheatChance(): number {
    if (this.dealer !== "DANIEL J. D'ARBY") {
      return 0; // Street boy deals completely fair from the top
    }
    if (this.wasPreviouslyAccused) {
      return 0.20; // Plays cautious after accusation
    }
    if (this.metrics.composure > 70 && this.metrics.paranoia < 30) {
      return 0.65; // Overconfident
    }
    return 0.45; // Base cheat chance
  }

  public dealOpeningCards(): void {
    this.authoritativeJotaroHand = [];
    this.authoritativeDarbyHand = [];
    this.recentCheatType = 'NONE';
    this.lastBottomDealtCard = null;
    this.isBaiting = false;

    const cheatChance = this.calculateCheatChance();
    const willCheat = Math.random() < cheatChance;

    if (!willCheat && this.dealer === "DANIEL J. D'ARBY") {
      this.isBaiting = this.metrics.composure > 60 && Math.random() < 0.35;
    }

    let cheatExecutedType: 'BOTTOM_DEAL' | 'SECOND_DEAL' | 'NONE' = 'NONE';
    if (willCheat) {
      // 65% Bottom Deal, 35% Second Deal
      cheatExecutedType = Math.random() < 0.65 ? 'BOTTOM_DEAL' : 'SECOND_DEAL';
    }

    // Dealing 5 cards alternately
    for (let round = 0; round < 5; round++) {
      // Deal to Jotaro (always fair from top)
      const jCard = this.deck.dealFair();
      this.authoritativeJotaroHand.push(jCard);

      // Deal to D'Arby
      if (cheatExecutedType !== 'NONE' && round >= 1) {
        if (cheatExecutedType === 'BOTTOM_DEAL') {
          const dCard = this.deck.dealBottom();
          this.authoritativeDarbyHand.push(dCard);
          this.recentCheatType = 'BOTTOM_DEAL';
          if (!this.lastBottomDealtCard) {
            this.lastBottomDealtCard = dCard;
          }
        } else {
          const dCard = this.deck.dealSecond();
          this.authoritativeDarbyHand.push(dCard);
          this.recentCheatType = 'SECOND_DEAL';
        }
      } else {
        // Normal fair deal from top
        const dCard = this.deck.dealFair();
        this.authoritativeDarbyHand.push(dCard);
      }
    }

    this.phase = 'DEALING';
    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"Dealing the cards... Keep your eyes sharp, Jotaro."',
      portraitMood: this.metrics.composure > 70 ? 'CONFIDENT' : 'NEUTRAL'
    };

    this.syncComposureAndParanoia();
  }

  /* ------------------------------------------------------------------
     3. Star Platinum: [OBSERVE / FOCUS KINETIC VISION]
     ------------------------------------------------------------------ */
  public spObserve(hitCheat: boolean): void {
    if (this.phase !== 'OBSERVE_WINDOW' && this.phase !== 'DEALING') return;

    if (this.starPlatinumCharges <= 0) {
      this.phase = 'PRE_DRAW_BETTING';
      return;
    }

    this.starPlatinumCharges--;
    // Clear any previous action report
    this.actionReport = null;

    if (hitCheat) {
      if (this.recentCheatType !== 'NONE') {
        const isBottom = this.recentCheatType === 'BOTTOM_DEAL';
        const cardName = this.lastBottomDealtCard ? formatCard(this.lastBottomDealtCard) : 'King of Spades';
        this.patternQueue.enqueue('SP_OBSERVE_HIT');
        this.phase = 'ACCUSATION_WINDOW';
        // D'Arby reacts in character (no jargon)
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"Hmph! You think you caught me?! Go ahead... make your accusation, Jotaro."',
          portraitMood: 'SWEATING'
        };
        // Star Platinum report goes into actionReport (player-side popup)
        this.actionReport = {
          type: isBottom ? 'CHEAT_BOTTOM' : 'CHEAT_SECOND',
          title: 'STAR PLATINUM — CHEAT DETECTED!',
          text: isBottom
            ? `STAR PLATINUM! Caught D'Arby sliding the ${cardName} from the bottom of the deck!`
            : `STAR PLATINUM! D'Arby held back the top card and dealt the ${cardName} from second position!`
        };
      } else if (this.isBaiting) {
        const penalty = this.patternQueue.enqueue('SP_OBSERVE_MISS');
        this.syncComposureAndParanoia(-15);
        this.metrics.threatImmunity += penalty.penalty;
        this.phase = 'PRE_DRAW_BETTING';
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"Twitch Tell! Haha! You flinched, Jotaro! I baited your Stand\'s kinetic vision on a completely fair deal!"',
          portraitMood: 'SMUG'
        };
        this.actionReport = {
          type: 'MISS',
          title: 'STAR PLATINUM — MISSED',
          text: 'Star Platinum focused on a bait move. D\'Arby was bluffing a cheat to waste your charge.'
        };
      } else {
        this.hasPocketedIntel = false;
        this.phase = 'PRE_DRAW_BETTING';
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"The deal was perfectly clean, Jotaro. Perhaps your Stand\'s eyes are not as sharp as you believe."',
          portraitMood: 'SMUG'
        };
        this.actionReport = {
          type: 'CLEAN',
          title: 'STAR PLATINUM — SCAN COMPLETE',
          text: 'Star Platinum watched every millimeter of his fingers. The deal was clean.'
        };
      }
    } else {
      const penalty = this.patternQueue.enqueue('SP_OBSERVE_MISS');
      this.syncComposureAndParanoia(-15);
      this.metrics.threatImmunity += penalty.penalty;
      this.phase = 'PRE_DRAW_BETTING';
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"Twitch Tell! Haha! Your eye twitched, Jotaro! Fumbling your Stand\'s focus right before my eyes!"',
        portraitMood: 'SMUG'
      };
      this.actionReport = {
        type: 'MISS',
        title: 'STAR PLATINUM — MISSED',
        text: 'Star Platinum\'s focus slipped. D\'Arby capitalizes on the hesitation.'
      };
    }

    this.syncComposureAndParanoia();
  }

  public skipInspect(): void {
    if (this.phase !== 'DEALING' && this.phase !== 'OBSERVE_WINDOW') return;
    this.phase = 'PRE_DRAW_BETTING';
    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"Opening betting round before the draw. Check or Bet to test the waters."',
      portraitMood: 'CONFIDENT'
    };
    this.syncComposureAndParanoia();
  }

  /* ------------------------------------------------------------------
     4. Public Accuse vs Pocket Intel
     ------------------------------------------------------------------ */
  public publicAccuse(): void {
    if (this.phase !== 'ACCUSATION_WINDOW') return;

    this.wasPreviouslyAccused = true;
    this.patternQueue.enqueue('PUBLIC_ACCUSE');
    this.syncComposureAndParanoia(20);
    this.metrics.cheatExposed = true;
    this.isNeutralDealerActive = true;
    this.dealer = 'DEALER BOY';

    // Refund pot chips in exact LIFO reverse order
    this.soulVault.refundPot(this.soulPot);

    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"Guh...! T-Tch! Very well, boy! If you question the integrity of my hands, we shall summon an impartial boy from the street to deal! This hand is voided!"',
      portraitMood: 'SWEATING'
    };

    this.syncComposureAndParanoia();
    setTimeout(() => {
      this.initHand();
    }, 200);
  }

  public pocketIntel(): void {
    if (this.phase !== 'ACCUSATION_WINDOW') return;

    this.hasPocketedIntel = true;
    this.intelDAG.activateNode('POCKETED_CHEAT_INTEL');
    this.metrics.greed += 15;
    this.phase = 'PRE_DRAW_BETTING';

    this.dialogue = {
      speaker: 'JOTARO KUJO',
      text: '(I\'ll let his sleight of hand stand for now. When the draw comes, Star Platinum will invert his stacked deck right under his nose.)',
      portraitMood: 'RESOLUTE'
    };

    this.syncComposureAndParanoia();
  }

  /* ------------------------------------------------------------------
     5. Authentic 5-Card Draw Discard Logic
     ------------------------------------------------------------------ */
  public discardCards(indices: number[]): void {
    if (this.phase !== 'DRAW_PHASE') return;

    const validIndices = indices.filter(idx => idx >= 0 && idx < 5).slice(0, 3);
    this.discardedIndices = validIndices;

    if (validIndices.length === 0 && this.isBlindHand) {
      this.intelDAG.activateNode('ZERO_CARDS_DISCARDED');
      this.syncComposureAndParanoia(20);
    }

    // Replace Jotaro's discarded cards
    for (const idx of validIndices) {
      if (idx >= 0 && idx < this.authoritativeJotaroHand.length) {
        const replacement = this.drawSafeCard();
        if (replacement) {
          this.authoritativeJotaroHand[idx] = replacement;
        }
      }
    }

    // D'Arby's Intelligent Poker Discard Strategy:
    // Evaluates his authoritative hand and discards non-scoring kickers
    const evalDarby = PokerHandEvaluator.evaluate(this.authoritativeDarbyHand);
    const dCards = [...this.authoritativeDarbyHand];
    const discardDarbyIndices: number[] = [];

    if (evalDarby.categoryScore >= 5) {
      // Pat hand (Straight, Flush, Full House, Quads, Straight Flush, Royal Flush):
      // Keep all cards (0 discards)
    } else if (evalDarby.category === 'THREE_OF_A_KIND') {
      // Discard the 2 kickers
      dCards.forEach((c, idx) => {
        if (c.value !== evalDarby.primaryRankValue && discardDarbyIndices.length < 2) {
          discardDarbyIndices.push(idx);
        }
      });
    } else if (evalDarby.category === 'TWO_PAIR') {
      // Discard the 1 kicker
      dCards.forEach((c, idx) => {
        if (c.value !== evalDarby.primaryRankValue && c.value !== evalDarby.secondaryRankValue) {
          discardDarbyIndices.push(idx);
        }
      });
    } else if (evalDarby.category === 'ONE_PAIR') {
      // Discard 2 or 3 kickers
      dCards.forEach((c, idx) => {
        if (c.value !== evalDarby.primaryRankValue && discardDarbyIndices.length < 3) {
          discardDarbyIndices.push(idx);
        }
      });
    } else {
      // High card: discard lowest 3 cards
      const sortedByVal = dCards.map((c, i) => ({ c, i })).sort((a, b) => a.c.value - b.c.value);
      for (let i = 0; i < Math.min(3, sortedByVal.length); i++) {
        discardDarbyIndices.push(sortedByVal[i].i);
      }
    }

    this.darbyDiscardCount = discardDarbyIndices.length;

    // Execute D'Arby replacements
    for (const dIdx of discardDarbyIndices) {
      const replacement = this.drawSafeCard();
      if (replacement) {
        this.authoritativeDarbyHand[dIdx] = replacement;
      }
    }

    // Update Action Ticker Feed
    this.actionFeed.unshift(
      `Draw Street: Jotaro discarded ${validIndices.length} | D'Arby discarded ${this.darbyDiscardCount}`
    );

    // Transition to POST_DRAW_BETTING
    this.phase = 'POST_DRAW_BETTING';
    this.currentStreet = 'POST_DRAW';
    this.jotaroStreetBet = 0;
    this.darbyStreetBet = 0;

    const tellComment = this.darbyDiscardCount === 0
      ? 'D\'Arby stood pat (0 cards)!'
      : `D'Arby discards ${this.darbyDiscardCount} card${this.darbyDiscardCount === 1 ? '' : 's'}.`;

    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: `"${tellComment} The draw is complete. Pot is ${this.soulPot.size()} soul chips. Your action, Jotaro!"`,
      portraitMood: this.metrics.paranoia > 50 ? 'SWEATING' : 'CONFIDENT'
    };

    this.syncComposureAndParanoia();
  }

  /* ------------------------------------------------------------------
     6. Star Platinum: [DECK TAMPER]
     ------------------------------------------------------------------ */
  public spTamper(): boolean {
    if (this.phase !== 'DRAW_PHASE') return false;
    if (this.hasTamperedThisHand) return false;
    if (this.starPlatinumCharges <= 0 || !this.hasPocketedIntel) return false;

    const success = this.deck.starPlatinumTamper();
    if (success) {
      this.hasTamperedThisHand = true;
      this.starPlatinumCharges--;
      this.patternQueue.enqueue('DECK_TAMPER');
      this.syncComposureAndParanoia(25);
      this.syncComposureAndParanoia();
      // D'Arby notices something is wrong (in character)
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"...Something feels off. The cards don\'t feel right in my hands. Did something just—No. Impossible."',
        portraitMood: 'SUSPICIOUS'
      };
      // The SP action goes into the player-side report popup
      this.actionReport = {
        type: 'TAMPER',
        title: 'STAR PLATINUM — DECK TAMPER!',
        text: "ORA! Star Platinum secretly swapped D'Arby's rigged cards into your hand!"
      };
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------
     7. Star Platinum: [PHANTOM STUNT]
     ------------------------------------------------------------------ */
  public spPhantomStunt(): boolean {
    if (this.phase !== 'PRE_DRAW_BETTING' && this.phase !== 'POST_DRAW_BETTING' && this.phase !== 'BETTING_ROUND') {
      return false;
    }
    if (this.starPlatinumCharges <= 0 || !this.isBlindHand) return false;

    this.starPlatinumCharges--;
    this.hasPhantomStunt = true;
    this.metrics.stuntSucceeded = true;
    this.syncComposureAndParanoia(35);
    this.syncComposureAndParanoia();
    this.intelDAG.activateNode('SP_PHANTOM_STUNT');
    this.patternQueue.enqueue('PHANTOM_STUNT');

    // D'Arby's in-character panicked reaction
    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"W-WHAT?! When did Jotaro light a cigarette and pour a glass of juice?! I never saw his arm move! Could his Stand have swapped the cards in the blink of an eye?!"',
      portraitMood: 'PANICKED'
    };

    // SP action report on player side
    this.actionReport = {
      type: 'STUNT',
      title: 'STAR PLATINUM — PHANTOM STUNT!',
      text: "Star Platinum moved faster than D'Arby's eyes could follow. Your blind hand is now backed by a psychological iron wall. (+35 Paranoia)"
    };

    return true;
  }

  /* ------------------------------------------------------------------
     8. Soul Collateral Pledging (Liquidity Gate & Earned Paranoia)
     ------------------------------------------------------------------ */
  public pledgeSoul(owner: SoulOwner, amount: number): number {
    if (
      this.phase !== 'PRE_DRAW_BETTING' &&
      this.phase !== 'POST_DRAW_BETTING' &&
      this.phase !== 'BETTING_ROUND' &&
      this.phase !== 'BLIND_SELECTION' &&
      this.phase !== 'BETWEEN_HANDS'
    ) {
      return 0;
    }
    if (this.phase === 'BETWEEN_HANDS' && this.soulVault.getPlayerWagerableChips() > 0) {
      return 0;
    }

    const toCall = Math.max(0, this.darbyStreetBet - this.jotaroStreetBet);
    const check = this.soulVault.canPledge(owner, toCall);
    if (!check.allowed) {
      this.dialogue = {
        speaker: 'SYSTEM',
        text: check.reason || 'Pledge rejected by Soul Vault liquidity rules.',
        portraitMood: 'NEUTRAL'
      };
      return 0;
    }

    const pledged = this.soulVault.pledgeToPot(owner, amount, this.soulPot, this.phase, true);
    if (pledged <= 0) return 0;

    this.patternQueue.enqueue('PLEDGE_SOUL');
    this.jotaroStreetBet += pledged;

    const pledgeParanoiaBoost = owner === 'AVDOL'
      ? 12
      : owner === 'KAKYOIN'
        ? 18
        : owner === 'HOLLY'
          ? 30
          : 0;
    if (pledgeParanoiaBoost > 0) {
      this.adjustDarbyParanoia(pledgeParanoiaBoost * (this.isBlindHand ? 1.5 : 1));
    }

    // Earned resolve changes the reaction and intel bonuses, but every companion pledge
    // has already applied its paranoia increase above.
    // The heightened reaction requires at least TWO of:
    // a) Hand is LOCKED_BLIND with 0 cards discarded.
    // b) Caught cheat (hasPocketedIntel || recentCheatType !== 'NONE').
    // c) Executed SP_PHANTOM_STUNT on this hand.
    if (owner === 'HOLLY' || owner === 'KAKYOIN') {
      let earnedConditions = 0;
      if (this.isBlindHand && this.discardedIndices.length === 0) earnedConditions++;
      if (this.hasPocketedIntel || this.recentCheatType !== 'NONE') earnedConditions++;
      if (this.hasPhantomStunt) earnedConditions++;

      if (earnedConditions >= 2) {
        // Earned Paranoia!
        if (owner === 'HOLLY') {
          this.intelDAG.activateNode('PLEDGED_TABOO_SOUL');
          this.dialogue = {
            speaker: 'DANIEL J. D\'ARBY',
            text: '"Y-YOUR OWN MOTHER\'S SOUL?! Backed by cold, calculated silence... Are you truly that confident in your cards, Jotaro?!"',
            portraitMood: 'PANICKED'
          };
        } else {
          this.dialogue = {
            speaker: 'DANIEL J. D\'ARBY',
            text: '"Noriaki Kakyoin\'s soul... you wager your companions with terrifying coldness."',
            portraitMood: 'SWEATING'
          };
        }
      } else {
        // Reckless Desperation: Trigger PREDATORY GREED!
        this.metrics.greed = Math.min(100, this.metrics.greed + 30);
        this.darbyFSM.forceTransition('GREEDY', 'Predatory Greed: Unearned desperation pledge');
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"Throwing your loved ones onto the table out of sheer desperation? I\'ll gladly add them to my collection! I CALL!"',
          portraitMood: 'GREEDY'
        };
      }
    } else if (owner === 'AVDOL') {
      this.metrics.greed += 15;
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"Splendid! Muhammad Avdol\'s soul makes a magnificent prize for Osiris!"',
        portraitMood: 'GREEDY'
      };
    }

    // 1-for-1 matching: D'Arby matches the player's pledge if calling
    const diff = Math.max(0, this.jotaroStreetBet - this.darbyStreetBet);
    if (diff > 0) {
      const matched = this.soulVault.darbyMatchCall(diff, this.soulPot, this.phase);
      this.darbyStreetBet += matched;
    }

    this.actionFeed.unshift(`Pledge: Jotaro wagered ${pledged} ${owner} chip(s) -> D'Arby matches.`);
    this.syncComposureAndParanoia();
    return pledged;
  }

  /* ------------------------------------------------------------------
     9. Symmetrical Betting & Raising (Two-Way Bluffing & AI Reads)
     ------------------------------------------------------------------ */
  public playerRaise(amount: number): void {
    if (
      this.phase !== 'PRE_DRAW_BETTING' &&
      this.phase !== 'POST_DRAW_BETTING' &&
      this.phase !== 'BETTING_ROUND'
    ) {
      return;
    }

    // Pledge from Jotaro chips
    const pledged = this.soulVault.pledgeToPot('JOTARO', amount, this.soulPot, 'BET', true);
    if (pledged <= 0) return;

    this.jotaroStreetBet += pledged;
    this.patternQueue.enqueue('BLUFF_RAISE');

    // D'Arby folds if paralyzed by extreme Paranoia
    if (this.metrics.paranoia >= 85 && this.metrics.composure <= 15) {
      this.foldDarby();
      return;
    }

    // D'Arby Reads Jotaro (Inconsistency Detection Tell):
    // If Jotaro looked at cards, discarded 2-3 cards (weak starting hand),
    // and then bets big in POST_DRAW_BETTING:
    if (
      this.currentStreet === 'POST_DRAW' &&
      this.cardsLookedAt &&
      this.discardedIndices.length >= 2 &&
      pledged >= 2
    ) {
      this.syncComposureAndParanoia(-20);
      const diff = this.jotaroStreetBet - this.darbyStreetBet;
      const matched = this.soulVault.darbyMatchCall(diff, this.soulPot, this.phase);
      this.darbyStreetBet += matched;

      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"You drew three cards and now you bet like you hold Four Aces? Don\'t insult a professional gambler—I RAISE!"',
        portraitMood: 'SMUG'
      };

      // D'Arby raises back by 1 if he has bank chips left
      const raiseExtra = this.soulVault.darbyMatchCall(1, this.soulPot, this.phase);
      this.darbyStreetBet += raiseExtra;
      this.actionFeed.unshift(`Betting: Jotaro raised ${pledged} -> D'Arby read your tell and re-raised!`);
      this.syncComposureAndParanoia();
      return;
    }

    // Standard 1-for-1 match by D'Arby
    const diff = Math.max(0, this.jotaroStreetBet - this.darbyStreetBet);
    const matched = this.soulVault.darbyMatchCall(diff, this.soulPot, this.phase);
    this.darbyStreetBet += matched;

    this.actionFeed.unshift(`Betting: Jotaro raised ${pledged} chip(s) -> D'Arby matches.`);
    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: `"I match your raise of ${pledged} chip(s). The pot stands at ${this.soulPot.size()} souls!"`,
      portraitMood: this.metrics.paranoia > 50 ? 'SWEATING' : 'CONFIDENT'
    };

    this.syncComposureAndParanoia();
  }

  public playerBluff(amount: number = 1): void {
    if (
      (this.phase !== 'PRE_DRAW_BETTING' &&
       this.phase !== 'POST_DRAW_BETTING' &&
       this.phase !== 'BETTING_ROUND') ||
      this.hasBluffedThisHand
    ) {
      return;
    }

    this.hasBluffedThisHand = true;
    const actualAmount = Math.max(1, Math.min(2, amount));
    const pledged = this.soulVault.pledgeToPot('JOTARO', actualAmount, this.soulPot, 'BET', true);
    if (pledged <= 0) return;

    this.jotaroStreetBet += pledged;
    this.patternQueue.enqueue('BLUFF_RAISE');

    // Risk / Reward Gamble Logic:
    const hasStrongTableImage = this.discardedIndices.length <= 1;
    const isParanoid = this.metrics.paranoia >= 45;
    const isSmugCalculating = this.metrics.composure >= 70;
    const drewManyCards = this.discardedIndices.length >= 2;

    // Backfire Risk: drew 2-3 cards against composed D'Arby in POST_DRAW_BETTING
    if (drewManyCards && isSmugCalculating && this.currentStreet === 'POST_DRAW') {
      this.syncComposureAndParanoia(-10);

      const diff = Math.max(0, this.jotaroStreetBet - this.darbyStreetBet);
      const matched = this.soulVault.darbyMatchCall(diff, this.soulPot, this.phase);
      this.darbyStreetBet += matched;
      // Re-raise by 1 chip
      const reRaise = this.soulVault.darbyMatchCall(1, this.soulPot, this.phase);
      this.darbyStreetBet += reRaise;

      this.actionFeed.unshift(`Bluff Failed! D'Arby saw through your 3-card draw bluff and re-raised!`);
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"A blatant bluff after drawing three cards?! Don\'t make me laugh, Jotaro—I RE-RAISE!"',
        portraitMood: 'SMUG'
      };
      this.syncComposureAndParanoia();
      return;
    }

    // Success probability
    let successProb = 0.45;
    if (isParanoid) successProb += 0.25;
    if (hasStrongTableImage) successProb += 0.20;
    if (this.isBlindHand) successProb += 0.15;

    const bluffSucceeded = Math.random() < successProb;

    if (bluffSucceeded) {
      this.syncComposureAndParanoia(18);
      this.syncComposureAndParanoia();

      const dEval = PokerHandEvaluator.evaluate(this.authoritativeDarbyHand);
      const canForceFold = dEval.categoryScore <= 3 || this.metrics.paranoia >= 60;

      if (canForceFold) {
        this.actionFeed.unshift(`Bluff Succeeded! Jotaro's intimidation forced D'Arby to FOLD!`);
        this.foldDarby();
        return;
      } else {
        const diff = Math.max(0, this.jotaroStreetBet - this.darbyStreetBet);
        const matched = this.soulVault.darbyMatchCall(diff, this.soulPot, this.phase);
        this.darbyStreetBet += matched;
        this.actionFeed.unshift(`Bluff Impact: D'Arby called under heavy intimidation (+18% Paranoia).`);
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"G-Guh...! What are you hiding under that cap, Jotaro?! I... I match your raise!"',
          portraitMood: 'SWEATING'
        };
        this.syncComposureAndParanoia();
      }
    } else {
      const diff = Math.max(0, this.jotaroStreetBet - this.darbyStreetBet);
      const matched = this.soulVault.darbyMatchCall(diff, this.soulPot, this.phase);
      this.darbyStreetBet += matched;
      this.actionFeed.unshift(`Bluff: Jotaro bluffs -> D'Arby suspiciously calls.`);
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"You bluff with great confidence, Jotaro. But Osiris requires you to prove it!"',
        portraitMood: 'CONFIDENT'
      };
      this.syncComposureAndParanoia();
    }
  }

  public playerCheck(): void {
    if (
      this.phase !== 'PRE_DRAW_BETTING' &&
      this.phase !== 'POST_DRAW_BETTING' &&
      this.phase !== 'BETTING_ROUND'
    ) {
      return;
    }

    // If D'Arby has bet higher, player must Call or Fold, not Check
    if (this.darbyStreetBet > this.jotaroStreetBet) {
      this.dialogue = {
        speaker: 'SYSTEM',
        text: `Cannot check! D'Arby has bet ${this.darbyStreetBet - this.jotaroStreetBet} chip(s) to call. Call or Fold.`,
        portraitMood: 'NEUTRAL'
      };
      return;
    }

    this.patternQueue.enqueue('CHECK');

    // D'Arby's Decision on player check:
    // 1. D'Arby Bluffs (Snowing): If hand is weak, Composure > 60%, Paranoia < 50%,
    //    35% chance to bluff-raise 1-2 chips claiming a monster hand!
    const dEval = PokerHandEvaluator.evaluate(this.authoritativeDarbyHand);
    const isWeakHand = dEval.categoryScore <= 2; // High Card or One Pair

    if (isWeakHand && this.metrics.composure > 60 && this.metrics.paranoia < 50 && Math.random() < 0.35) {
      const bluffAmount = Math.min(2, this.soulVault.getDarbyTotalBank());
      if (bluffAmount > 0) {
        this.isDarbyBluffing = true;
        const matched = this.soulVault.darbyMatchCall(bluffAmount, this.soulPot, this.phase);
        this.darbyStreetBet += matched;
        this.actionFeed.unshift(`Betting: Jotaro checks -> D'Arby bets ${bluffAmount} chip(s) (Bluff)!`);
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"Heh heh heh... A magnificent hand! I bet 2 chips! Do you dare challenge my cards, Jotaro?"',
          portraitMood: 'SMUG'
        };
        this.syncComposureAndParanoia();
        return;
      }
    }

    // 2. D'Arby value bet with strong hand:
    if (dEval.categoryScore >= 4 && this.soulVault.getDarbyTotalBank() > 0) {
      const betAmt = Math.min(1, this.soulVault.getDarbyTotalBank());
      const matched = this.soulVault.darbyMatchCall(betAmt, this.soulPot, this.phase);
      this.darbyStreetBet += matched;
      this.actionFeed.unshift(`Betting: Jotaro checks -> D'Arby value bets ${betAmt} chip.`);
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"Checking shows weakness, Jotaro. I raise the pot by 1 chip!"',
        portraitMood: 'CONFIDENT'
      };
      this.syncComposureAndParanoia();
      return;
    }

    // 3. D'Arby also checks -> advance street!
    if (this.phase === 'PRE_DRAW_BETTING') {
      this.actionFeed.unshift('Pre-Draw: Both players checked -> Advancing to Draw.');
      this.phase = 'DRAW_PHASE';
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"Both players check. Select up to 3 cards to discard and draw replacements."',
        portraitMood: 'CONFIDENT'
      };
    } else {
      this.actionFeed.unshift('Post-Draw: Both players checked -> SHOWDOWN!');
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"Both players check. The cards must speak for themselves! SHOWDOWN!"',
        portraitMood: this.metrics.paranoia > 50 ? 'SWEATING' : 'CONFIDENT'
      };
      this.resolveShowdown();
    }

    this.syncComposureAndParanoia();
  }

  public playerCall(): void {
    if (
      this.phase !== 'PRE_DRAW_BETTING' &&
      this.phase !== 'POST_DRAW_BETTING' &&
      this.phase !== 'BETTING_ROUND'
    ) {
      return;
    }

    const toCall = Math.max(0, this.darbyStreetBet - this.jotaroStreetBet);
    if (toCall > 0) {
      const pledged = this.soulVault.pledgeToPot('JOTARO', toCall, this.soulPot, 'CALL', true);
      this.jotaroStreetBet += pledged;
      this.actionFeed.unshift(`Betting: Jotaro calls ${toCall} chip(s).`);
    }

    this.patternQueue.enqueue('CALL');

    // Conclude street
    if (this.phase === 'PRE_DRAW_BETTING') {
      this.phase = 'DRAW_PHASE';
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"Bets matched. Proceed to the Draw: discard 0 to 3 cards."',
        portraitMood: 'CONFIDENT'
      };
    } else {
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"A call! Then let us flip the cards and let Osiris judge! SHOWDOWN!"',
        portraitMood: 'CONFIDENT'
      };
      this.resolveShowdown();
    }

    this.syncComposureAndParanoia();
  }

  public playerFold(): void {
    if (
      this.phase !== 'PRE_DRAW_BETTING' &&
      this.phase !== 'POST_DRAW_BETTING' &&
      this.phase !== 'BETTING_ROUND'
    ) {
      return;
    }

    this.patternQueue.enqueue('FOLD');
    this.actionFeed.unshift('Jotaro folded the hand.');

    // D'Arby claims pot without revealing cards
    this.soulVault.awardPot('DARBY', this.soulPot);

    // Sudden death taboo: if Holly was pledged in this pot
    const vault = this.soulVault.toTelemetry();
    if (vault.vaultEntries.find(e => e.owner === 'HOLLY')?.heldByDarby! > 0) {
      this.phase = 'DEFEAT';
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"HOLLY KUJO\'S SOUL IS MINE! You folded her away, Jotaro Kujo! GAME OVER!"',
        portraitMood: 'CONFIDENT'
      };
      return;
    }

    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"Heh, a prudent surrender. But your stack dwindles while mine grows!"',
      portraitMood: 'SMUG'
    };

    this.phase = 'BETWEEN_HANDS';
    this.checkVictoryConditions();
  }

  public foldDarby(): void {
    this.soulVault.awardPot('PLAYER', this.soulPot);
    this.actionFeed.unshift('D\'Arby folded in terror! Jotaro takes the pot.');

    this.dialogue = {
      speaker: 'DANIEL J. D\'ARBY',
      text: '"I... I fold! Take the chips! But you won\'t be so lucky on the next hand!"',
      portraitMood: 'SWEATING'
    };

    this.checkVictoryConditions();
  }

  /* ------------------------------------------------------------------
     10. DEMAND DIO'S STAND SECRET (The Climax Gambit)
     ------------------------------------------------------------------ */
  public demandDioSecret(): DioDemandEvaluation {
    if (
      this.phase !== 'PRE_DRAW_BETTING' &&
      this.phase !== 'POST_DRAW_BETTING' &&
      this.phase !== 'BETTING_ROUND'
    ) {
      throw new Error('DIO demand is only available during betting.');
    }
    if (this.dioDemandCharges <= 0) {
      throw new Error('No DIO Demand charges remaining.');
    }

    this.patternQueue.enqueue('DIO_DEMAND');
    this.dioDemandCharges--;
    this.metrics.dioDemandChargesUsed++;
    this.intelDAG.activateNode('DEMAND_DIO_SECRET');

    const potDeficit = this.soulVault.calculatePotDeficit(this.soulPot);
    const effectiveParanoia = Math.max(10, Math.min(100, this.metrics.paranoia));
    const succeeded = Math.random() * 100 < effectiveParanoia;
    const successDialogue =
      "Y-You insane fool... If I betray Lord DIO's secret, my soul is forfeit anyway! But seeing those cards... AAAAAAGH! I yield!";
    const failureDialogue =
      "Heh... Heh heh heh. You think a hollow bluff can shake my loyalty to Lord DIO? You're playing with fire, Jotaro. Show me your hand!";

    this.syncComposureAndParanoia(succeeded ? 100 - this.rawBaseParanoia : -10);

    const evaluation: DioDemandEvaluation = {
      outcomeNumber: succeeded ? 3 : 2,
      outcomeName: succeeded ? 'MENTAL_COLLAPSE' : 'RESISTED',
      dialogue: succeeded ? successDialogue : failureDialogue,
      potDeficit,
      effectiveParanoia: this.metrics.paranoia,
      effectiveComposure: this.metrics.composure,
      isBlindHand: this.isBlindHand,
      decisionPath: [
        `Success roll: ${effectiveParanoia}% paranoia`,
        succeeded ? 'DIO demand succeeded' : 'DIO demand resisted'
      ]
    };

    if (succeeded) {
      this.darbyFSM.forceTransition('CATATONIC', 'Mental Collapse: Demanded DIO\'s secret blind');
      this.phase = 'VICTORY';
      this.soulVault.awardPot('PLAYER', this.soulPot);
      this.soulVault.clearDarbyBank('POLNAREFF');
      this.soulVault.get('POLNAREFF').heldByPlayer = 6;
      this.soulVault.clearDarbyBank('JOSEPH');
      this.soulVault.get('JOSEPH').heldByPlayer = 6;
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: `"${successDialogue}"`,
        portraitMood: 'WHITE_HAIR'
      };
      this.actionFeed.unshift('★ D\'ARBY SUFFERS MENTAL COLLAPSE! JOTARO WINS!');
    } else {
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: `"${failureDialogue}"`,
        portraitMood: 'CONFIDENT'
      };
      this.actionFeed.unshift('D\'Arby resisted the DIO demand and regained composure.');
    }

    return evaluation;
  }

  /* ------------------------------------------------------------------
     11. Showdown Resolution
     ------------------------------------------------------------------ */
  public resolveShowdown(): void {
    this.phase = 'SHOWDOWN';

    const jEval = PokerHandEvaluator.evaluate(this.authoritativeJotaroHand);
    const dEval = PokerHandEvaluator.evaluate(this.authoritativeDarbyHand);
    const comp = PokerHandEvaluator.compare(jEval, dEval);

    let winner: 'PLAYER' | 'DARBY' | 'PUSH' = 'PUSH';
    let msg = '';

    if (comp > 0) {
      winner = 'PLAYER';
      this.soulVault.awardPot('PLAYER', this.soulPot);
      if (this.starPlatinumCharges < 3 && !this.deck.tampered) {
        this.starPlatinumCharges++;
      }
      msg = `Jotaro's ${jEval.description} defeats D'Arby's ${dEval.description}!`;
      this.dialogue = {
        speaker: 'JOTARO KUJO',
        text: `"${msg} Take your chips off the table, D'Arby."`,
        portraitMood: 'RESOLUTE'
      };
      this.actionFeed.unshift(`Showdown: Jotaro won with ${jEval.description}!`);
    } else if (comp < 0) {
      winner = 'DARBY';
      this.soulVault.awardPot('DARBY', this.soulPot);
      msg = `D'Arby's ${dEval.description} defeats Jotaro's ${jEval.description}!`;
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: `"${msg} Osiris claims the pot!"`,
        portraitMood: 'SMUG'
      };
      this.actionFeed.unshift(`Showdown: D'Arby won with ${dEval.description}!`);
    } else {
      winner = 'PUSH';
      this.soulVault.refundPot(this.soulPot);
      msg = `Split pot: Both players hold ${jEval.description}!`;
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: `"${msg} An exact tie!"`,
        portraitMood: 'SWEATING'
      };
      this.actionFeed.unshift(`Showdown: Split pot with ${jEval.description}.`);
    }

    this.showdownResult = {
      winner,
      playerHandEval: jEval,
      darbyHandEval: dEval,
      message: msg
    };

    this.checkVictoryConditions();
  }

  public checkVictoryConditions(): void {
    const polnareff = this.soulVault.get('POLNAREFF');
    const joseph = this.soulVault.get('JOSEPH');
    const holly = this.soulVault.get('HOLLY');

    if (holly.heldByDarby > 0) {
      this.phase = 'DEFEAT';
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"HOLLY KUJO\'S SOUL IS COMPROMISED! You failed to protect your mother! GAME OVER!"',
        portraitMood: 'CONFIDENT'
      };
      return;
    }

    if (
      (polnareff.heldByPlayer === 6 && joseph.heldByPlayer === 6) ||
      this.soulVault.getDarbyTotalBank() === 0 ||
      this.darbyFSM.getState() === 'CATATONIC'
    ) {
      this.phase = 'VICTORY';
      this.dialogue = {
        speaker: 'MUHAMMAD AVDOL',
        text: '"Jotaro! You recovered both Polnareff and Mr. Joestar! Truly, a magnificent psychological victory!"',
        portraitMood: 'CONFIDENT'
      };
      return;
    }

    if (this.soulVault.getPlayerWagerableChips() <= 0) {
      const collateralRemaining = (['JOTARO', 'AVDOL', 'KAKYOIN', 'HOLLY'] as const)
        .some(owner => this.soulVault.get(owner).heldByPlayer > 0);
      if (collateralRemaining) {
        this.phase = 'BETWEEN_HANDS';
        this.dialogue = {
          speaker: 'DANIEL J. D\'ARBY',
          text: '"Your active chips are gone... but the Soul Vault still holds one final wager. Choose your collateral before the next hand."',
          portraitMood: 'SWEATING'
        };
        return;
      }

      this.phase = 'DEFEAT';
      this.dialogue = {
        speaker: 'DANIEL J. D\'ARBY',
        text: '"You have no wagerable chips left, and no souls remain in the vault. DEFEAT!"',
        portraitMood: 'CONFIDENT'
      };
    }
  }

  public nextHand(): void {
    if (this.phase !== 'BETWEEN_HANDS' && this.phase !== 'SHOWDOWN') return;
    if (this.phase === 'BETWEEN_HANDS' && this.soulVault.getPlayerWagerableChips() <= 0) {
      const hasPlayerPledge = this.soulPot.toTelemetry().potChips.some(
        chip => !chip.id.includes('DARBY')
      );
      if (!hasPlayerPledge) return;
    }
    this.handNumber++;
    // Permanent between-hand paranoia decay (-10)
    this.syncComposureAndParanoia(-10);
    this.initHand();
  }

  /* ------------------------------------------------------------------
     12. Strategic Advisor: Muhammad Avdol Read
     ------------------------------------------------------------------ */
  public getAvdolAdvice(): AvdolAdvice {
    const avdolState = this.soulVault.get('AVDOL');
    const isAvailable = avdolState.heldByPlayer === 6 && avdolState.inPot === 0;

    if (!isAvailable) {
      return {
        available: false,
        darbyDiscardCount: this.darbyDiscardCount,
        estimatedDarbyHand: 'Advisor unavailable',
        bluffProbability: 0,
        recommendation: 'CHECK',
        adviceText: 'Avdol cannot advise you right now (Avdol chips are risked or compromised).'
      };
    }

    let estimatedHand = 'Unknown Hand';
    let bluffProb = 0;
    let rec: 'CALL' | 'RAISE' | 'FOLD' | 'CHECK' = 'CHECK';
    let advice = '';

    if (this.darbyDiscardCount === 0) {
      estimatedHand = 'Pat Hand (Straight, Flush, or Full House)';
      bluffProb = this.metrics.composure > 80 ? 0.10 : 0.05;
      rec = this.isBlindHand ? 'CALL' : 'CHECK';
      advice = 'D\'Arby stood pat without drawing any cards! He likely holds a made Straight or Flush. Do not raise unless you hold monster cards or have tampered the deck!';
    } else if (this.darbyDiscardCount === 1) {
      estimatedHand = 'Two Pair or Four of a Kind';
      bluffProb = 0.15;
      rec = 'CALL';
      advice = 'D\'Arby discarded only 1 card. High probability of Two Pair or drawing to a Full House. A cautious Call is optimal.';
    } else if (this.darbyDiscardCount === 2) {
      estimatedHand = 'Three of a Kind';
      bluffProb = 0.25;
      rec = 'CALL';
      advice = 'D\'Arby discarded 2 cards, suggesting he kept Trips. Watch his bet sizing closely.';
    } else {
      estimatedHand = 'One Pair or High Card';
      bluffProb = this.metrics.composure > 60 ? 0.35 : 0.15;
      rec = bluffProb >= 0.30 ? 'RAISE' : 'CALL';
      advice = `D'Arby discarded 3 cards! His starting hand was weak. With ${this.metrics.composure}% composure, his bluff probability is ${Math.round(bluffProb * 100)}%! Re-raise to break his nerve!`;
    }

    return {
      available: true,
      darbyDiscardCount: this.darbyDiscardCount,
      estimatedDarbyHand: estimatedHand,
      bluffProbability: bluffProb,
      recommendation: rec,
      adviceText: advice
    };
  }

  /* ------------------------------------------------------------------
     13. CRITICAL FULL-STACK SANITIZATION:
     Hole cards, card IDs, and topology IDs are masked for security!
     ------------------------------------------------------------------ */
  public getSanitizedState(): SanitizedGameState {
    const isRevealed =
      this.phase === 'SHOWDOWN' || this.phase === 'VICTORY' || this.phase === 'DEFEAT';

    // Mask blind Jotaro cards and sanitize
    const sanitizedJotaroHand: Card[] = this.authoritativeJotaroHand.map((c, idx) => {
      if (this.isBlindHand && !isRevealed) {
        return {
          id: `HIDDEN_CARD_${idx}`,
          suit: 'HIDDEN',
          rank: '?',
          value: 0
        };
      }
      return { ...c };
    });

    // Mask D'Arby cards strictly until showdown
    const sanitizedDarbyHand: Card[] = this.authoritativeDarbyHand.map((c, idx) => {
      if (!isRevealed) {
        return {
          id: `HIDDEN_CARD_${idx}`,
          suit: 'HIDDEN',
          rank: '?',
          value: 0
        };
      }
      return { ...c };
    });

    const potDeficit = this.soulVault.calculatePotDeficit(this.soulPot);
    const toCall = Math.max(0, this.darbyStreetBet - this.jotaroStreetBet);

    return {
      phase: this.phase,
      handNumber: this.handNumber,
      dealer: this.dealer,
      isBlindHand: this.isBlindHand,
      cardsLookedAt: this.cardsLookedAt,
      starPlatinumCharges: this.starPlatinumCharges,
      dioDemandCharges: this.dioDemandCharges,
      jotaroHand: sanitizedJotaroHand,
      darbyHand: sanitizedDarbyHand,
      darbyHandCount: this.authoritativeDarbyHand.length,
      discardedIndices: [...this.discardedIndices],
      darbyDiscardCount: this.darbyDiscardCount,
      currentStreet: this.currentStreet,
      jotaroStreetBet: this.jotaroStreetBet,
      darbyStreetBet: this.darbyStreetBet,
      toCall,
      potDeficit,
      actionFeed: [...this.actionFeed],
      canTamper: this.phase === 'DRAW_PHASE' && this.hasPocketedIntel && this.starPlatinumCharges > 0 && !this.hasTamperedThisHand,
      canPhantomStunt: (this.phase === 'POST_DRAW_BETTING' || this.phase === 'PRE_DRAW_BETTING' || this.phase === 'BETTING_ROUND') && this.isBlindHand && this.starPlatinumCharges > 0 && !this.hasPhantomStunt,
      canDemandDio:
        (this.phase === 'PRE_DRAW_BETTING' ||
          this.phase === 'POST_DRAW_BETTING' ||
          this.phase === 'BETTING_ROUND') &&
        this.dioDemandCharges > 0,
      demandDioDisabledReason:
        this.dioDemandCharges <= 0 ? 'No DIO Demand charges remaining.' : undefined,
      hasPocketedIntel: this.hasPocketedIntel,
      hasPhantomStunt: this.hasPhantomStunt,
      hasTamperedThisHand: this.hasTamperedThisHand,
      hasBluffedThisHand: this.hasBluffedThisHand,
      isDarbyBluffing: this.isDarbyBluffing,
      remainingDeckCards: this.deck.size,
      recentCheatType: (this.phase === 'ACCUSATION_WINDOW' || this.hasPocketedIntel || isRevealed) ? this.recentCheatType : 'NONE',
      actionReport: this.actionReport,
      dialogue: { ...this.dialogue },
      showdownResult: this.showdownResult,
      avdolAdvice: this.getAvdolAdvice(),
      dsTelemetry: {
        deck: this.deck.toTelemetry(this.hasPocketedIntel || isRevealed),
        soulPot: this.soulPot.toTelemetry(),
        soulVault: this.soulVault.toTelemetry(),
        darbyBrain: {
          currentState: this.darbyFSM.getState(),
          availableTransitions: this.darbyFSM.getTransitions(),
          metrics: { ...this.metrics },
          recentTransitions: this.darbyFSM.getHistory().slice(-5),
          lastDecisionTrace: this.decisionTree.getTrace(),
          dealerState: this.dealer === 'DANIEL J. D\'ARBY' ? 'DARBY_DEALS' : 'DEALER_BOY',
          dialogueQuote: this.dialogue.text
        },
        intelDAG: this.intelDAG.toTelemetry(),
        patternQueue: this.patternQueue.toTelemetry()
      }
    };
  }
}
