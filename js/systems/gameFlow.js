/**
 * gameFlow.js — Phase Controllers, Story Progression, and Game Reset
 *
 * Orchestrates the full game progression:
 *   INTRO → CHEATING_SEQUENCE → (EVIDENCE_QTE) →
 *   FIRST_HAND → SECOND_HAND → FINAL_SHOWDOWN → VICTORY/DEFEAT
 *
 * Uses callbacks to connect modules without circular imports.
 */
import {
  GameData, darbyAI, stateMachine,
  eventHistoryStack, checkpointStack, dealQueue,
  soulChipsMap, initSoulChipsMap,
  deck, discardPile, jotaroHand, darbyHand, evidenceNotes, selectedDiscardIndices,
  setDeck, setDiscardPile, setJotaroHand, setDarbyHand,
  setEvidenceNotes, setSelectedDiscards
} from "../state.js";
import { createStandardDeck, shuffleDeckFisherYates, pullCardsByCode } from "../cards/deck.js";
import { evaluatePokerHand, comparePokerHands } from "../cards/pokerEvaluator.js";
import { calculateFinalBluffStrength } from "../characters/darbyAI.js";
import { setDialogue, setConsequencePreview } from "../ui/dialogue.js";
import { renderActionButtons, updateAllUI, setStandFeedback, flashStandFreezeEffect } from "../ui/render.js";
import { renderNotesModal, showNoteToast, toggleNotesModal } from "../ui/notes.js";
import { resolveRegularHandShowdown, registerBettingCallback } from "./betting.js";
import {
  handleStarPlatinumActivation, stopTimingWindow,
  runOpeningDealTimingAnimation, runFinalShowdownStuntAnimation,
  registerStarPlatinumCallbacks
} from "../abilities/starPlatinum.js";
import { SoundFX } from "./soundFX.js";

/* ------------------------------------------------------------------
   Register cross-module callbacks
   ------------------------------------------------------------------ */
registerBettingCallback(onHandResolved);
registerStarPlatinumCallbacks({
  onCheatCaught:    onCheatCaught,
  onFinalStuntDone: renderFinalShowdownBettingStage
});

/* ------------------------------------------------------------------
   Card click handler (shared across phases)
   ------------------------------------------------------------------ */
function onCardClick(idx) {
  if (stateMachine.currentState === "SECOND_HAND" && GameData.handSubStage === "EXCHANGE") {
    const pos = selectedDiscardIndices.indexOf(idx);
    if (pos !== -1) {
      selectedDiscardIndices.splice(pos, 1);
    } else if (selectedDiscardIndices.length < 2) {
      selectedDiscardIndices.push(idx);
    }
    SoundFX.cardDeal();
    renderSecondHandActions();
    updateAllUI(onCardClick);
  }
}

/* ------------------------------------------------------------------
   Stop all active timers
   ------------------------------------------------------------------ */
export function stopAllTimers() {
  stopTimingWindow();
  if (GameData.qteIntervalId) {
    clearInterval(GameData.qteIntervalId);
    GameData.qteIntervalId = null;
  }
  GameData.qteActive = false;
  const qteBox = document.getElementById("qteAlertBox");
  if (qteBox) qteBox.classList.remove("visible");
}

/* ------------------------------------------------------------------
   Full Game Reset
   ------------------------------------------------------------------ */
