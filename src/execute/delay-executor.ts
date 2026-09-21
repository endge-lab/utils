/**
 * Описывает ответственность DelayedExecutor в архитектуре проекта.
 */
export class DelayedExecutor<T extends Array<any> = []> {
  private _delayTimer: ReturnType<typeof setTimeout> | null = null
  private _maxTimer: ReturnType<typeof setTimeout> | null = null
  private _hasExecutedOnce = false
  private _lastArgs: T | null = null

  /**
   * Создает экземпляр DelayedExecutor и подготавливает базовое состояние.
   */
  constructor(
    private readonly _fn: (...args: T) => void,
    private readonly _firstExecuteImmediately: boolean = false,
  ) {}

  /**
   * Выполняет действие run в рамках ответственности DelayedExecutor.
   */
  run(args: T, delayMs = 500, maxWaitMs = 2000): void {
    this._lastArgs = args

    if (this._firstExecuteImmediately && !this._hasExecutedOnce) {
      this._hasExecutedOnce = true
      this.flush()
      return
    }

    if (this._delayTimer) {
      clearTimeout(this._delayTimer)
    }
    this._delayTimer = setTimeout(() => this.flush(), delayMs)

    if (!this._maxTimer) {
      this._maxTimer = setTimeout(() => this.flush(), maxWaitMs)
    }
  }

  /**
   * Принудительно завершает накопленные изменения DelayedExecutor.
   */
  flush(): void {
    this._clear()
    if (this._lastArgs) {
      this._fn(...this._lastArgs)
    }
  }

  /**
   * Выполняет действие cancel в рамках ответственности DelayedExecutor.
   */
  cancel(): void {
    this._clear()
  }

  /**
   * Очищает накопленное состояние DelayedExecutor.
   */
  private _clear(): void {
    if (this._delayTimer) {
      clearTimeout(this._delayTimer)
    }
    if (this._maxTimer) {
      clearTimeout(this._maxTimer)
    }
    this._delayTimer = null
    this._maxTimer = null
  }
}
