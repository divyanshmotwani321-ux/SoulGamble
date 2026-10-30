/**
 * Stack — LIFO (Last-In, First-Out) Data Structure
 *
 * Used genuinely for:
 *  - eventHistoryStack: Chronological LIFO audit log of player decisions, bets,
 *    Stand activations, and state changes shown in the Data Structures Inspector.
 *  - checkpointStack: Saves reversible state snapshots before the Final Showdown
 *    so the player can pop and "Retry Final Hand" after a defeat.
 */
export class Stack {
  constructor(maxCapacity = 60) {
    this._items = [];
    this._maxCapacity = maxCapacity;
  }

  push(item) {
    if (this._items.length >= this._maxCapacity) {
      this._items.shift(); // drop oldest when full
    }
    this._items.push(item);
  }

  pop() {
    if (this.isEmpty()) return null;
    return this._items.pop();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this._items[this._items.length - 1];
  }

  isEmpty() {
    return this._items.length === 0;
  }

  size() {
    return this._items.length;
  }

  clear() {
    this._items = [];
  }

  /** Returns top-of-stack first for inspector display */
  toArray() {
    return [...this._items].reverse();
  }
}
