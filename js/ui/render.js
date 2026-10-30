/**
 * render.js — UI Rendering: Cards, Soul Chips, Buttons, Inspector, Portrait
 *
 * This module owns all DOM mutation except dialogue text.
 * It reads from state.js and never modifies state itself.
 */
import {
  GameData, darbyAI, stateMachine,
  deck, discardPile, jotaroHand, darbyHand,
  evidenceNotes, selectedDiscardIndices,
  soulChipsMap, dealQueue, dialogueQueue,
  eventHistoryStack
} from "../state.js";
import { evaluatePokerHand } from "../cards/pokerEvaluator.js";
import { calculateFinalBluffStrength } from "../characters/darbyAI.js";

/* ---------------------------------------------------------------
   Flash FX
   --------------------------------------------------------------- */
export function flashStandFreezeEffect() {
  const fx = document.getElementById("standFreezeFx");
  if (!fx) return;
  fx.classList.add("active");
  setTimeout(() => fx.classList.remove("active"), 450);
}

/* ---------------------------------------------------------------
   Action Buttons
   --------------------------------------------------------------- */
export function renderActionButtons(btnConfigs) {
  const container = document.getElementById("actionButtonsContainer");
  if (!container) return;
  container.innerHTML = "";
  for (const cfg of btnConfigs) {
    const btn = document.createElement("button");
    btn.className = `act-btn ${cfg.cls || ""}`.trim();
    btn.textContent = cfg.label;
    btn.disabled = !!cfg.disabled;
    btn.addEventListener("click", cfg.onClick);
    container.appendChild(btn);
  }
}

/* ---------------------------------------------------------------
   Card Rendering
   --------------------------------------------------------------- */
export function renderTableCards(onCardClick) {
  const darbyContainer  = document.getElementById("darbyCardsContainer");
  const jotaroContainer = document.getElementById("jotaroCardsContainer");
  const darbyBadge      = document.getElementById("darbyHandRankBadge");
  const jotaroBadge     = document.getElementById("jotaroHandRankBadge");
  if (!darbyContainer) return;

  darbyContainer.innerHTML  = "";
  jotaroContainer.innerHTML = "";

  const state = stateMachine.currentState;
  const showDarbyFaceUp =
    GameData.handSubStage === "RESOLVED" ||
    state === "FINAL_SHOWDOWN" ||
    state === "VICTORY" ||
    state === "DEFEAT";

  // D'Arby's cards
  darbyHand.forEach(card => {
    const isXray = state === "FINAL_SHOWDOWN";
    darbyContainer.appendChild(createCardElement(card, showDarbyFaceUp, isXray));
  });
  if (darbyHand.length === 5 && showDarbyFaceUp) {
    const evalD = evaluatePokerHand(darbyHand);
    darbyBadge.textContent = state === "FINAL_SHOWDOWN"
      ? `Audience View: ${evalD.description}` : evalD.description;
  } else {
    darbyBadge.textContent = darbyHand.length > 0 ? "Hidden" : "Waiting...";
  }

  // Jotaro's cards
  jotaroHand.forEach((card, idx) => {
    const cardEl = createCardElement(card, GameData.jotaroCardsFaceUp, false);
    if (selectedDiscardIndices.includes(idx)) cardEl.classList.add("selected-discard");
    cardEl.addEventListener("click", () => {
      if (onCardClick) onCardClick(idx);
    });
    jotaroContainer.appendChild(cardEl);
  });
  if (jotaroHand.length === 5) {
    jotaroBadge.textContent = GameData.jotaroCardsFaceUp
      ? evaluatePokerHand(jotaroHand).description
      : "Hidden (Face Down)";
  } else {
    jotaroBadge.textContent = "Waiting for deal...";
  }
}

function createCardElement(card, isFaceUp, isAudienceXray) {
  const div = document.createElement("div");
  if (!isFaceUp) {
    div.className = "playing-card face-down";
    return div;
  }
  const suitClass = card.color === "red" ? "red-suit" : "black-suit";
  div.className = `playing-card ${suitClass}${isAudienceXray ? " audience-xray" : ""}`;
  div.innerHTML = `
    <div class="card-corner-top">${card.rank}<br>${card.suitSymbol}</div>
    <div class="card-center-suit">${card.suitSymbol}</div>
    <div class="card-corner-bottom">${card.rank}<br>${card.suitSymbol}</div>
    ${isAudienceXray ? `<span class="xray-ribbon">AUDIENCE VIEW</span>` : ""}
  `;
  return div;
}

