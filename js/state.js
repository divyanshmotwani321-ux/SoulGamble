/**
 * state.js — Shared Game State (Single Source of Truth)
 *
 * All modules import from this file. No module should maintain
 * its own parallel copy of critical game state.
 *
 * Data structures:
 *  - GameData plain object for current-round runtime values
 *  - soulChipsMap: Map<string, SoulChip> — O(1) key-value lookup
 *  - Mutable arrays: deck, discardPile, jotaroHand, darbyHand, evidenceNotes
 *  - Queue/Stack instances (imported here, shared everywhere)
 *  - GameStateMachine governs valid phase transitions
 */

import { Queue }   from "./dataStructures/Queue.js";
import { Stack }   from "./dataStructures/Stack.js";

/* ------------------------------------------------------------------
   Finite State Machine
   ------------------------------------------------------------------ */
export class GameStateMachine {
  constructor(eventStack) {
    this.currentState  = "INTRO";
    this.previousState = "NONE";
    this.eventStack    = eventStack;

    /** Directed adjacency list of valid transitions */
    this.transitions = {
      INTRO:             ["CHEATING_SEQUENCE"],
      CHEATING_SEQUENCE: ["EVIDENCE_QTE", "FIRST_HAND"],
      EVIDENCE_QTE:      ["FIRST_HAND"],
      FIRST_HAND:        ["SECOND_HAND"],
      SECOND_HAND:       ["FINAL_SHOWDOWN"],
      FINAL_SHOWDOWN:    ["VICTORY", "DEFEAT", "FINAL_SHOWDOWN"],
      VICTORY:           ["INTRO"],
      DEFEAT:            ["FINAL_SHOWDOWN", "INTRO"]
    };
  }

  canTransition(targetState) {
    return (this.transitions[this.currentState] || []).includes(targetState);
  }

  transitionTo(targetState, reason = "") {
    if (!this.canTransition(targetState) && targetState !== "INTRO") {
      console.warn(`Blocked invalid transition: ${this.currentState} → ${targetState}`);
      return false;
    }
    this.previousState = this.currentState;
    this.currentState  = targetState;
    if (this.eventStack) {
      this.eventStack.push(
        `[STATE] ${this.previousState} → ${this.currentState}${reason ? " (" + reason + ")" : ""}`
      );
    }
    return true;
  }

  getAllowedNextStates() {
    return this.transitions[this.currentState] || [];
  }
}

/* ------------------------------------------------------------------
   Shared Data Structure Instances
   ------------------------------------------------------------------ */
export const eventHistoryStack = new Stack(80);
export const checkpointStack   = new Stack(5);
export const stateMachine      = new GameStateMachine(eventHistoryStack);
export const dealQueue         = new Queue();
export const dialogueQueue     = new Queue();

/* ------------------------------------------------------------------
   Soul Chips — Map-based O(1) lookup (Map Data Structure)
   ------------------------------------------------------------------ */
export const soulChipsMap = new Map();

export function initSoulChipsMap() {
  soulChipsMap.clear();
  soulChipsMap.set("POLNAREFF", {
    id: "POLNAREFF",
    name: "Jean Pierre Polnareff",
    initials: "JPP",
    discClass: "polnareff-disc",
    status: "HELD BY D'ARBY",
    wagerRound: "Hand 2 Stake"
  });
  soulChipsMap.set("JOSEPH", {
    id: "JOSEPH",
    name: "Joseph Joestar",
    initials: "JJ",
    discClass: "joseph-disc",
    status: "HELD BY D'ARBY",
    wagerRound: "Final Showdown Stake"
  });
}

/* ------------------------------------------------------------------
   Dynamic Arrays (Card Arrays)
   ------------------------------------------------------------------ */
export let deck               = [];
export let discardPile        = [];
export let jotaroHand         = [];
export let darbyHand          = [];
export let evidenceNotes      = [];
export let selectedDiscardIndices = [];

/** Replace the deck reference (needed after createStandardDeck) */
export function setDeck(arr)            { deck               = arr; }
export function setDiscardPile(arr)     { discardPile        = arr; }
export function setJotaroHand(arr)      { jotaroHand         = arr; }
export function setDarbyHand(arr)       { darbyHand          = arr; }
export function setEvidenceNotes(arr)   { evidenceNotes      = arr; }
export function setSelectedDiscards(arr){ selectedDiscardIndices = arr; }

/* ------------------------------------------------------------------
   Runtime Game Data
   ------------------------------------------------------------------ */
export const GameData = {
  jotaroChips:  1000,
  darbyChips:   2000,
  pot:          0,
  currentBetToCall: 0,
  jotaroCardsFaceUp: true,
  starPlatinumCharges: 3,
  avdolAvailableThisHand: true,
  dealerIsBoy: false,
  handSubStage: "READY",   // READY | DEALING | EXCHANGE | BETTING | RESOLVED | CARD_CHOICE | FINAL_STUNT_WINDOW | FINAL_BET
  finalRaiseLevel: 0,      // 1=Cautious, 2=All-In Chips, 3=Soul+DIO Secret
  isBusyAnimating: false,

  // Timing Window runtime trackers
  timingActive:           false,
  timingMode:             "NONE",  // "OPENING_CHEAT" | "FINAL_STUNT"
  timingProgress:         0,       // 0–100
  timingRafId:            null,
  timingAttemptedThisWindow: false,

  // QTE runtime trackers
  qteActive:     false,
  qteProgress:   100,
  qteIntervalId: null
};

/* ------------------------------------------------------------------
   D'Arby's Psychological AI Model
   ------------------------------------------------------------------ */
export const darbyAI = {
  confidence:  85,
  doubt:       10,
  suspicion:   15,
  handStrength: 0,
  cheatDetected:  false,
  cheatExposed:   false,
  stuntSucceeded: false,
  keptCardsHidden: false,

  clampMetrics() {
    this.confidence = Math.max(0, Math.min(100, Math.round(this.confidence)));
    this.doubt      = Math.max(0, Math.min(100, Math.round(this.doubt)));
    this.suspicion  = Math.max(0, Math.min(100, Math.round(this.suspicion)));
  },

  getPsychStateLabel() {
    if (this.doubt >= 70 || this.confidence <= 25) return "DESPERATE";
    if (this.doubt >= 45 || this.confidence <= 48) return "SHAKEN";
    if (this.doubt >= 25 || this.confidence <= 68) return "UNEASY";
    return "CALM";
  }
};