export function resetFullGame() {
  stopAllTimers();

  eventHistoryStack.clear();
  checkpointStack.clear();
  dealQueue.clear();

  setDeck(shuffleDeckFisherYates(createStandardDeck()));
  setDiscardPile([]);
  setJotaroHand([]);
  setDarbyHand([]);
  setEvidenceNotes([]);
  setSelectedDiscards([]);

  GameData.jotaroChips           = 1000;
  GameData.darbyChips            = 2000;
  GameData.pot                   = 0;
  GameData.currentBetToCall      = 0;
  GameData.jotaroCardsFaceUp     = true;
  GameData.starPlatinumCharges   = 3;
  GameData.avdolAvailableThisHand = true;
  GameData.dealerIsBoy           = false;
  GameData.handSubStage          = "READY";
  GameData.finalRaiseLevel       = 0;
  GameData.isBusyAnimating       = false;
  GameData.timingAttemptedThisWindow = false;

  darbyAI.confidence    = 85;
  darbyAI.doubt         = 10;
  darbyAI.suspicion     = 15;
  darbyAI.handStrength  = 0;
  darbyAI.cheatDetected  = false;
  darbyAI.cheatExposed   = false;
  darbyAI.stuntSucceeded = false;
  darbyAI.keptCardsHidden = false;

  initSoulChipsMap();
  stateMachine.currentState  = "INTRO";
  stateMachine.previousState = "NONE";
  eventHistoryStack.push("[INIT] Match initialized. 52-card deck shuffled via Fisher-Yates.");

  // Reset transient UI
  setStandFeedback("");
  const avdolQuote = document.getElementById("avdolQuoteBox");
  if (avdolQuote) avdolQuote.textContent =
    '"Watch his hands closely, Jotaro. D\'Arby never plays a fair game when souls are on the table."';

  ["endingModal", "evidenceModal", "notesModal", "rulesModal"].forEach(id => {
    document.getElementById(id)?.classList.remove("open");
  });

  const stakeBanner = document.getElementById("narrativeStakeBanner");
  if (stakeBanner) stakeBanner.textContent = "Stakes: Opening Warmup & Observation";

  renderIntroPhase();
  updateAllUI(onCardClick);
}

/* ------------------------------------------------------------------
   1. INTRO PHASE
   ------------------------------------------------------------------ */
function renderIntroPhase() {
  setDialogue("DANIEL J. D'ARBY",
    '"Welcome to my table, Jotaro. I already hold Polnareff\'s and Joseph Joestar\'s souls inside these chips. Let\'s begin with an opening deal—I\'ll deal the cards myself."');
  setConsequencePreview(
    "Phase 1: D'Arby will deal the opening cards himself. Keep your finger on [SPACE] or the Star Platinum button!");

  renderActionButtons([
    { label: "▶ START MATCH — WATCH D'ARBY DEAL", cls: "primary",
      onClick: startOpeningCheatingSequence },
    { label: "📖 POKER RULES & SHORTCUTS", cls: "",
      onClick: () => document.getElementById("rulesModal")?.classList.add("open") }
  ]);
}

/* ------------------------------------------------------------------
   2. OPENING CHEATING SEQUENCE
   ------------------------------------------------------------------ */
function startOpeningCheatingSequence() {
  stateMachine.transitionTo("CHEATING_SEQUENCE", "D'Arby begins dealing");
  GameData.handSubStage = "DEALING";
  GameData.timingAttemptedThisWindow = false;
  GameData.pot = 200;
  GameData.jotaroChips -= 100;
  GameData.darbyChips  -= 100;
  SoundFX.chipBet();

  setDeck(shuffleDeckFisherYates(createStandardDeck()));
  setJotaroHand([]);
  setDarbyHand([]);

  const jotaroOpening   = pullCardsByCode(["10S", "10H", "JC", "8D", "4S"], deck);
  const darbyCheatCards = pullCardsByCode(["AS",  "AH",  "AD", "KC", "KH"], deck);

  dealQueue.clear();
  for (let i = 0; i < 5; i++) {
    dealQueue.enqueue({ target: "JOTARO", card: jotaroOpening[i],   step: i * 2 + 1 });
    dealQueue.enqueue({ target: "DARBY",  card: darbyCheatCards[i], step: i * 2 + 2 });
  }
  eventHistoryStack.push("[QUEUE] Enqueued 10 cards into dealQueue for opening deal.");

  setDialogue("NARRATOR",
    "D'Arby smoothly riffles the deck. Watch the timing bar! When his lower fingers slide under the deck (Gold Zone: 43%–76%), activate STAR PLATINUM [SPACE]!");
  setConsequencePreview(
    "TIMING CHALLENGE: Press [SPACE] inside the gold zone. Early or late activation wastes a charge!");

  renderActionButtons([
    { label: "⚡ ACTIVATE STAR PLATINUM NOW! [SPACE]", cls: "bluff-special",
      onClick: handleStarPlatinumActivation }
  ]);

  runOpeningDealTimingAnimation();
  updateAllUI(onCardClick);
}

