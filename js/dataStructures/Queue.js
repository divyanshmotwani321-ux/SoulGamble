/**
 * Queue — FIFO (First-In, First-Out) Data Structure
 *
 * Used genuinely for:
 *  - dealQueue: Sequentially animated card-dealing operations.
 *  - dialogueQueue: Ordered dramatic dialogue beats.
 */
export class Queue {
  constructor() {
    this._items = [];
  }

  enqueue(item) {
    this._items.push(item);
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this._items.shift();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this._items[0];
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

  toArray() {
    return [...this._items];
  }
}
