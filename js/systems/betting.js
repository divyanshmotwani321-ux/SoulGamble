/**
 * betting.js — Bet Resolution, Pot Management, Chip Transfers
 *
 * Handles fold, call, raise for Hand 1 & Hand 2 and resolves
 * the poker showdown using the genuine evaluator.
 */
import {
  GameData, darbyAI, stateMachine,
  eventHistoryStack, soulChipsMap,
  discardPile, deck,
  jotaroHand, darbyHand,
  setJotaroHand, setDarbyHand, setDiscardPile
} from "../state.js";
import { evaluatePokerHand, comparePokerHands } from "../cards/pokerEvaluator.js";
import { decideRegularHandAction } from "../characters/darbyAI.js";
import { setDialogue } from "../ui/dialogue.js";
import { SoundFX } from "./soundFX.js";

/** Callback to advance to next phase after hand resolves */
let _onHandResolved = null;
export function registerBettingCallback(cb) { _onHandResolved = cb; }

/**
 * Resolves Hand 1 or Hand 2 using the 5-card evaluator.
 * @param {"FOLD"|"CALL"|"RAISE"} playerAction
 * @param {number} betCost
 * @param {"FIRST_HAND"|"SECOND_HAND"} phaseName
 */
export function resolveRegularHandShowdown(playerAction, betCost, phaseName) {
  GameData.handSubStage = "RESOLVED";

  if (playerAction === "FOLD") {
    GameData.darbyChips += GameData.pot;
    eventHistoryStack.push(`[BET] Jotaro FOLDED in ${phaseName}. D'Arby takes ${GameData.pot} chips.`);

    if (phaseName === "FIRST_HAND" && darbyAI.cheatDetected && !darbyAI.cheatExposed) {
      darbyAI.doubt += 12;
      darbyAI.clampMetrics();
      setDialogue("JOTARO KUJO",
        '"I fold. Since I saw you bottom-deal, I\'m not throwing chips into a rigged hand."');
    } else {
      darbyAI.confidence += 6;
      darbyAI.clampMetrics();
      setDialogue("DANIEL J. D'ARBY", '"A cautious fold! That pot is mine, Jotaro."');
    }

    if (phaseName === "SECOND_HAND") {
      const pol = soulChipsMap.get("POLNAREFF");
      pol.status = "HELD BY D'ARBY";
      soulChipsMap.set("POLNAREFF", pol);
    }

    GameData.pot = 0;
    if (_onHandResolved) _onHandResolved(phaseName, "FOLD_LOSS");
    return;
  }

  // Called or Raised
  const actualBet = Math.min(GameData.jotaroChips, betCost);
  GameData.jotaroChips -= actualBet;
  GameData.pot         += actualBet;
  SoundFX.chipBet();

  const aiAction = decideRegularHandAction(betCost);

  // Always reveal Jotaro's cards at showdown
  GameData.jotaroCardsFaceUp = true;
  const jotaroEval = evaluatePokerHand(jotaroHand);
  const darbyEval  = evaluatePokerHand(darbyHand);

  if (aiAction === "FOLD" && playerAction === "RAISE") {
    GameData.jotaroChips += GameData.pot;
    darbyAI.confidence   -= 12;
    darbyAI.doubt        += 14;
    darbyAI.clampMetrics();

    if (phaseName === "SECOND_HAND") {
      const pol = soulChipsMap.get("POLNAREFF");
      pol.status = "RECOVERED";
      soulChipsMap.set("POLNAREFF", pol);
      eventHistoryStack.push("[SOUL MAP] Polnareff's Soul RECOVERED via D'Arby fold!");
    }

    setDialogue("DANIEL J. D'ARBY",
      `"Tch... With a raise like that, I won't risk calling with ${darbyEval.description}. I fold!"`);
    GameData.pot = 0;
    if (_onHandResolved) _onHandResolved(phaseName, "DARBY_FOLD");
    return;
  }

  // D'Arby calls — match chips
  GameData.darbyChips = Math.max(0, GameData.darbyChips - actualBet);
  GameData.pot       += actualBet;

  const cmp = comparePokerHands(jotaroHand, darbyHand);

  if (cmp >= 0) {
    // Jotaro wins
    SoundFX.qteSuccess();
    GameData.jotaroChips += GameData.pot;
    darbyAI.confidence   -= 16;
    darbyAI.doubt        += 16;
    darbyAI.clampMetrics();

    let soulMsg = "";
    if (phaseName === "SECOND_HAND") {
      const pol = soulChipsMap.get("POLNAREFF");
      pol.status = "RECOVERED";
      soulChipsMap.set("POLNAREFF", pol);
      soulMsg = " Polnareff's Soul is RECOVERED!";
      eventHistoryStack.push("[SOUL MAP] Polnareff's Soul → RECOVERED!");
    }

    setDialogue("SHOWDOWN — JOTARO WINS",
      `Jotaro's ${jotaroEval.description} beats D'Arby's ${darbyEval.description}!${soulMsg}`);
    eventHistoryStack.push(`[POKER] Jotaro (${jotaroEval.categoryName}) beat D'Arby (${darbyEval.categoryName}).`);
    GameData.pot = 0;
    if (_onHandResolved) _onHandResolved(phaseName, "JOTARO_WIN");

  } else {
    // D'Arby wins
    SoundFX.standFail();
    GameData.darbyChips += GameData.pot;
    darbyAI.confidence  += 8;
    darbyAI.clampMetrics();

    let soulMsg = "";
    if (phaseName === "SECOND_HAND") {
      const pol = soulChipsMap.get("POLNAREFF");
      pol.status = "HELD BY D'ARBY";
      soulChipsMap.set("POLNAREFF", pol);
      soulMsg = " Polnareff's soul chip remains with D'Arby—win it back in the Final Showdown!";
    }

    setDialogue("SHOWDOWN — D'ARBY WINS",
      `D'Arby's ${darbyEval.description} beats Jotaro's ${jotaroEval.description}.${soulMsg}`);
    eventHistoryStack.push(`[POKER] D'Arby (${darbyEval.categoryName}) beat Jotaro (${jotaroEval.categoryName}).`);
    GameData.pot = 0;
    if (_onHandResolved) _onHandResolved(phaseName, "DARBY_WIN");
  }
}