/* ------------------------------------------------------------------
   3. CHEAT DETECTION CALLBACK (from starPlatinum.js)
   ------------------------------------------------------------------ */
function onCheatCaught(caught, pct) {
  if (caught) {
    darbyAI.cheatDetected = true;
    darbyAI.suspicion    += 15;
    darbyAI.clampMetrics();

    const noteTitle = "OBSERVATION 01 — BOTTOM DEALING";
    const noteBody  =
      "D'Arby slipped a card from the bottom of the deck into his hand. He may have manipulated his cards to obtain a stronger hand. Remember this when judging his confidence and deciding whether to call or raise.";

    if (!evidenceNotes.some(n => n.title === noteTitle)) {
      evidenceNotes.push({ title: noteTitle, body: noteBody });
    }

    setStandFeedback("★ BOTTOM DEAL DETECTED! Persistent note saved to Evidence Log.");
    eventHistoryStack.push(`[STAND] Bottom Deal CAUGHT at ${Math.round(pct)}%! Observation 01 saved.`);
    showNoteToast(noteTitle);

    // Show evidence diagram modal, then launch QTE
    document.getElementById("evidenceModal")?.classList.add("open");
    updateAllUI(onCardClick);
  } else {
    proceedToFirstHand();
    updateAllUI(onCardClick);
  }
}

/* ------------------------------------------------------------------
   4. QTE: CALL OUT THE CHEATING
   ------------------------------------------------------------------ */
export function startCallOutQTE() {
  stateMachine.transitionTo("EVIDENCE_QTE", "Accusation QTE started");
  GameData.qteActive   = true;
  GameData.qteProgress = 100;

  const qteBox  = document.getElementById("qteAlertBox");
  const qteFill = document.getElementById("qteTimerFill");
  if (qteBox) qteBox.classList.add("visible");

  setDialogue("STAR PLATINUM",
    "YOU CAUGHT HIM! Press [E] or click the button within 2.2 seconds to publicly expose his bottom deal!");
  renderActionButtons([]);

  const durationMs = 2200;
  const stepMs     = 40;
  const decrement  = (stepMs / durationMs) * 100;

  GameData.qteIntervalId = setInterval(() => {
    GameData.qteProgress -= decrement;
    if (qteFill) qteFill.style.width = `${Math.max(0, GameData.qteProgress)}%`;
    if (GameData.qteProgress <= 0) resolveCallOutQTE(false);
  }, stepMs);

  updateAllUI(onCardClick);
}

export function resolveCallOutQTE(succeeded) {
  if (!GameData.qteActive) return;
  stopAllTimers();

  if (succeeded) {
    SoundFX.qteSuccess();
    flashStandFreezeEffect();
    darbyAI.cheatExposed  = true;
    darbyAI.confidence   -= 26;
    darbyAI.doubt        += 22;
    darbyAI.clampMetrics();
    GameData.dealerIsBoy = true;

    // Throw out cheated hand, re-deal fairly
    discardPile.push(...jotaroHand, ...darbyHand);
    setJotaroHand([]);
    setDarbyHand([]);
    for (let i = 0; i < 5; i++) {
      jotaroHand.push(deck.pop());
      darbyHand.push(deck.pop());
    }

    eventHistoryStack.push("[QTE] SUCCESS! D'Arby publicly exposed. Dealer Boy takes over.");
    setDialogue("JOTARO KUJO",
      '"ORA! Caught you red-handed, D\'Arby! You slid that card from the bottom of the deck. Let that boy over there deal from now on."');
  } else {
    SoundFX.standFail();
    darbyAI.confidence -= 5;
    darbyAI.clampMetrics();
    GameData.dealerIsBoy = true;
    eventHistoryStack.push("[QTE] EXPIRED! Cheat not exposed publicly. Observation 01 retained.");
    setDialogue("DANIEL J. D'ARBY",
      '"You were staring at my fingers intently, Jotaro, yet you said nothing. Still, as a gentleman, I\'ll let the Dealer Boy handle the subsequent hands."');
  }

  proceedToFirstHand();
}

