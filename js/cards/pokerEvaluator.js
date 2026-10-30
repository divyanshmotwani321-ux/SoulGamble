/**
 * pokerEvaluator.js — Genuine 5-Card Poker Hand Evaluator
 *
 * Supports all 10 rankings from Royal Flush (10) down to High Card (1),
 * including Ace-low straights (A-2-3-4-5) and exact lexicographical tie-breakers.
 *
 * Data Structures used: Map (frequency counting), Arrays (sorting, grouping)
 */
import { VALUE_TO_RANK_NAME } from "./deck.js";

/**
 * Evaluates a 5-card poker hand.
 * @param {Array} cards - Array of card objects with a numeric `value` property
 * @returns {{ categoryRank: number, categoryName: string, tieBreakers: number[], description: string }}
 */
export function evaluatePokerHand(cards) {
  if (!cards || cards.length < 5) {
    return { categoryRank: 0, categoryName: "Incomplete", tieBreakers: [0], description: "Incomplete Hand" };
  }

  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits  = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = true;
  for (let i = 0; i < 4; i++) {
    if (values[i] - 1 !== values[i + 1]) { isStraight = false; break; }
  }

  let straightHigh = values[0];
  // Ace-low straight: A-5-4-3-2
  if (!isStraight && values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }

  // Count rank frequencies
  const freqMap = new Map();
  for (const v of values) {
    freqMap.set(v, (freqMap.get(v) || 0) + 1);
  }

  const groups = Array.from(freqMap.entries())
    .map(([val, count]) => ({ val, count }))
    .sort((a, b) => b.count !== a.count ? b.count - a.count : b.val - a.val);

  const countsPattern = groups.map(g => g.count).join(",");
  const tieBreakers  = groups.map(g => g.val);

  if (isFlush && isStraight && straightHigh === 14)
    return { categoryRank: 10, categoryName: "Royal Flush", tieBreakers: [14], description: "Royal Flush" };

  if (isFlush && isStraight)
    return { categoryRank: 9, categoryName: "Straight Flush", tieBreakers: [straightHigh],
             description: `Straight Flush (${VALUE_TO_RANK_NAME[straightHigh]} High)` };

  if (countsPattern === "4,1")
    return { categoryRank: 8, categoryName: "Four of a Kind", tieBreakers,
             description: `Four of a Kind (${VALUE_TO_RANK_NAME[groups[0].val]}s)` };

  if (countsPattern === "3,2")
    return { categoryRank: 7, categoryName: "Full House", tieBreakers,
             description: `Full House (${VALUE_TO_RANK_NAME[groups[0].val]}s full of ${VALUE_TO_RANK_NAME[groups[1].val]}s)` };

  if (isFlush)
    return { categoryRank: 6, categoryName: "Flush", tieBreakers: values,
             description: `Flush (${VALUE_TO_RANK_NAME[values[0]]} High)` };

  if (isStraight)
    return { categoryRank: 5, categoryName: "Straight", tieBreakers: [straightHigh],
             description: `Straight (${VALUE_TO_RANK_NAME[straightHigh]} High)` };

  if (countsPattern === "3,1,1")
    return { categoryRank: 4, categoryName: "Three of a Kind", tieBreakers,
             description: `Three of a Kind (${VALUE_TO_RANK_NAME[groups[0].val]}s)` };

  if (countsPattern === "2,2,1")
    return { categoryRank: 3, categoryName: "Two Pair", tieBreakers,
             description: `Two Pair (${VALUE_TO_RANK_NAME[groups[0].val]}s & ${VALUE_TO_RANK_NAME[groups[1].val]}s)` };

  if (countsPattern === "2,1,1,1")
    return { categoryRank: 2, categoryName: "One Pair", tieBreakers,
             description: `One Pair of ${VALUE_TO_RANK_NAME[groups[0].val]}s` };

  return { categoryRank: 1, categoryName: "High Card", tieBreakers: values,
           description: `High Card (${VALUE_TO_RANK_NAME[values[0]]})` };
}

/**
 * Compares two 5-card hands with correct tie-breakers.
 * @returns {1|0|-1} 1 if handA wins, -1 if handB wins, 0 if exact tie
 */
export function comparePokerHands(handA, handB) {
  const evalA = evaluatePokerHand(handA);
  const evalB = evaluatePokerHand(handB);

  if (evalA.categoryRank !== evalB.categoryRank) {
    return evalA.categoryRank > evalB.categoryRank ? 1 : -1;
  }
  const len = Math.max(evalA.tieBreakers.length, evalB.tieBreakers.length);
  for (let i = 0; i < len; i++) {
    const valA = evalA.tieBreakers[i] || 0;
    const valB = evalB.tieBreakers[i] || 0;
    if (valA !== valB) return valA > valB ? 1 : -1;
  }
  return 0;
}
