export type SoulOwner = 'JOTARO' | 'POLNAREFF' | 'JOSEPH' | 'AVDOL' | 'KAKYOIN' | 'HOLLY';

export interface SoulChip {
  id: string;
  owner: SoulOwner;
  betOrder: number;
  pledgedAtPhase: string;
  isWagerable?: boolean;
}

export interface SoulState {
  owner: SoulOwner;
  name: string;
  totalChips: 6;
  heldByPlayer: number;
  heldByDarby: number;
  inPot: number;
  wagerableByPlayer: number;
  isLocked: boolean;
  buffDescription: string;
  penaltyDescription: string;
}

export interface SoulPotTelemetry {
  stackSize: number;
  potChips: SoulChip[];
  recentPushedChip: SoulChip | null;
  totalValue: number;
  potBreakdownByOwner: Record<SoulOwner, number>;
}

export interface SoulVaultTelemetry {
  vaultEntries: SoulState[];
  activeBuffs: string[];
  activeDebuffs: string[];
  qteWindowMultiplier: number;
  isAvdolAdvisorLocked: boolean;
  isBlindHandLockedOut: boolean;
  isHollyInPot: boolean;
  recoveredSoulsCount: number; // Polnareff & Joseph
}

/**
 * Custom LIFO Stack for Soul Chips in the current betting pot.
 * Supports standard stack operations: push, pop, peek, isEmpty, size,
 * plus reverse-order popping when an accusation voids the hand.
 */
export class SoulPotStack {
  private items: SoulChip[] = [];
  private orderCounter: number = 0;

  public push(chip: Omit<SoulChip, 'betOrder'>): SoulChip {
    this.orderCounter++;
    const fullChip: SoulChip = {
      ...chip,
      betOrder: this.orderCounter
    };
    this.items.push(fullChip);
    return fullChip;
  }

  public pop(): SoulChip | null {
    if (this.items.length === 0) return null;
    return this.items.pop() || null;
  }

  public peek(): SoulChip | null {
    if (this.items.length === 0) return null;
    return this.items[this.items.length - 1];
  }

  public size(): number {
    return this.items.length;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public clear(): SoulChip[] {
    const popped = [...this.items];
    this.items = [];
    this.orderCounter = 0;
    return popped;
  }

  /**
   * Exact LIFO reverse order refund on Public Accusation
   */
  public refundAllLIFO(): SoulChip[] {
    const refunded: SoulChip[] = [];
    while (!this.isEmpty()) {
      const chip = this.pop();
      if (chip) refunded.push(chip);
    }
    return refunded;
  }

  public toTelemetry(): SoulPotTelemetry {
    const breakdown: Record<SoulOwner, number> = {
      JOTARO: 0,
      POLNAREFF: 0,
      JOSEPH: 0,
      AVDOL: 0,
      KAKYOIN: 0,
      HOLLY: 0
    };

    for (const c of this.items) {
      breakdown[c.owner] = (breakdown[c.owner] || 0) + 1;
    }

    return {
      stackSize: this.items.length,
      potChips: [...this.items],
      recentPushedChip: this.peek(),
      totalValue: this.items.length,
      potBreakdownByOwner: breakdown
    };
  }
}

/**
 * Custom HashMap tracking all 6 characters' Soul States with O(1) lookups
 * and live mechanical buffs/debuffs computation.
 */
export class SoulVaultMap {
  private buckets: Map<SoulOwner, SoulState> = new Map();
  public darbyBankChips: SoulChip[] = [];
  private darbyBetCounter: number = 0;

  constructor() {
    this.initVault();
  }