/* ------------------------------------------------------------------
   5. FIRST HAND
   ------------------------------------------------------------------ */
function proceedToFirstHand() {
  stateMachine.transitionTo("FIRST_HAND", "Entering First Regular Hand");
  GameData.handSubStage = "BETTING";
  GameData.avdolAvailableThisHand = true;
  GameData.currentBetToCall = 100;
  GameData.dealerIsBoy = true;

  const stakeBanner = document.getElementById("narrativeStakeBanner");
  if (stakeBanner) stakeBanner.textContent = "Stakes: Hand 1 — Chip Pot (200 chips) & Reading D'Arby";

  if (darbyAI.cheatExposed) {
    setConsequencePreview(
      "Hand 1 (Fair Deal): Exposed D'Arby's bottom deal! The Dealer Boy dealt a fresh fair hand. Call (100), Raise (+250), or Fold.");
  } else if (darbyAI.cheatDetected) {
    setConsequencePreview(
      "Hand 1 (Check your Notes!): You saw D'Arby bottom-deal this hand, though you didn't expose him in time. His hand may be rigged!");
  } else {
    setConsequencePreview(
      "Hand 1: Inspect your 5-card hand and decide whether to Call (100 chips), Raise (+250 chips), or Fold.");
  }

  renderFirstHandActions();
  updateAllUI(onCardClick);
}

function renderFirstHandActions() {
  const myEval = evaluatePokerHand(jotaroHand);
  renderActionButtons([
    { label: GameData.jotaroCardsFaceUp ? "🙈 HIDE MY CARDS" : "👁 INSPECT MY CARDS", cls: "",
      onClick: () => { GameData.jotaroCardsFaceUp = !GameData.jotaroCardsFaceUp; renderFirstHandActions(); updateAllUI(onCardClick); } },
    { label: `✅ CALL (100 chips)  [${myEval.categoryName}]`, cls: "primary",
      onClick: () => resolveRegularHandShowdown("CALL", 100, "FIRST_HAND") },
    { label: "🔥 RAISE (+250 chips)", cls: "bluff-special",
      onClick: () => resolveRegularHandShowdown("RAISE", 250, "FIRST_HAND") },
    { label: "🏳 FOLD HAND", cls: "danger",
      onClick: () => resolveRegularHandShowdown("FOLD", 0, "FIRST_HAND") }
  ]);
}

/* ------------------------------------------------------------------
   6. SECOND HAND — POLNAREFF'S SOUL AT STAKE
   ------------------------------------------------------------------ */
function startSecondHand() {
  stateMachine.transitionTo("SECOND_HAND", "Polnareff's Soul Wagered");
  GameData.handSubStage = "EXCHANGE";
  GameData.avdolAvailableThisHand = true;
  GameData.jotaroCardsFaceUp = true;
  setSelectedDiscards([]);

  discardPile.push(...jotaroHand, ...darbyHand);
  setJotaroHand([]);
  setDarbyHand([]);

  if (deck.length < 15) {
    setDeck(shuffleDeckFisherYates(createStandardDeck()));
    setDiscardPile([]);
  }

  // Deal 5 cards each via Queue
  dealQueue.clear();
  for (let i = 0; i < 5; i++) {
    dealQueue.enqueue({ target: "JOTARO", card: deck.pop() });
    dealQueue.enqueue({ target: "DARBY",  card: deck.pop() });
  }
  while (!dealQueue.isEmpty()) {
    const item = dealQueue.dequeue();
    if (item.target === "JOTARO") jotaroHand.push(item.card);
    else                          darbyHand.push(item.card);
  }
  SoundFX.cardDeal();

  const pol = soulChipsMap.get("POLNAREFF");
  pol.status = "AT STAKE";
  soulChipsMap.set("POLNAREFF", pol);

  GameData.pot = 300;
  GameData.jotaroChips = Math.max(0, GameData.jotaroChips - 150);
  GameData.darbyChips  = Math.max(0, GameData.darbyChips  - 150);
  GameData.currentBetToCall = 150;

  const stakeBanner = document.getElementById("narrativeStakeBanner");
  if (stakeBanner) stakeBanner.textContent = "🔵 SOUL AT STAKE: JEAN PIERRE POLNAREFF (+ 300 chips)";

  setDialogue("DANIEL J. D'ARBY",
    '"Now the real game begins! Click up to 2 cards to exchange them, then place your bet. Jean Pierre Polnareff\'s soul chip is now wagered!"');
  setConsequencePreview(
    "Hand 2 (Polnareff's Soul at Stake): Click up to 2 of your cards to swap them, or bet directly.");

  eventHistoryStack.push("[SOUL MAP] Polnareff's Soul → AT STAKE.");
  renderSecondHandActions();
  updateAllUI(onCardClick);
}