/* ---------------------------------------------------------------
   Soul Chips Strip
   --------------------------------------------------------------- */
export function renderSoulChipsStrip() {
  const container = document.getElementById("soulChipsStrip");
  if (!container) return;
  container.innerHTML = "";
  let recoveredCount = 0;

  soulChipsMap.forEach(chip => {
    if (chip.status === "RECOVERED") recoveredCount++;

    let statusKey = "held";
    if (chip.status === "AT STAKE") statusKey = "stake";
    if (chip.status === "RECOVERED") statusKey = "recovered";

    const item = document.createElement("div");
    item.className = `soul-chip-item soul-${statusKey}`;
    item.innerHTML = `
      <div class="soul-token-disc ${chip.discClass}" title="${chip.name}">${chip.initials}</div>
      <div class="soul-chip-info">
        <span class="soul-chip-name">${chip.name.split(" ").pop()}</span>
        <span class="soul-chip-status tag-${statusKey.toUpperCase()}">${chip.status}</span>
      </div>
    `;
    container.appendChild(item);
  });

  const soulsSaved = document.getElementById("soulsSavedCount");
  if (soulsSaved) soulsSaved.textContent = `${recoveredCount}/2 Recovered`;
}

/* ---------------------------------------------------------------
   D'Arby Portrait & Confidence Bar
   --------------------------------------------------------------- */
export function renderDarbyConfidenceBar() {
  const psych = darbyAI.getPsychStateLabel();
  const badge = document.getElementById("darbyPsychBadge");
  if (badge) {
    badge.className = `psych-badge psych-${psych}`;
    badge.textContent = psych;
  }

  const bar = document.getElementById("darbyConfidenceBar");
  if (bar) bar.style.width = `${darbyAI.confidence}%`;

  // Portrait class for DESPERATE glow
  const portrait = document.getElementById("darbyFaceSvg");
  if (portrait) {
    portrait.classList.toggle("psych-desperate", psych === "DESPERATE");
  }

  // Dynamic SVG expression (mouth shape + sweat)
  const mouth = document.getElementById("darbyMouthPath");
  const sweat  = document.getElementById("darbySweatGroup");
  if (!mouth) return;   // portrait SVG not in DOM — confidence bar above still updated

  const expressions = {
    CALM:      { d: "M33 48 Q40 53 47 48", showSweat: false },
    UNEASY:    { d: "M34 49 L46 49",       showSweat: true  },
    SHAKEN:    { d: "M33 51 Q40 46 47 51", showSweat: true  },
    DESPERATE: { d: "M34 50 Q40 43 46 50", showSweat: true  }
  };
  const expr = expressions[psych] || expressions.CALM;
  mouth.setAttribute("d", expr.d);
  if (sweat) sweat.style.display = expr.showSweat ? "block" : "none";
}


/* ---------------------------------------------------------------
   Stand Charges & Ability Buttons
   --------------------------------------------------------------- */
export function renderAbilityButtons() {
  const orbsContainer = document.getElementById("standChargeOrbs");
  const spBtn         = document.getElementById("btnStarPlatinum");
  const avdolBtn      = document.getElementById("btnAskAvdol");

  if (orbsContainer) {
    orbsContainer.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const span = document.createElement("span");
      span.className = `charge-orb ${i < GameData.starPlatinumCharges ? "filled" : ""}`;
      orbsContainer.appendChild(span);
    }
  }
  if (spBtn)    spBtn.disabled    = GameData.starPlatinumCharges <= 0;
  if (avdolBtn) avdolBtn.disabled = !GameData.avdolAvailableThisHand;

  const avdolLabel = document.getElementById("avdolUsesLabel");
  if (avdolLabel) {
    avdolLabel.textContent = GameData.avdolAvailableThisHand ? "Ready" : "Used";
  }
}

/* ---------------------------------------------------------------
   HUD updates (chips, phase, dealer)
   --------------------------------------------------------------- */
