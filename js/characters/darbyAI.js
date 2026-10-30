/**
 * darbyAI.js — D'Arby's Psychological AI Decision Engine
 *
 * Handles confidence/doubt/suspicion decisions for regular hands
 * and the deterministic bluff-strength calculator for the Final Showdown.
 */
import { darbyAI, darbyHand } from "../state.js";
import { evaluatePokerHand } from "../cards/pokerEvaluator.js";

/**
 * AI Decision Engine for Regular Hands (Hand 1 & Hand 2).
 * @param {number} raiseSize - The bet amount Jotaro placed
 * @returns {"FOLD"|"CALL"|"RAISE"}
 */
export function decideRegularHandAction(raiseSize) {
  const evalResult = evaluatePokerHand(darbyHand);
  darbyAI.handStrength = evalResult.categoryRank;

  const resolveScore =
    (darbyAI.handStrength * 12) +
    (darbyAI.confidence   * 0.45) -
    (darbyAI.doubt        * 0.35) -
    (raiseSize > 200 ? 14 : 0);

  if (resolveScore < 42 && darbyAI.handStrength <= 2 && raiseSize >= 200) return "FOLD";
  if (resolveScore >= 78 && darbyAI.handStrength >= 3) return "RAISE";
  return "CALL";
}

/**
 * Deterministic Bluff Score Calculator for the Final Showdown.
 * D'Arby holds Four Kings (categoryRank = 8).
 * Call Threshold = 65. Scores above threshold → D'Arby folds.
 *
 * @param {number} raiseLevel - 1 = Cautious, 2 = All-In Chips, 3 = Soul & DIO Secret
 * @returns {number} Bluff score (0–120)
 */
export function calculateFinalBluffStrength(raiseLevel) {
  let score = 0;

  // 1. Keeping cards face-down creates massive psychological pressure
  score += darbyAI.keptCardsHidden ? 32 : 5;

  // 2. Successful Star Platinum speed demonstration
  if (darbyAI.stuntSucceeded)  score += 34;

  // 3. Earlier cheating detection & exposure
  if (darbyAI.cheatDetected)   score += 10;
  if (darbyAI.cheatExposed)    score += 12;

  // 4. Size and audacity of the final raise
  if      (raiseLevel === 3) score += 30; // Souls + DIO's secret
  else if (raiseLevel === 2) score += 16; // All-in chips
  else if (raiseLevel === 1) score +=  5; // Small raise

  // 5. Accumulated doubt vs remaining confidence
  score += Math.round((darbyAI.doubt - darbyAI.confidence) * 0.15);

  return Math.max(0, Math.min(120, score));
}

/** Returns a context-sensitive advisory string for Avdol's insight. */
export function getAvdolAdvice(state) {
  const psych = darbyAI.getPsychStateLabel();

  if (state === "FIRST_HAND" && darbyAI.cheatDetected && !darbyAI.cheatExposed) {
    return "\u201cNow you know how he dealt. Keep that in mind before trusting the strength of his hand.\u201d";
  }
  if (psych === "DESPERATE" || darbyAI.doubt >= 60) {
    return "\u201cHe\u2019s losing his composure. One more decisive move might be enough.\u201d";
  }
  if (psych === "SHAKEN" || psych === "UNEASY") {
    return "\u201cHe\u2019s watching your expression rather than the cards. Something has unsettled him.\u201d";
  }
  if (state === "FINAL_SHOWDOWN") {
    return "\u201cLook at him. He\u2019s far too relaxed with his own cards\u2014you cannot beat him with ordinary poker. Use pure psychological terror!\u201d";
  }
  return "\u201cLook at him. He\u2019s far too relaxed. He believes he has the advantage.\u201d";
}
