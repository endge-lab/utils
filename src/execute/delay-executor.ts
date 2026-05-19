/**
 * Описывает ответственность DelayedExecutor в архитектуре проекта.
 */
export class DelayedExecutor<T extends Array<any> = []> {
  private delayTimer: ReturnType<typeof setTimeout> | null = null
  private maxTimer: ReturnType<typeof setTimeout> | null = null
  private hasExecutedOnce = false
  private lastArgs: T | null = null

  /**
   * Создает экземпляр DelayedExecutor и подготавливает базовое состояние.
   */
  constructor(
    private readonly fn: (...args: T) => void,
    private readonly firstExecuteImmediately: boolean = false,
  ) {}

  /**
   * Выполняет действие run в рамках ответственности DelayedExecutor.
   */
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

  /**
   * Принудительно завершает накопленные изменения DelayedExecutor.
   */
  flush(): void {
    this.clear()
    if (this.lastArgs) this.fn(...this.lastArgs)
  }

  /**
   * Выполняет действие cancel в рамках ответственности DelayedExecutor.
   */
  cancel(): void {
    this.clear()
  }

  /**
   * Очищает накопленное состояние DelayedExecutor.
   */
  private clear(): void {
    if (this.delayTimer) clearTimeout(this.delayTimer)
    if (this.maxTimer) clearTimeout(this.maxTimer)
    this.delayTimer = null
    this.maxTimer = null
  }
}