function renderSecondHandActions() {
  const inExchange = GameData.handSubStage === "EXCHANGE";
  const buttons = [];

  if (inExchange) {
    buttons.push({
      label: selectedDiscardIndices.length > 0
        ? `🔄 DRAW ${selectedDiscardIndices.length} NEW CARD(S)`
        : "✋ STAND PAT (KEEP ALL 5)",
      cls: "primary",
      onClick: executeSecondHandDraw
    });
  }

  buttons.push(
    { label: "✅ CALL (150 chips)", cls: "primary",
      onClick: () => resolveRegularHandShowdown("CALL", 150, "SECOND_HAND") },
    { label: "🔥 RAISE (+300 chips)", cls: "bluff-special",
      onClick: () => resolveRegularHandShowdown("RAISE", 300, "SECOND_HAND") },
    { label: "🏳 FOLD HAND", cls: "danger",
      onClick: () => resolveRegularHandShowdown("FOLD", 0, "SECOND_HAND") }
  );

  renderActionButtons(buttons);
}

function executeSecondHandDraw() {
  if (GameData.handSubStage !== "EXCHANGE") return;
  GameData.handSubStage = "BETTING";

  if (selectedDiscardIndices.length > 0) {
    selectedDiscardIndices.sort((a, b) => b - a);
    for (const idx of selectedDiscardIndices) {
      discardPile.push(jotaroHand[idx]);
      jotaroHand[idx] = deck.pop();
    }
    const drawn = selectedDiscardIndices.length;
    setSelectedDiscards([]);
    SoundFX.cardDeal();
    eventHistoryStack.push(`[ARRAY] Exchanged ${drawn} card(s) from deck into jotaroHand.`);
    setDialogue("THE DEALER BOY", `"I have dealt you ${drawn} replacement card(s). Please make your wager."`);
  } else {
    setDialogue("JOTARO KUJO", '"I\'ll keep these five cards. Let\'s settle this hand."');
  }

  renderSecondHandActions();
  updateAllUI(onCardClick);
}

/* ------------------------------------------------------------------
   7. Betting callback
   ------------------------------------------------------------------ */
function onHandResolved(phaseName, outcome) {
  if (phaseName === "FIRST_HAND") {
    setConsequencePreview("Hand 1 Complete: Proceed to Hand 2 where Polnareff's Soul Chip is at stake.");
    renderActionButtons([
      { label: "▶ PROCEED TO HAND 2 (POLNAREFF'S SOUL AT STAKE)", cls: "primary",
        onClick: startSecondHand }
    ]);
  } else if (phaseName === "SECOND_HAND") {
    setConsequencePreview("Hand 2 Complete: Proceed to the Final Showdown for Joseph Joestar's Soul!");
    renderActionButtons([
      { label: "🔥 ENTER FINAL SHOWDOWN (JOSEPH'S SOUL AT STAKE)", cls: "bluff-special",
        onClick: startFinalShowdown }
    ]);
  }
  updateAllUI(onCardClick);
}

/* ------------------------------------------------------------------
   8. FINAL SHOWDOWN
   ------------------------------------------------------------------ */
