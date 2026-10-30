/**
 * deck.js — Card Creation, Shuffling, and Dealing
 *
 * Data Structures used here:
 *  - Dynamic Array (deck, discardPile, hands)
 *  - Map (rankValueMap) for O(1) rank → integer lookups
 */

export const SUITS = [
  { code: "S", symbol: "♠", color: "black", name: "Spades" },
  { code: "H", symbol: "♥", color: "red",   name: "Hearts" },
  { code: "D", symbol: "♦", color: "red",   name: "Diamonds" },
  { code: "C", symbol: "♣", color: "black", name: "Clubs" }
];

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/** Map for O(1) rank-to-integer lookups */
export const rankValueMap = new Map([
  ["2", 2],  ["3", 3],  ["4", 4],  ["5", 5],  ["6", 6],
  ["7", 7],  ["8", 8],  ["9", 9],  ["10", 10],
  ["J", 11], ["Q", 12], ["K", 13], ["A", 14]
]);

export const VALUE_TO_RANK_NAME = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace"
};

/**
 * Creates a fresh standard 52-card dynamic array without duplicates.
 * @returns {Array} Array of card objects
 */
export function createStandardDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit.code}`,
        rank,
        value: rankValueMap.get(rank),
        suit: suit.code,
        suitSymbol: suit.symbol,
        color: suit.color
      });
    }
  }
  return deck;
}

/**
 * Fisher–Yates (Knuth) In-Place Shuffle Algorithm — O(n) Time Complexity
 * @param {Array} deckArray - The deck array to shuffle in-place
 * @returns {Array} The shuffled deck
 */
export function shuffleDeckFisherYates(deckArray) {
  for (let i = deckArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deckArray[i];
    deckArray[i] = deckArray[j];
    deckArray[j] = temp;
  }
  return deckArray;
}

/**
 * Pull specific cards from the deck by their IDs.
 * Falls back to deck.pop() if a card is not found (e.g. already removed).
 * @param {string[]} codes - Array of card IDs like ["KS", "AH"]
 * @param {Array} deck - The current deck array (mutated in-place)
 * @returns {Array} Array of pulled card objects
 */
export function pullCardsByCode(codes, deck) {
  const result = [];
  for (const code of codes) {
    const idx = deck.findIndex(c => c.id === code);
    if (idx !== -1) {
      result.push(deck.splice(idx, 1)[0]);
    } else {
      result.push(deck.pop());
    }
  }
  return result;
}
