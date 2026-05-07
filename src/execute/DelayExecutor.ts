export class DelayedExecutor<T extends any[] = []> {
  private delayTimer: ReturnType<typeof setTimeout> | null = null
  private maxTimer: ReturnType<typeof setTimeout> | null = null
  private hasExecutedOnce = false
  private lastArgs: T | null = null

  constructor(
    private readonly fn: (...args: T) => void,
    private readonly firstExecuteImmediately: boolean = false,
  ) {}

  run(args: T, delayMs = 500, maxWaitMs = 2000): void {
    this.lastArgs = args

    if (this.firstExecuteImmediately && !this.hasExecutedOnce) {
      this.hasExecutedOnce = true
      this.flush()
      return
    }

    if (this.delayTimer) clearTimeout(this.delayTimer)
    this.delayTimer = setTimeout(() => this.flush(), delayMs)

    if (!this.maxTimer) {
      this.maxTimer = setTimeout(() => this.flush(), maxWaitMs)
    }
  }

  flush(): void {
    this.clear()
    if (this.lastArgs) this.fn(...this.lastArgs)
  }

  cancel(): void {
    this.clear()
  }

  private clear(): void {
    if (this.delayTimer) clearTimeout(this.delayTimer)
    if (this.maxTimer) clearTimeout(this.maxTimer)
    this.delayTimer = null
    this.maxTimer = null
  }
}