  public initVault(): void {
    this.buckets.clear();
    this.darbyBankChips = [];
    this.darbyBetCounter = 0;

    // 1. JOTARO (Player starting stack: 6 chips)
    this.buckets.set('JOTARO', {
      owner: 'JOTARO',
      name: 'Jotaro Kujo',
      totalChips: 6,
      heldByPlayer: 6,
      heldByDarby: 0,
      inPot: 0,
      wagerableByPlayer: 6,
      isLocked: false,
      buffDescription: 'Stand Master: Precision manipulation with Star Platinum.',
      penaltyDescription: 'Soul Atrophy: -12% QTE timing window per lost chip.'
    });

    // 2. POLNAREFF (D\'Arby starting bank: 6 chips)
    this.buckets.set('POLNAREFF', {
      owner: 'POLNAREFF',
      name: 'Jean Pierre Polnareff',
      totalChips: 6,
      heldByPlayer: 0,
      heldByDarby: 6,
      inPot: 0,
      wagerableByPlayer: 0,
      isLocked: false,
      buffDescription: 'Captured Soul: Win all 6 to liberate Polnareff.',
      penaltyDescription: 'Soul Trap: Bound to Osiris coin.'
    });

    // 3. JOSEPH (D\'Arby starting bank: 6 chips)
    this.buckets.set('JOSEPH', {
      owner: 'JOSEPH',
      name: 'Joseph Joestar',
      totalChips: 6,
      heldByPlayer: 0,
      heldByDarby: 6,
      inPot: 0,
      wagerableByPlayer: 0,
      isLocked: false,
      buffDescription: 'Captured Soul: Win all 6 to liberate Mr. Joestar.',
      penaltyDescription: 'Hamon Suppressed: Trapped in D\'Arby\'s collection.'
    });

    // 4. AVDOL (Player collateral reserve: 6 chips)
    this.buckets.set('AVDOL', {
      owner: 'AVDOL',
      name: 'Muhammad Avdol',
      totalChips: 6,
      heldByPlayer: 6,
      heldByDarby: 0,
      inPot: 0,
      wagerableByPlayer: 0,
      isLocked: false,
      buffDescription: 'Magician\'s Guide: Avdol strategic poker odds calculator.',
      penaltyDescription: 'Silence of Strategist: Advisor locks out if >=1 chip risked/lost.'
    });

    // 5. KAKYOIN (Player collateral reserve: 6 chips)
    this.buckets.set('KAKYOIN', {
      owner: 'KAKYOIN',
      name: 'Noriaki Kakyoin',
      totalChips: 6,
      heldByPlayer: 6,
      heldByDarby: 0,
      inPot: 0,
      wagerableByPlayer: 0,
      isLocked: false,
      buffDescription: 'Cold Resolve: Suppresses Jotaro\'s betting-speed tells.',
      penaltyDescription: 'Guilt Lock: If D\'Arby wins >=1 chip, "Lock Blind" is disabled.'
    });

    // 6. HOLLY (Player collateral reserve: 6 chips)
    this.buckets.set('HOLLY', {
      owner: 'HOLLY',
      name: 'Holly Kujo',
      totalChips: 6,
      heldByPlayer: 6,
      heldByDarby: 0,
      inPot: 0,
      wagerableByPlayer: 0,
      isLocked: false,
      buffDescription: 'Taboo Multiplier: 1.6x Paranoia inflicted on D\'Arby.',
      penaltyDescription: 'Sudden Death: Losing even 1 chip = INSTANT GAME OVER.'
    });

    for (const owner of ['POLNAREFF', 'JOSEPH'] as const) {
      for (let i = 1; i <= 6; i++) {
        this.darbyBankChips.push({
          id: `${owner}_DARBY_CHIP_${i}`,
          owner,
          betOrder: 0,
          pledgedAtPhase: 'BANK'
        });
      }
    }
  }

  public get(owner: SoulOwner): SoulState {
    const s = this.buckets.get(owner);
    if (!s) throw new Error(`Soul owner not found: ${owner}`);
    return s;
  }

  public getDarbyTotalBank(): number {
    return this.darbyBankChips.length;
  }

  public getPlayerActiveChips(): number {
    return this.get('JOTARO').heldByPlayer;
  }

  public getPlayerWagerableChips(): number {
    return (['JOTARO', 'AVDOL', 'KAKYOIN'] as SoulOwner[]).reduce(
      (total, owner) => total + this.get(owner).wagerableByPlayer,
      0
    );
  }