function saveFinalShowdownCheckpoint() {
  checkpointStack.push({
    jotaroChips: GameData.jotaroChips,
    darbyChips:  GameData.darbyChips,
    starPlatinumCharges: Math.max(1, GameData.starPlatinumCharges),
    confidence:  darbyAI.confidence,
    doubt:       darbyAI.doubt,
    suspicion:   darbyAI.suspicion,
    cheatDetected: darbyAI.cheatDetected,
    cheatExposed:  darbyAI.cheatExposed,
    polnareffStatus: soulChipsMap.get("POLNAREFF").status
  });
  eventHistoryStack.push("[STACK] Pushed pre-Final Showdown checkpoint onto checkpointStack.");
}

export function restoreFinalShowdownCheckpoint() {
  const snap = checkpointStack.peek();
  if (snap) {
    GameData.jotaroChips         = snap.jotaroChips;
    GameData.darbyChips          = snap.darbyChips;
    GameData.starPlatinumCharges = snap.starPlatinumCharges;
    darbyAI.confidence = snap.confidence;
    darbyAI.doubt      = snap.doubt;
    darbyAI.suspicion  = snap.suspicion;
    darbyAI.cheatDetected = snap.cheatDetected;
    darbyAI.cheatExposed  = snap.cheatExposed;
    const pol = soulChipsMap.get("POLNAREFF");
    pol.status = snap.polnareffStatus;
    soulChipsMap.set("POLNAREFF", pol);
    eventHistoryStack.push("[STACK] Popped checkpoint to retry Final Showdown.");
  } else {
    GameData.starPlatinumCharges = Math.max(1, GameData.starPlatinumCharges);
  }
  document.getElementById("endingModal")?.classList.remove("open");
  startFinalShowdown(true);
}

function startFinalShowdown(isRetry = false) {
  if (!isRetry) saveFinalShowdownCheckpoint();
  stateMachine.transitionTo("FINAL_SHOWDOWN", "Climactic Showdown");
  stopAllTimers();

  if (GameData.starPlatinumCharges < 1) GameData.starPlatinumCharges = 1;

  GameData.avdolAvailableThisHand = true;
  GameData.handSubStage = "CARD_CHOICE";
  GameData.jotaroCardsFaceUp = false;
  GameData.finalRaiseLevel = 0;
  darbyAI.keptCardsHidden = false;
  darbyAI.stuntSucceeded  = false;

  // Joseph's soul AT STAKE
  const josephChip = soulChipsMap.get("JOSEPH");
  josephChip.status = "AT STAKE";
  soulChipsMap.set("JOSEPH", josephChip);

  // Scripted final hands
  discardPile.push(...jotaroHand, ...darbyHand);
  setDeck(createStandardDeck());
  setDarbyHand(pullCardsByCode(["KS", "KH", "KD", "KC", "9S"], deck));
  setJotaroHand(pullCardsByCode(["2C", "5D", "7S", "9H", "JC"], deck));
  SoundFX.cardDeal();

  GameData.pot = 1000;
  GameData.currentBetToCall = 500;

  const stakeBanner = document.getElementById("narrativeStakeBanner");
  if (stakeBanner) stakeBanner.textContent = "🟣 FINAL SHOWDOWN: JOSEPH JOESTAR'S SOUL!";

  setDialogue("AUDIENCE CUTAWAY — D'ARBY HOLDS FOUR KINGS",
    '"Hahahaha! Four Kings! Even if Jotaro drew well, nothing short of a Straight Flush could beat me... Wait. Why hasn\'t Jotaro looked at his cards yet?!"');
  setConsequencePreview(
    "CRITICAL DECISION: Your 5 cards are FACE DOWN. Will you keep them hidden (+bluff pressure), or peek at them?");

  renderActionButtons([
    { label: "🕶 KEEP MY CARDS HIDDEN (REFUSE TO LOOK — +BLUFF)", cls: "bluff-special",
      onClick: () => handleFinalCardInspectionChoice(true) },
    { label: "👁 PEEK AT MY CARDS (INSPECT HAND — REDUCES BLUFF)", cls: "",
      onClick: () => handleFinalCardInspectionChoice(false) }
  ]);

  updateAllUI(onCardClick);
}

