export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit | 'HIDDEN';
  rank: Rank | '?';
  value: number; // 2..14
  isMarked?: boolean;
}

export class CardNode {
  public id: string;
  public suit: Suit;
  public rank: Rank;
  public value: number;
  public isMarked: boolean;
  public prev: CardNode | null = null;
  public next: CardNode | null = null;

  constructor(card: { id: string; suit: Suit; rank: Rank; value: number; isMarked?: boolean }) {
    this.id = card.id;
    this.suit = card.suit;
    this.rank = card.rank;
    this.value = card.value;
    this.isMarked = !!card.isMarked;
  }

  toCard(): Card {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      value: this.value,
      isMarked: this.isMarked
    };
  }
}

export interface DeckTelemetry {
  size: number;
  headId: string | null;
  tailId: string | null;
  secondId: string | null;
  tampered: boolean;
  markedCardsCount: number;
  recentDealAction: string;
  // Node pointer topology for visualization (redacted card ranks/suits unless revealed)
  nodesTopology: Array<{
    id: string;
    prevId: string | null;
    nextId: string | null;
    isMarked: boolean;
    position: 'HEAD' | 'SECOND' | 'INTERNAL' | 'TAIL';
  }>;
}

export class RiggedDeckDeque {
  private head: CardNode | null = null;
  private tail: CardNode | null = null;
  private _size: number = 0;
  public tampered: boolean = false;
  public lastDealType: 'FAIR' | 'BOTTOM' | 'SECOND' | 'TAMPERED_DEAL' | 'NONE' = 'NONE';

  constructor() {
    this.reset();
  }

  public get size(): number {
    return this._size;
  }

  public isEmpty(): boolean {
    return this._size === 0;
  }

  public clear(): void {
    this.head = null;
    this.tail = null;
    this._size = 0;
    this.tampered = false;
    this.lastDealType = 'NONE';
  }

