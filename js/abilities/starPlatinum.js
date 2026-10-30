/**
 * starPlatinum.js — Star Platinum Timing Ability
 *
 * Manages two timing windows:
 *   A) OPENING_CHEAT — detecting D'Arby's bottom deal
 *   B) FINAL_STUNT   — psychological precision demonstration
 *
 * Emits events via callbacks to avoid circular imports with gameFlow.js.
 */
import {
  GameData, darbyAI, stateMachine,
  eventHistoryStack, dealQueue,
  jotaroHand, darbyHand,
  setJotaroHand, setDarbyHand
} from "../state.js";
import { flashStandFreezeEffect, setStandFeedback } from "../ui/render.js";
import { setDialogue } from "../ui/dialogue.js";

/** Callbacks set by gameFlow.js to avoid circular imports */
let _onCheatCaught    = null;
let _onFinalStuntDone = null;

export function registerStarPlatinumCallbacks({ onCheatCaught, onFinalStuntDone }) {
  _onCheatCaught    = onCheatCaught;
  _onFinalStuntDone = onFinalStuntDone;
}

/* ------------------------------------------------------------------
   Opening Deal Timing Animation
   ------------------------------------------------------------------ */
export function runOpeningDealTimingAnimation() {
  GameData.timingActive  = true;
  GameData.timingMode    = "OPENING_CHEAT";
  GameData.timingProgress = 0;

  const wrapper = document.getElementById("timingGaugeWrapper");
  const cursor  = document.getElementById("timingCursor");
  const zoneText = document.getElementById("timingZoneIndicator");
  const deckEl  = document.getElementById("visualDeckStack");
  const spBtn   = document.getElementById("btnStarPlatinum");

  if (wrapper) {
    document.getElementById("timingGaugeTitle").textContent =
      "⚡ OPENING DEAL — WATCH FOR D'ARBY'S BOTTOM DEAL!";
    wrapper.classList.add("visible");
  }

  const totalDurationMs = 4600;
  const startTime = performance.now();
  let lastDealtStep = 0;

  function step(now) {
    if (!GameData.timingActive) return;
    const elapsed = now - startTime;
    const pct = Math.min(100, (elapsed / totalDurationMs) * 100);
    GameData.timingProgress = pct;
    if (cursor) cursor.style.left = `calc(${pct}% - 3px)`;

    // Deal cards progressively from dealQueue
    const targetStep = Math.min(10, Math.floor(pct / 9.2));
    while (lastDealtStep < targetStep && !dealQueue.isEmpty()) {
      const nextDeal = dealQueue.dequeue();
      if (nextDeal.target === "JOTARO") jotaroHand.push(nextDeal.card);
      else                              darbyHand.push(nextDeal.card);
      lastDealtStep++;

      // Lazy import of renderTableCards to avoid hoisting cycle
      import("../ui/render.js").then(({ renderTableCards, updateInspectorPanel }) => {
        renderTableCards();
        updateInspectorPanel();
      });
    }

    // Visual cues inside sweet spot (43%–76%)
    if (pct >= 43 && pct <= 76) {
      if (deckEl) deckEl.classList.add("cheating-motion");
      if (spBtn)  spBtn.classList.add("window-ready");
      if (zoneText) { zoneText.textContent = "🔥 SUSPICIOUS BOTTOM SLIDE! PRESS [SPACE] NOW!"; zoneText.style.color = "#f5c542"; }
    } else {
      if (deckEl) deckEl.classList.remove("cheating-motion");
      if (spBtn)  spBtn.classList.remove("window-ready");
      if (zoneText) { zoneText.textContent = pct < 43 ? "Wait for suspicious finger motion..." : "Motion passed!"; zoneText.style.color = "#cbd5e1"; }
    }

    if (pct < 100) {
      GameData.timingRafId = requestAnimationFrame(step);
    } else {
      finishOpeningDealWithoutCatch();
    }
  }

  GameData.timingRafId = requestAnimationFrame(step);
}

export function finishOpeningDealWithoutCatch() {
  while (!dealQueue.isEmpty()) {
    const next = dealQueue.dequeue();
    if (next.target === "JOTARO") jotaroHand.push(next.card);
    else                          darbyHand.push(next.card);
  }
  stopTimingWindow();
  if (_onCheatCaught) _onCheatCaught(false, 0);
}

/* ------------------------------------------------------------------
   Final Showdown Stunt Window
   ------------------------------------------------------------------ */
export function runFinalShowdownStuntAnimation() {
  GameData.timingActive  = true;
  GameData.timingMode    = "FINAL_STUNT";
  GameData.timingProgress = 0;
  GameData.timingAttemptedThisWindow = false;

  const wrapper  = document.getElementById("timingGaugeWrapper");
  const cursor   = document.getElementById("timingCursor");
  const zoneText = document.getElementById("timingZoneIndicator");
  const spBtn    = document.getElementById("btnStarPlatinum");

  if (wrapper) {
    document.getElementById("timingGaugeTitle").textContent =
      "⚡ FINAL SHOWDOWN — STAR PLATINUM PSYCHOLOGICAL DEMONSTRATION!";
    wrapper.classList.add("visible");
  }

  const totalDurationMs = 4200;
  const startTime = performance.now();

  function step(now) {
    if (!GameData.timingActive) return;
    const elapsed = now - startTime;
    const pct = Math.min(100, (elapsed / totalDurationMs) * 100);
    GameData.timingProgress = pct;
    if (cursor) cursor.style.left = `calc(${pct}% - 3px)`;

    if (pct >= 43 && pct <= 76) {
      if (spBtn)    spBtn.classList.add("window-ready");
      if (zoneText) { zoneText.textContent = "🔥 D'ARBY BLINKED! PRESS [SPACE] NOW!"; zoneText.style.color = "#f5c542"; }
    } else {
      if (spBtn)    spBtn.classList.remove("window-ready");
      if (zoneText) { zoneText.textContent = pct < 43 ? "Wait for D'Arby's blink..." : "Moment passing!"; zoneText.style.color = "#cbd5e1"; }
    }

    if (pct < 100) {
      GameData.timingRafId = requestAnimationFrame(step);
    } else {
      stopTimingWindow();
      if (_onFinalStuntDone) _onFinalStuntDone();
    }
  }

  GameData.timingRafId = requestAnimationFrame(step);
}