function handleFinalCardInspectionChoice(keepHidden) {
  if (keepHidden) {
    darbyAI.keptCardsHidden = true;
    GameData.jotaroCardsFaceUp = false;
    darbyAI.doubt      += 24;
    darbyAI.confidence -= 15;
    darbyAI.suspicion  += 25;
    darbyAI.clampMetrics();
    eventHistoryStack.push("[BLUFF] Jotaro chose KEEP CARDS HIDDEN. D'Arby Doubt +24.");
    setDialogue("JOTARO KUJO",
      '"I don\'t even need to look at my cards, D\'Arby. I\'m playing this hand completely blind."');
  } else {
    darbyAI.keptCardsHidden = false;
    GameData.jotaroCardsFaceUp = true;
    darbyAI.confidence += 10;
    darbyAI.clampMetrics();
    eventHistoryStack.push("[BLUFF] Jotaro peeked at his weak High-Card Jack hand.");
    setDialogue("JOTARO KUJO",
      "(Yare yare daze... High Card Jack — 2♣, 5♦, 7♠, 9♥, J♣. Only an overwhelming psychological bluff can break D'Arby now.)");
  }

  // Step 2: Star Platinum stunt timing window
  startFinalShowdownStuntWindow();
  updateAllUI(onCardClick);
}

function startFinalShowdownStuntWindow() {
  GameData.handSubStage = "FINAL_STUNT_WINDOW";

  setConsequencePreview(
    "TIMING OPPORTUNITY: D'Arby is staring at you! Press [SPACE] inside the Gold Zone (43%–76%) to shatter his certainty.");

  renderActionButtons([
    { label: "⚡ TRIGGER STAR PLATINUM STUNT! [SPACE]", cls: "bluff-special",
      onClick: handleStarPlatinumActivation },
    { label: "⏭ SKIP DEMONSTRATION & GO TO FINAL BET", cls: "",
      onClick: () => { stopAllTimers(); renderFinalShowdownBettingStage(); updateAllUI(onCardClick); } }
  ]);

  runFinalShowdownStuntAnimation();
}

function renderFinalShowdownBettingStage() {
  GameData.handSubStage = "FINAL_BET";
  setConsequencePreview(
    "FINAL WAGER: D'Arby holds Four Kings — only a decisive psychological bluff can force him to fold!");

  renderActionButtons([
    { label: "🔥 ULTIMATE BLUFF: RAISE MY SOUL, KAKYOIN'S & AVDOL'S SOULS + DEMAND DIO'S SECRET!", cls: "bluff-special",
      onClick: () => executeFinalShowdownDecision(3) },
    { label: "💰 RAISE ALL REMAINING CHIPS (MODERATE PRESSURE)", cls: "primary",
      onClick: () => executeFinalShowdownDecision(2) },
    { label: "🪙 CAUTIOUS CALL / SMALL RAISE (+250 chips — Risky!)", cls: "",
      onClick: () => executeFinalShowdownDecision(1) }
  ]);
}

/* ------------------------------------------------------------------
   9. FINAL SHOWDOWN RESOLUTION
   ------------------------------------------------------------------ */