export function renderHUD() {
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

  setEl("hudPhaseLabel",      stateMachine.currentState);
  setEl("jotaroChipsDisplay", `${GameData.jotaroChips.toLocaleString()} chips`);
  setEl("potAmountDisplay",   `${GameData.pot.toLocaleString()} CHIPS`);
  setEl("currentBetDisplay",  `${GameData.currentBetToCall.toLocaleString()} CHIPS`);

  const dealerName = document.getElementById("activeDealerName");
  const dealerSub  = document.getElementById("activeDealerSub");
  const deckCount  = document.getElementById("feltDeckCount");
  if (deckCount) deckCount.textContent = deck.length;

  if (GameData.dealerIsBoy) {
    if (dealerName) dealerName.textContent = "THE DEALER BOY (NEUTRAL)";
    if (dealerSub)  dealerSub.textContent  = darbyAI.cheatExposed
      ? "Replaced D'Arby after the bottom deal was exposed."
      : "Dealing fairly from the top of the shoe.";
    const deckEl = document.getElementById("visualDeckStack");
    if (deckEl) {
      deckEl.textContent = deck.length;
      deckEl.style.borderColor = "var(--emerald)";
    }
  } else {
    if (dealerName) dealerName.textContent = "DANIEL J. D'ARBY";
    if (dealerSub)  dealerSub.textContent  = "Dealing opening hand himself... Watch his fingers!";
    const deckEl = document.getElementById("visualDeckStack");
    if (deckEl) {
      deckEl.textContent = deck.length;
      deckEl.style.borderColor = "var(--gold)";
    }
  }

  // Stand feedback
  const spFeedback = document.getElementById("standFeedbackMsg");
  // (set externally via setStandFeedback)

  renderAbilityButtons();
  renderDarbyConfidenceBar();
  renderSoulChipsStrip();
}

export function setStandFeedback(text) {
  const el = document.getElementById("standFeedbackMsg");
  if (el) el.textContent = text;
}

/* ---------------------------------------------------------------
   Data Structures Inspector Panel
   --------------------------------------------------------------- */
export function updateInspectorPanel() {
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

  setEl("dsCurrentState",       stateMachine.currentState);
  setEl("dsPrevState",          stateMachine.previousState);
  setEl("dsAllowedTransitions", stateMachine.getAllowedNextStates().join(", ") || "NONE");
  setEl("dsDeckLen",            deck.length);
  setEl("dsDiscardLen",         discardPile.length);
  setEl("dsJotaroHandLen",      jotaroHand.length);
  setEl("dsDarbyHandLen",       darbyHand.length);
  setEl("dsNotesLen",           evidenceNotes.length);
  setEl("dsDealQueueSize",      dealQueue.size());

  const nextDeal = dealQueue.peek();
  setEl("dsDealQueuePeek", nextDeal ? `${nextDeal.target}:${nextDeal.card.id}` : "EMPTY");
  setEl("dsDialogueQueueSize", dialogueQueue.size());

  const pol = soulChipsMap.get("POLNAREFF");
  const jos = soulChipsMap.get("JOSEPH");
  setEl("dsPolnareffState", pol ? pol.status : "N/A");
  setEl("dsJosephState",    jos ? jos.status : "N/A");

  let held = 0, saved = 0;
  soulChipsMap.forEach(c => { if (c.status === "RECOVERED") saved++; else held++; });
  setEl("dsSoulsSummary", `${held} Held / ${saved} Saved`);

  setEl("dsAiConfidence",  darbyAI.confidence);
  setEl("dsAiDoubt",       darbyAI.doubt);
  setEl("dsAiSuspicion",   darbyAI.suspicion);
  setEl("dsAiCheatFlags",  `${darbyAI.cheatDetected} / ${darbyAI.cheatExposed}`);
  setEl("dsAiFinalFlags",  `${darbyAI.keptCardsHidden} / ${darbyAI.stuntSucceeded}`);

  const liveBluff = calculateFinalBluffStrength(GameData.finalRaiseLevel || 3);
  setEl("dsAiBluffScore", `${liveBluff} / 65`);

  const stackArr = eventHistoryStack.toArray();
  setEl("dsStackSize", `${stackArr.length} items`);
  const stackContainer = document.getElementById("dsStackList");
  if (stackContainer) {
    stackContainer.innerHTML = "";
    stackArr.slice(0, 14).forEach(entry => {
      const div = document.createElement("div");
      div.className = "ds-stack-item";
      div.textContent = entry;
      stackContainer.appendChild(div);
    });
  }
}

/* ---------------------------------------------------------------
   Master update — call after any state change
   --------------------------------------------------------------- */
export function updateAllUI(onCardClick) {
  renderHUD();
  renderTableCards(onCardClick);
  updateInspectorPanel();
}
