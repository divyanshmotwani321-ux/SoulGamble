export type TacticalAction =
  | 'BLUFF_RAISE'
  | 'SP_OBSERVE_MISS'
  | 'SP_OBSERVE_HIT'
  | 'DIO_DEMAND'
  | 'BLIND_LOCK'
  | 'PLEDGE_SOUL'
  | 'DECK_TAMPER'
  | 'PHANTOM_STUNT'
  | 'PUBLIC_ACCUSE'
  | 'CHECK'
  | 'CALL'
  | 'FOLD';

export interface QueueTelemetry {
  capacity: 6;
  size: number;
  headIndex: number;
  tailIndex: number;
  buffer: (TacticalAction | null)[];
  recentHistory: TacticalAction[];
  detectedSpamAction: TacticalAction | null;
  threatImmunityBonus: number;
  timingWindowPenalty: number;
}

/**
 * Bounded Circular Queue (capacity = 6) that logs tactical player actions
 * and detects repetitive spam patterns, adapting D'Arby's threat immunity and QTE windows.
 */
export class PlayerPatternQueue {
  private readonly capacity = 6;
  private buffer: (TacticalAction | null)[] = new Array(6).fill(null);
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  public enqueue(action: TacticalAction): { spamDetected: boolean; penalty: number } {
    if (this.count === this.capacity) {
      // Overwrite oldest entry (move head forward in circular buffer)
      this.head = (this.head + 1) % this.capacity;
      this.count--;
    }

    this.buffer[this.tail] = action;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;

    // Check for repetitive spam
    const spamCheck = this.detectSpam();
    return {
      spamDetected: !!spamCheck.action,
      penalty: spamCheck.threatBonus
    };
  }

  public dequeue(): TacticalAction | null {
    if (this.count === 0) return null;
    const item = this.buffer[this.head];
    this.buffer[this.head] = null;
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    return item;
  }

  public size(): number {
    return this.count;
  }

  public isEmpty(): boolean {
    return this.count === 0;
  }

  public isFull(): boolean {
    return this.count === this.capacity;
  }

  public toArray(): TacticalAction[] {
    const list: TacticalAction[] = [];
    let idx = this.head;
    for (let i = 0; i < this.count; i++) {
      const val = this.buffer[idx];
      if (val) list.push(val);
      idx = (idx + 1) % this.capacity;
    }
    return list;
  }

  /**
   * Detects if the player is repeating the same high-impact action (>= 2 times in last 4 actions)
   */
  public detectSpam(): { action: TacticalAction | null; threatBonus: number; timingPenalty: number } {
    const items = this.toArray();
    if (items.length < 3) return { action: null, threatBonus: 0, timingPenalty: 0 };

    const frequency: Partial<Record<TacticalAction, number>> = {};
    for (const act of items) {
      frequency[act] = (frequency[act] || 0) + 1;
    }

    // Check for DIO_DEMAND spam or SP_OBSERVE_MISS spam
    for (const [actionKey, count] of Object.entries(frequency)) {
      const act = actionKey as TacticalAction;
      if (count && count >= 2) {
        if (act === 'DIO_DEMAND') {
          return { action: act, threatBonus: 15 * (count - 1), timingPenalty: 0.15 };
        }
        if (act === 'SP_OBSERVE_MISS') {
          return { action: act, threatBonus: 10, timingPenalty: 0.20 };
        }
        if (act === 'BLUFF_RAISE' && count >= 3) {
          return { action: act, threatBonus: 15, timingPenalty: 0.10 };
        }
      }
    }

    return { action: null, threatBonus: 0, timingPenalty: 0 };
  }

  /**
   * Counts occurrences of a specific tactical action in the most recent N items.
   */
  public countRecentAction(action: TacticalAction, windowSize: number = 4): number {
    const items = this.toArray();
    const recent = items.slice(-windowSize);
    return recent.filter(a => a === action).length;
  }

  public toTelemetry(): QueueTelemetry {
    const spam = this.detectSpam();
    return {
      capacity: 6,
      size: this.count,
      headIndex: this.head,
      tailIndex: this.tail,
      buffer: [...this.buffer],
      recentHistory: this.toArray(),
      detectedSpamAction: spam.action,
      threatImmunityBonus: spam.threatBonus,
      timingWindowPenalty: spam.timingPenalty
    };
  }
}
