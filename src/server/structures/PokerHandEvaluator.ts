import { Card } from './RiggedDeckDeque.js';

export type HandCategory =
  | 'HIGH_CARD'
  | 'ONE_PAIR'
  | 'TWO_PAIR'
  | 'THREE_OF_A_KIND'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'
  | 'STRAIGHT_FLUSH'
  | 'ROYAL_FLUSH';

export interface EvaluatedHand {
  category: HandCategory;
  categoryScore: number; // 1..10
  primaryRankValue: number;
  secondaryRankValue: number;
  kickers: number[];
  heapArray: number[];
  description: string;
}

/**
 * Custom Max-Heap Priority Queue for sorting card ranks and kicker tie-breakers.
 */
export class MaxHeap<T> {
  private data: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  public size(): number {
    return this.data.length;
  }

  public isEmpty(): boolean {
    return this.data.length === 0;
  }

  public peek(): T | null {
    return this.data.length > 0 ? this.data[0] : null;
  }

  public insert(val: T): void {
    this.data.push(val);
    this.bubbleUp(this.data.length - 1);
  }

  public extractMax(): T | null {
    if (this.data.length === 0) return null;
    if (this.data.length === 1) return this.data.pop()!;
    const max = this.data[0];
    this.data[0] = this.data.pop()!;
    this.bubbleDown(0);
    return max;
  }

  public toArray(): T[] {
    return [...this.data];
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.comparator(this.data[index], this.data[parentIdx]) > 0) {
        [this.data[index], this.data[parentIdx]] = [this.data[parentIdx], this.data[index]];
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const len = this.data.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let largest = index;

      if (left < len && this.comparator(this.data[left], this.data[largest]) > 0) {
        largest = left;
      }
      if (right < len && this.comparator(this.data[right], this.data[largest]) > 0) {
        largest = right;
      }
      if (largest !== index) {
        [this.data[index], this.data[largest]] = [this.data[largest], this.data[index]];
        index = largest;
      } else {
        break;
      }
    }
  }
}

/**
 * 5-Card Draw Poker Evaluator using Frequency Hash Tables and Max-Heap tie-breakers.
 */