  public insertFirst(node: CardNode): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    } else {
      this.tail = node;
    }
    this.head = node;
    this._size++;
  }

  public insertLast(node: CardNode): void {
    node.next = null;
    node.prev = this.tail;
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }
    this.tail = node;
    this._size++;
  }

  /**
   * dealFair(): O(1) removal at head
   */
  public dealFair(): Card {
    if (!this.head) throw new Error('Deck underflow: Deck is empty');
    const node = this.head;
    this.head = node.next;
    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }
    this._size--;
    node.next = null;
    node.prev = null;
    this.lastDealType = 'FAIR';
    return node.toCard();
  }

  /**
   * dealBottom(): O(1) removal at tail (D'Arby's signature bottom-deal cheat)
   */
  public dealBottom(): Card {
    if (!this.tail) throw new Error('Deck underflow: Deck is empty');
    const node = this.tail;
    this.tail = node.prev;
    if (this.tail) {
      this.tail.next = null;
    } else {
      this.head = null;
    }
    this._size--;
    node.next = null;
    node.prev = null;
    this.lastDealType = 'BOTTOM';
    return node.toCard();
  }

  /**
   * dealSecond(): O(1) pointer bypass removing head.next
   */
  public dealSecond(): Card {
    if (!this.head || !this.head.next) {
      // Fallback to dealFair if only 1 card exists
      return this.dealFair();
    }
    const second = this.head.next;
    const third = second.next;

    this.head.next = third;
    if (third) {
      third.prev = this.head;
    } else {
      this.tail = this.head;
    }
    this._size--;
    second.next = null;
    second.prev = null;
    this.lastDealType = 'SECOND';
    return second.toCard();
  }

  /**
   * starPlatinumTamper(): O(1) pointer swap between head/second and tail
   * Star Platinum moves faster than human perception, swapping D'Arby's stacked
   * bottom card to the top so D'Arby unwittingly deals his winning hand to Jotaro!
   */
  public starPlatinumTamper(): boolean {
    if (this._size < 3 || !this.head || !this.tail || this.head === this.tail) {
      return false;
    }

    const oldHead = this.head;
    const oldTail = this.tail;

    // Swap head node and tail node pointers
    if (this._size === 2) {
      oldHead.prev = oldTail;
      oldHead.next = null;
      oldTail.prev = null;
      oldTail.next = oldHead;
      this.head = oldTail;
      this.tail = oldHead;
    } else {
      const headNext = oldHead.next;
      const tailPrev = oldTail.prev;

      if (headNext && tailPrev) {
        // Detach oldHead & oldTail
        headNext.prev = oldTail;
        tailPrev.next = oldHead;

        oldTail.next = headNext;
        oldTail.prev = null;

        oldHead.prev = tailPrev;
        oldHead.next = null;

        this.head = oldTail;
        this.tail = oldHead;
      }
    }

    this.tampered = true;
    this.lastDealType = 'TAMPERED_DEAL';
    return true;
  }

  /**
   * Setup standard 52-card deck with stacked bottom for D'Arby's signature setup
   * Kings stacked at tail (dealBottom gives D'Arby 4 Kings),
   * unless Star Platinum tampers with the deck pointers!
   */
  public reset(riggedForDarby: boolean = true): void {
    this.clear();
    const suits: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    const ranks: { rank: Rank; val: number }[] = [
      { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 },
      { rank: '5', val: 5 }, { rank: '6', val: 6 }, { rank: '7', val: 7 },
      { rank: '8', val: 8 }, { rank: '9', val: 9 }, { rank: '10', val: 10 },
      { rank: 'J', val: 11 }, { rank: 'Q', val: 12 }, { rank: 'K', val: 13 },
      { rank: 'A', val: 14 }
    ];

    const cards: CardNode[] = [];
    for (const s of suits) {
      for (const r of ranks) {
        cards.push(new CardNode({
          id: `${r.rank}_${s}`,
          suit: s,
          rank: r.rank,
          value: r.val,
          isMarked: (r.rank === 'K' || r.rank === 'A') && riggedForDarby
        }));
      }
    }

    // Shuffle non-rigged cards
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    if (riggedForDarby) {
      // D'Arby stacks four Kings and the Ace of Spades at the bottom (tail)
      const stackedIndices: number[] = [];
      cards.forEach((c, idx) => {
        if (c.rank === 'K' || (c.rank === 'A' && c.suit === 'SPADES')) stackedIndices.push(idx);
      });
      // Extract stacked cards
      const stacked: CardNode[] = [];
      for (let i = stackedIndices.length - 1; i >= 0; i--) {
        stacked.push(cards.splice(stackedIndices[i], 1)[0]);
      }
      // Insert regular cards
      for (const c of cards) {
        this.insertLast(c);
      }
      // Sort so Ace of Spades is at the very tail node
      stacked.sort((a, b) => {
        if (a.rank === 'A' && a.suit === 'SPADES') return 1;
        if (b.rank === 'A' && b.suit === 'SPADES') return -1;
        return 0;
      });
      // Insert stacked cards at bottom/tail
      for (const s of stacked) {
        this.insertLast(s);
      }
    } else {
      for (const c of cards) {
        this.insertLast(c);
      }
    }
  }

  /**
   * Sanitized telemetry output for the live UI data structures drawer.
   * Node card IDs are masked unless revealCardIds is true (e.g. cheat intel active or showdown).
   */
  public toTelemetry(revealCardIds: boolean = false): DeckTelemetry {
    let markedCount = 0;
    const nodesTopology: DeckTelemetry['nodesTopology'] = [];
    let curr = this.head;
    let idx = 0;

    while (curr) {
      if (curr.isMarked) markedCount++;
      let pos: 'HEAD' | 'SECOND' | 'INTERNAL' | 'TAIL' = 'INTERNAL';
      if (curr === this.head) pos = 'HEAD';
      else if (curr === this.head?.next) pos = 'SECOND';
      else if (curr === this.tail) pos = 'TAIL';

      const nodeId = revealCardIds ? curr.id : `NODE_${idx}`;
      const prevId = curr.prev ? (revealCardIds ? curr.prev.id : `NODE_${idx - 1}`) : null;
      const nextId = curr.next ? (revealCardIds ? curr.next.id : `NODE_${idx + 1}`) : null;

      nodesTopology.push({
        id: nodeId,
        prevId,
        nextId,
        isMarked: revealCardIds ? curr.isMarked : false,
        position: pos
      });
      curr = curr.next;
      idx++;
    }

    return {
      size: this._size,
      headId: this.head ? (revealCardIds ? this.head.id : 'NODE_HEAD') : null,
      tailId: this.tail ? (revealCardIds ? this.tail.id : 'NODE_TAIL') : null,
      secondId: this.head?.next ? (revealCardIds ? this.head.next.id : 'NODE_SECOND') : null,
      tampered: this.tampered,
      markedCardsCount: revealCardIds ? markedCount : 0,
      recentDealAction: this.lastDealType,
      nodesTopology: nodesTopology.slice(0, 16)
    };
  }
}
