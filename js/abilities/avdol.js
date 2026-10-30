/**
 * avdol.js — Muhammad Avdol's Limited Advice Ability
 */
import { GameData, darbyAI, eventHistoryStack } from "../state.js";
import { getAvdolAdvice } from "../characters/darbyAI.js";
import { stateMachine } from "../state.js";

/** Registers the callback to trigger UI update after Avdol speaks */
let _onAdviceGiven = null;
export function registerAvdolCallback(cb) { _onAdviceGiven = cb; }

export function handleAskAvdol() {
  if (!GameData.avdolAvailableThisHand) return;
  GameData.avdolAvailableThisHand = false;

  const state  = stateMachine.currentState;
  const advice = getAvdolAdvice(state);

  const quoteBox = document.getElementById("avdolQuoteBox");
  if (quoteBox) quoteBox.textContent = advice;

  eventHistoryStack.push(`[AVDOL] Advised in ${state}: ${advice}`);
  if (_onAdviceGiven) _onAdviceGiven();
}
