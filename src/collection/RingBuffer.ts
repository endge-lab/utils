export class RingBuffer<T> {
  private readonly _cap: number
  private readonly _buf: Array<T | undefined>
  private _head = 0
  private _len = 0

  constructor(capacity: number) {
    this._cap = Math.max(0, capacity | 0)
    this._buf = new Array<T | undefined>(this._cap)
  }

  get capacity(): number {
    return this._cap
  }

  get length(): number {
    return this._len
  }

  push(value: T): void {
    if (this._cap <= 0)
      return

    this._buf[this._head] = value
    this._head = (this._head + 1) % this._cap
    if (this._len < this._cap)
      this._len += 1
  }

  clear(): void {
    if (this._cap <= 0)
      return

    this._head = 0
    this._len = 0
  }

  toArray(): Array<T> {
    if (this._len === 0 || this._cap <= 0)
      return []

    const out = new Array<T>(this._len)
    const start = (this._head - this._len + this._cap) % this._cap

    for (let i = 0; i < this._len; i += 1) {
      const index = (start + i) % this._cap
      out[i] = this._buf[index] as T
    }

    return out
  }
}