  /**
   * Soul Vault collateral unlocks one tier at a time after the active bank is depleted.
   */
  public canPledge(owner: SoulOwner, currentBetFacing: number = 0): { allowed: boolean; reason?: string } {
    const s = this.get(owner);
    if (owner === 'POLNAREFF' || owner === 'JOSEPH') {
      return {
        allowed: false,
        reason: 'Liberated souls are protected and cannot be wagered.'
      };
    }
    if (s.heldByPlayer <= 0) {
      return { allowed: false, reason: 'No chips available in vault for this soul.' };
    }

    if (owner === 'JOTARO') {
      return { allowed: true };
    }

    const jotaro = this.get('JOTARO');
    const jotaroBankDepleted = jotaro.heldByPlayer === 0 && jotaro.inPot === 0;

    if (owner === 'AVDOL') {
      if (!jotaroBankDepleted) {
        return {
          allowed: false,
          reason: 'Tier 1: Muhammad Avdol unlocks only after Jotaro loses all active chips.'
        };
      }
      return { allowed: true };
    }

    if (owner === 'KAKYOIN') {
      const avdol = this.get('AVDOL');
      const allowed = jotaroBankDepleted && avdol.heldByPlayer === 0 && avdol.inPot === 0;
      if (!allowed) {
        return {
          allowed: false,
          reason: 'Tier 2: Noriaki Kakyoin unlocks after Avdol is fully pledged and Jotaro loses the reloaded bank.'
        };
      }
      return { allowed: true };
    }

    if (owner === 'HOLLY') {
      const avdol = this.get('AVDOL');
      const kakyoin = this.get('KAKYOIN');
      const allowed =
        avdol.heldByPlayer === 0 &&
        avdol.inPot === 0 &&
        kakyoin.heldByPlayer === 0 &&
        kakyoin.inPot === 0 &&
        jotaroBankDepleted &&
        this.getPlayerWagerableChips() === 0;
      if (!allowed) {
        return {
          allowed: false,
          reason: 'Last Resort: Holly Kujo\'s soul unlocks only after Jotaro, Avdol, and Kakyoin have lost all wagerable chips.'
        };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }

  public pledgeToActiveBank(owner: SoulOwner, amount: number): number {
    if (owner === 'JOTARO' || owner === 'POLNAREFF' || owner === 'JOSEPH') return 0;

    const source = this.get(owner);
    const bank = this.get('JOTARO');
    const pledged = Math.min(Math.max(0, Math.floor(amount)), source.heldByPlayer);
    source.heldByPlayer -= pledged;
    source.wagerableByPlayer = Math.max(0, source.wagerableByPlayer - pledged);
    bank.heldByPlayer += pledged;
    bank.wagerableByPlayer += pledged;
    return pledged;
  }

  public pledgeToPot(owner: SoulOwner, amount: number, pot: SoulPotStack, phase: string, bypassGating: boolean = false): number {
    if (owner === 'POLNAREFF' || owner === 'JOSEPH') return 0;

    if (!bypassGating) {
      const check = this.canPledge(owner);
      if (!check.allowed) {
        console.warn(`Pledge blocked: ${check.reason}`);
        return 0;
      }
    }

    const s = this.get(owner);
    const available = s.heldByPlayer;
    const toPledge = Math.min(amount, available);

    for (let i = 0; i < toPledge; i++) {
      s.heldByPlayer--;
      s.inPot++;
      s.wagerableByPlayer = Math.max(0, s.wagerableByPlayer - 1);
      pot.push({
        id: `${owner}_CHIP_${6 - s.heldByPlayer}`,
        owner,
        pledgedAtPhase: phase,
        isWagerable: true
      });
    }

    return toPledge;
  }

  public darbyMatchPot(owner: SoulOwner, amount: number, pot: SoulPotStack, phase: string): number {
    const s = this.get(owner);
    const available = this.darbyBankChips.filter(chip => chip.owner === owner).length;
    const toMatch = Math.min(amount, available);

    for (let i = 0; i < toMatch; i++) {
      const bankIndex = this.findLastDarbyChipIndex([owner]);
      if (bankIndex < 0) break;
      this.moveDarbyChipToPot(bankIndex, pot, phase);
    }

    return toMatch;
  }

  /**
   * 1-for-1 matching for D'Arby: use captured player chips first, then Polnareff, then Joseph.
   */
  public darbyMatchCall(amountNeeded: number, pot: SoulPotStack, phase: string): number {
    let matched = 0;
    const priority: SoulOwner[][] = [
      ['JOTARO', 'AVDOL', 'KAKYOIN', 'HOLLY'],
      ['POLNAREFF'],
      ['JOSEPH']
    ];

    for (const owners of priority) {
      if (matched >= amountNeeded) break;
      while (matched < amountNeeded) {
        const bankIndex = this.findLastDarbyChipIndex(owners);
        if (bankIndex < 0) break;
        this.moveDarbyChipToPot(bankIndex, pot, phase);
        matched++;
      }
    }

    return matched;
  }

  private findLastDarbyChipIndex(owners: readonly SoulOwner[]): number {
    for (let i = this.darbyBankChips.length - 1; i >= 0; i--) {
      if (owners.includes(this.darbyBankChips[i].owner)) return i;
    }
    return -1;
  }

  private moveDarbyChipToPot(bankIndex: number, pot: SoulPotStack, phase: string): void {
    const [bankChip] = this.darbyBankChips.splice(bankIndex, 1);
    if (!bankChip) return;

    const state = this.get(bankChip.owner);
    state.heldByDarby--;
    state.inPot++;
    this.darbyBetCounter++;
    pot.push({
      id: `${bankChip.id}_DARBY_BET_${this.darbyBetCounter}`,
      owner: bankChip.owner,
      pledgedAtPhase: phase,
      isWagerable: bankChip.isWagerable
    });
  }

  /**
   * True Pot Deficit Formula:
   * playerContribution = total player chips currently in pot
   * darbyMaxPossibleContribution = darby chips in pot + darby remaining bank
   * potDeficit = playerContribution - darbyMaxPossibleContribution
   */
  public calculatePotDeficit(pot: SoulPotStack): number {
    const potChips = pot.toTelemetry().potChips;
    const playerContribution = potChips.filter(c => !c.id.includes('DARBY')).length;
    const darbyChipsInPot = potChips.filter(c => c.id.includes('DARBY')).length;
    const darbyRemainingBank = this.getDarbyTotalBank();
    const darbyMaxPossibleContribution = darbyChipsInPot + darbyRemainingBank;
    return playerContribution - darbyMaxPossibleContribution;
  }

  /**
   * Resolve pot after showdown: winner takes all chips in pot
   */
  public awardPot(winner: 'PLAYER' | 'DARBY', pot: SoulPotStack): void {
    while (!pot.isEmpty()) {
      const chip = pot.pop();
      if (!chip) break;
      const s = this.get(chip.owner);
      s.inPot = Math.max(0, s.inPot - 1);
      if (winner === 'PLAYER') {
        s.heldByPlayer++;
        if (
          chip.isWagerable ||
          chip.owner === 'JOTARO' ||
          chip.owner === 'AVDOL' ||
          chip.owner === 'KAKYOIN' ||
          chip.owner === 'HOLLY'
        ) {
          s.wagerableByPlayer++;
        }
      } else {
        s.heldByDarby++;
        this.darbyBankChips.push(chip);
      }
    }
  }

  /**
   * Refund pot chips on voided hand (Public Accusation)
   */
  public refundPot(pot: SoulPotStack): void {
    const refunded = pot.refundAllLIFO();
    for (const chip of refunded) {
      const s = this.get(chip.owner);
      s.inPot = Math.max(0, s.inPot - 1);
      // If it belonged to Polnareff/Joseph and was pledged by Darby, return to Darby; else player
      if (chip.id.includes('DARBY')) {
        s.heldByDarby++;
        this.darbyBankChips.push(chip);
      } else {
        s.heldByPlayer++;
        if (chip.isWagerable) s.wagerableByPlayer++;
      }
    }
  }

  public clearDarbyBank(owner: SoulOwner): void {
    this.darbyBankChips = this.darbyBankChips.filter(chip => chip.owner !== owner);
    this.get(owner).heldByDarby = 0;
  }

  /**
   * Computes O(1) buffs and debuffs based on current state of all vaults
   */
  public toTelemetry(): SoulVaultTelemetry {
    const entries = Array.from(this.buckets.values());
    const jotaro = this.get('JOTARO');
    const avdol = this.get('AVDOL');
    const kakyoin = this.get('KAKYOIN');
    const holly = this.get('HOLLY');
    const polnareff = this.get('POLNAREFF');
    const joseph = this.get('JOSEPH');

    // 1. Jotaro Soul Atrophy: 12% shrink per lost chip
    const lostJotaro = jotaro.heldByDarby;
    const qteWindowMultiplier = Math.max(0.28, 1 - (lostJotaro * 0.12));

    // 2. Avdol Silence: locked if >=1 in pot or lost
    const isAvdolAdvisorLocked = avdol.inPot > 0 || avdol.heldByDarby > 0;

    // 3. Kakyoin Guilt Lock: "Lock Hand Blind" disabled if D'Arby won >=1 chip
    const isBlindHandLockedOut = kakyoin.heldByDarby > 0;

    // 4. Holly taboo: in pot
    const isHollyInPot = holly.inPot > 0;

    // Recovered souls
    let recovered = 0;
    if (polnareff.heldByPlayer === 6) recovered++;
    if (joseph.heldByPlayer === 6) recovered++;

    const activeBuffs: string[] = [];
    const activeDebuffs: string[] = [];

    if (lostJotaro > 0) {
      activeDebuffs.push(`Soul Atrophy: -${lostJotaro * 12}% QTE Timing Bar`);
    }
    if (isAvdolAdvisorLocked) {
      activeDebuffs.push('Silence of the Strategist: Avdol Advisor UI Locked Out');
    } else {
      activeBuffs.push('Magician\'s Intel: Avdol Odds Calculator Available');
    }
    if (kakyoin.heldByPlayer > 0 && !isBlindHandLockedOut) {
      activeBuffs.push('Cold Resolve: Suppressing Betting Speed Tells');
    }
    if (isBlindHandLockedOut) {
      activeDebuffs.push('Guilt Lock: "Lock Hand Blind" Disabled (Kakyoin Soul Compromised)');
    }
    if (isHollyInPot) {
      activeBuffs.push('Taboo Multiplier: 1.6x Paranoia Infliction Active');
      activeDebuffs.push('Sudden Death Taboo: Losing this pot means Instant Defeat!');
    }

    return {
      vaultEntries: entries,
      activeBuffs,
      activeDebuffs,
      qteWindowMultiplier,
      isAvdolAdvisorLocked,
      isBlindHandLockedOut,
      isHollyInPot,
      recoveredSoulsCount: recovered
    };
  }
}