function executeFinalShowdownDecision(raiseLevel) {
  GameData.finalRaiseLevel = raiseLevel;
  SoundFX.chipBet();

  const bluffScore    = calculateFinalBluffStrength(raiseLevel);
  const callThreshold = 65;

  eventHistoryStack.push(
    `[FINAL BLUFF] RaiseLevel=${raiseLevel}, bluffStrength=${bluffScore} vs threshold=${callThreshold}.`);

  if (bluffScore >= callThreshold) {
    // VICTORY!
    darbyAI.confidence = 0;
    darbyAI.doubt      = 100;
    darbyAI.clampMetrics();

    soulChipsMap.forEach((chip, key) => {
      chip.status = "RECOVERED";
      soulChipsMap.set(key, chip);
    });
    eventHistoryStack.push("[VICTORY] D'Arby FOLDED Four Kings! All souls RECOVERED.");

    GameData.jotaroCardsFaceUp = true;
    stateMachine.transitionTo("VICTORY", "D'Arby mentally collapsed");
    SoundFX.victoryFanfare();

    setDialogue("DANIEL J. D'ARBY (MENTALLY SHATTERED — FOLDS!)",
      '"I... I c-ca... If Star Platinum switched his cards with a Straight Flush, I\'ll lose everything — and if I reveal DIO\'s secret, DIO will kill me! I... I FOLD!!"');

    showEndingModal(true, bluffScore, callThreshold);
  } else {
    // DEFEAT
    GameData.jotaroCardsFaceUp = true;
    stateMachine.transitionTo("DEFEAT", "D'Arby called the final bluff");
    SoundFX.defeatChord();

    const jotaroEval = evaluatePokerHand(jotaroHand);
    const darbyEval  = evaluatePokerHand(darbyHand);

    setDialogue("DANIEL J. D'ARBY — \"I CALL!\"",
      `"You don't scare me, Jotaro! I CALL! My ${darbyEval.description} crushes your ${jotaroEval.description}! Your soul belongs to Osiris!"`);

    showEndingModal(false, bluffScore, callThreshold);
  }

  updateAllUI(onCardClick);
}

function showEndingModal(isVictory, bluffScore, threshold) {
  const modal    = document.getElementById("endingModal");
  const title    = document.getElementById("endingTitle");
  const sub      = document.getElementById("endingSubtitle");
  const body     = document.getElementById("endingBody");
  const retryBtn = document.getElementById("btnRetryFinalHand");
  if (!modal) return;

  if (isVictory) {
    title.textContent = "★ VICTORY! SOULS RECOVERED! ★";
    title.style.color = "var(--gold)";
    sub.textContent   = `Bluff Strength: ${bluffScore} (Exceeded D'Arby's Break Threshold of ${threshold})`;
    body.innerHTML    = `
      <p>Under overwhelming psychological pressure, <strong>Daniel J. D'Arby</strong> dropped his Four Kings and passed out before he could say "Call"!</p>
      <p style="margin-top:8px;">As his Stand <strong>Osiris</strong> dissolves, both <strong>Joseph Joestar's</strong> and <strong>Jean Pierre Polnareff's</strong> captured souls burst free from their poker chips!</p>
      <p style="color:#a7f3d0;margin-top:8px;"><strong>Avdol flips over Jotaro's untouched cards:</strong> <em>"2♣, 5♦, 7♠, 9♥, J♣... Not even a single pair! Truly, Jotaro, if I ever gambled against you, I'd lose my shirt!"</em></p>`;
    if (retryBtn) retryBtn.style.display = "none";
  } else {
    title.textContent = "💀 DEFEAT — D'ARBY CALLED YOUR BLUFF";
    title.style.color = "var(--crimson)";
    sub.textContent   = `Bluff Strength: ${bluffScore} (Needed ${threshold} to break D'Arby's Four Kings)`;
    body.innerHTML    = `
      <p>D'Arby saw through the pressure and called! His <strong>Four of a Kind (Kings)</strong> defeated Jotaro's <strong>High Card (Jack)</strong>.</p>
      <p style="color:#fde68a;margin-top:8px;"><strong>How to guarantee victory on Retry:</strong></p>
      <ul style="padding-left:18px;margin-top:4px;">
        <li>Choose <strong>KEEP MY CARDS HIDDEN</strong> (+32 Bluff).</li>
        <li>Trigger <strong>STAR PLATINUM [SPACE]</strong> inside the Gold Zone (+34 Bluff).</li>
        <li>Select the <strong>ULTIMATE BLUFF</strong> (Soul Raise + DIO's Secret) (+30 Bluff).</li>
      </ul>`;
    if (retryBtn) retryBtn.style.display = "inline-block";
  }
  modal.classList.add("open");
}

/* ------------------------------------------------------------------
   Public exports for main.js event listeners
   ------------------------------------------------------------------ */
export { handleStarPlatinumActivation };