export class PokerHandEvaluator {
  public static evaluate(cards: Card[]): EvaluatedHand {
    if (!cards || cards.length !== 5) {
      return {
        category: 'HIGH_CARD',
        categoryScore: 1,
        primaryRankValue: 0,
        secondaryRankValue: 0,
        kickers: [],
        heapArray: [],
        description: 'Incomplete Hand'
      };
    }

    // 1. Build Frequency Hash Tables
    const rankCounts: Record<number, number> = {};
    const suitCounts: Record<string, number> = {};
    const heap = new MaxHeap<number>((a, b) => a - b);

    for (const c of cards) {
      rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
      if (c.suit !== 'HIDDEN') {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
      }
      heap.insert(c.value);
    }

    const uniqueRanksDesc = Object.keys(rankCounts)
      .map(Number)
      .sort((a, b) => b - a);

    const isFlush = Object.values(suitCounts).some(count => count === 5);

    // Straight check
    let isStraight = false;
    let straightHigh = 0;
    if (uniqueRanksDesc.length === 5) {
      if (uniqueRanksDesc[0] - uniqueRanksDesc[4] === 4) {
        isStraight = true;
        straightHigh = uniqueRanksDesc[0];
      } else if (
        uniqueRanksDesc[0] === 14 && // Ace-low straight (A, 5, 4, 3, 2)
        uniqueRanksDesc[1] === 5 &&
        uniqueRanksDesc[2] === 4 &&
        uniqueRanksDesc[3] === 3 &&
        uniqueRanksDesc[4] === 2
      ) {
        isStraight = true;
        straightHigh = 5;
      }
    }

    const heapArray = heap.toArray();

    // Royal Flush
    if (isFlush && isStraight && straightHigh === 14) {
      return {
        category: 'ROYAL_FLUSH',
        categoryScore: 10,
        primaryRankValue: 14,
        secondaryRankValue: 0,
        kickers: [],
        heapArray,
        description: 'Royal Flush (A-K-Q-J-10 suited)'
      };
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return {
        category: 'STRAIGHT_FLUSH',
        categoryScore: 9,
        primaryRankValue: straightHigh,
        secondaryRankValue: 0,
        kickers: [],
        heapArray,
        description: `Straight Flush (${straightHigh} high)`
      };
    }

    // Four of a Kind
    const fourRank = uniqueRanksDesc.find(r => rankCounts[r] === 4);
    if (fourRank) {
      const kicker = uniqueRanksDesc.find(r => r !== fourRank) || 0;
      return {
        category: 'FOUR_OF_A_KIND',
        categoryScore: 8,
        primaryRankValue: fourRank,
        secondaryRankValue: 0,
        kickers: [kicker],
        heapArray,
        description: `Four of a Kind (${this.formatRank(fourRank)}s)`
      };
    }

    // Full House (Three + Two)
    const threeRank = uniqueRanksDesc.find(r => rankCounts[r] === 3);
    const pairRanks = uniqueRanksDesc.filter(r => rankCounts[r] === 2);
    if (threeRank && pairRanks.length > 0) {
      return {
        category: 'FULL_HOUSE',
        categoryScore: 7,
        primaryRankValue: threeRank,
        secondaryRankValue: pairRanks[0],
        kickers: [],
        heapArray,
        description: `Full House (${this.formatRank(threeRank)}s full of ${this.formatRank(pairRanks[0])}s)`
      };
    }

    // Flush
    if (isFlush) {
      return {
        category: 'FLUSH',
        categoryScore: 6,
        primaryRankValue: uniqueRanksDesc[0],
        secondaryRankValue: 0,
        kickers: uniqueRanksDesc.slice(1),
        heapArray,
        description: `Flush (${this.formatRank(uniqueRanksDesc[0])} high)`
      };
    }

    // Straight
    if (isStraight) {
      return {
        category: 'STRAIGHT',
        categoryScore: 5,
        primaryRankValue: straightHigh,
        secondaryRankValue: 0,
        kickers: [],
        heapArray,
        description: `Straight (${this.formatRank(straightHigh)} high)`
      };
    }

    // Three of a Kind
    if (threeRank) {
      const kickers = uniqueRanksDesc.filter(r => r !== threeRank);
      return {
        category: 'THREE_OF_A_KIND',
        categoryScore: 4,
        primaryRankValue: threeRank,
        secondaryRankValue: 0,
        kickers,
        heapArray,
        description: `Three of a Kind (${this.formatRank(threeRank)}s)`
      };
    }

    // Two Pair
    if (pairRanks.length >= 2) {
      const kicker = uniqueRanksDesc.find(r => r !== pairRanks[0] && r !== pairRanks[1]) || 0;
      return {
        category: 'TWO_PAIR',
        categoryScore: 3,
        primaryRankValue: pairRanks[0],
        secondaryRankValue: pairRanks[1],
        kickers: [kicker],
        heapArray,
        description: `Two Pair (${this.formatRank(pairRanks[0])}s & ${this.formatRank(pairRanks[1])}s)`
      };
    }

    // One Pair
    if (pairRanks.length === 1) {
      const kickers = uniqueRanksDesc.filter(r => r !== pairRanks[0]);
      return {
        category: 'ONE_PAIR',
        categoryScore: 2,
        primaryRankValue: pairRanks[0],
        secondaryRankValue: 0,
        kickers,
        heapArray,
        description: `One Pair (${this.formatRank(pairRanks[0])}s)`
      };
    }

    // High Card
    return {
      category: 'HIGH_CARD',
      categoryScore: 1,
      primaryRankValue: uniqueRanksDesc[0],
      secondaryRankValue: 0,
      kickers: uniqueRanksDesc.slice(1),
      heapArray,
      description: `High Card (${this.formatRank(uniqueRanksDesc[0])})`
    };
  }

  /**
   * Compare two evaluated hands: returns > 0 if A wins, < 0 if B wins, 0 if tie
   */
  public static compare(a: EvaluatedHand, b: EvaluatedHand): number {
    if (a.categoryScore !== b.categoryScore) {
      return a.categoryScore - b.categoryScore;
    }
    if (a.primaryRankValue !== b.primaryRankValue) {
      return a.primaryRankValue - b.primaryRankValue;
    }
    if (a.secondaryRankValue !== b.secondaryRankValue) {
      return a.secondaryRankValue - b.secondaryRankValue;
    }
    for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
      const kA = a.kickers[i] || 0;
      const kB = b.kickers[i] || 0;
      if (kA !== kB) return kA - kB;
    }
    return 0;
  }

  private static formatRank(val: number): string {
    if (val === 14) return 'Ace';
    if (val === 13) return 'King';
    if (val === 12) return 'Queen';
    if (val === 11) return 'Jack';
    return String(val);
  }
}