/* ------------------------------------------------------------------
   Main Activation Handler (SPACE / button)
   ------------------------------------------------------------------ */
import { SoundFX } from "../systems/soundFX.js";

export function handleStarPlatinumActivation() {
  if (GameData.starPlatinumCharges <= 0) {
    setStandFeedback("No Star Platinum charges remaining!");
    SoundFX.standFail();
    return;
  }
  if (!GameData.timingActive) {
    setStandFeedback("Wait for an active timing window!");
    return;
  }
  if (GameData.timingAttemptedThisWindow) {
    setStandFeedback("Star Platinum was already used in this window!");
    return;
  }

  GameData.timingAttemptedThisWindow = true;
  GameData.starPlatinumCharges--;
  const pct = GameData.timingProgress;

  if (GameData.timingMode === "OPENING_CHEAT") {
    stopTimingWindow();
    if (pct < 43) {
      SoundFX.standFail();
      setStandFeedback("⚠️ Too early — Star Platinum saw nothing useful.");
      setDialogue("STAR PLATINUM", '"Star Platinum returned too soon. You saw nothing useful."');
      eventHistoryStack.push(`[STAND] Opening Detection FAILED (Too Early at ${Math.round(pct)}%).`);
      // flush remaining cards then proceed without catch
      while (!dealQueue.isEmpty()) {
        const next = dealQueue.dequeue();
        if (next.target === "JOTARO") jotaroHand.push(next.card);
        else                          darbyHand.push(next.card);
      }
      if (_onCheatCaught) _onCheatCaught(false, pct);
    } else if (pct > 76) {
      SoundFX.standFail();
      setStandFeedback("⚠️ Too late — his hand already moved.");
      setDialogue("STAR PLATINUM", '"Too late! His hand has already moved."');
      eventHistoryStack.push(`[STAND] Opening Detection FAILED (Too Late at ${Math.round(pct)}%).`);
      while (!dealQueue.isEmpty()) {
        const next = dealQueue.dequeue();
        if (next.target === "JOTARO") jotaroHand.push(next.card);
        else                          darbyHand.push(next.card);
      }
      if (_onCheatCaught) _onCheatCaught(false, pct);
    } else {
      // CAUGHT in sweet spot!
      while (!dealQueue.isEmpty()) {
        const next = dealQueue.dequeue();
        if (next.target === "JOTARO") jotaroHand.push(next.card);
        else                          darbyHand.push(next.card);
      }
      SoundFX.standSuccess();
      flashStandFreezeEffect();
      if (_onCheatCaught) _onCheatCaught(true, pct);
    }

  } else if (GameData.timingMode === "FINAL_STUNT") {
    stopTimingWindow();
    if (pct < 43) {
      SoundFX.standFail();
      setStandFeedback("⚠️ Too early — D'Arby wasn't focused on you yet.");
      setDialogue("JOTARO KUJO", "(Too early! D'Arby wasn't focusing on your hands yet — no effect.)");
      eventHistoryStack.push(`[STAND] Final Stunt FAILED (Too Early at ${Math.round(pct)}%).`);
    } else if (pct > 76) {
      SoundFX.standFail();
      setStandFeedback("⚠️ Too late — the moment passed.");
      setDialogue("JOTARO KUJO", "(The moment passed before Star Platinum acted — no effect.)");
      eventHistoryStack.push(`[STAND] Final Stunt FAILED (Too Late at ${Math.round(pct)}%).`);
    } else {
      SoundFX.standSuccess();
      flashStandFreezeEffect();
      darbyAI.stuntSucceeded = true;
      darbyAI.doubt        += 35;
      darbyAI.confidence   -= 24;
      darbyAI.suspicion    += 30;
      darbyAI.clampMetrics();
      setStandFeedback("★ PRECISION DEMONSTRATION! D'Arby's doubt skyrocketed!");
      setDialogue("DANIEL J. D'ARBY",
        '"W-What?! When did Jotaro light a cigarette and pour juice?! I didn\'t even see his finger twitch! Could Star Platinum have SWAPPED his cards?!"');
      eventHistoryStack.push(`[STAND] Final Stunt SUCCEEDED at ${Math.round(pct)}%! Doubt +35.`);
    }
    if (_onFinalStuntDone) _onFinalStuntDone();
  }

  import("../ui/render.js").then(({ updateAllUI }) => updateAllUI());
}

/* ------------------------------------------------------------------
   Utility
   ------------------------------------------------------------------ */
export function stopTimingWindow() {
  if (GameData.timingRafId) {
    cancelAnimationFrame(GameData.timingRafId);
    GameData.timingRafId = null;
  }
  GameData.timingActive = false;
  const wrapper = document.getElementById("timingGaugeWrapper");
  const spBtn   = document.getElementById("btnStarPlatinum");
  const deckEl  = document.getElementById("visualDeckStack");
  if (wrapper) wrapper.classList.remove("visible");
  if (spBtn)   spBtn.classList.remove("window-ready");
  if (deckEl)  deckEl.classList.remove("cheating-motion");
}
