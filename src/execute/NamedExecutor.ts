import { consoleErrorSummary } from '@/tools/console'

interface NamedExecutorConfig {
  delayMs: number
  maxMs: number
}
/**
 * Описывает ответственность NamedExecutor в архитектуре проекта.
 */
export class NamedExecutor {
  private _delayTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private _maxTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private _callbacks = new Map<string, () => void>()
  private _firstCallTime = new Map<string, number>()

  /**
   * Создает экземпляр NamedExecutor и подготавливает базовое состояние.
   */
  constructor(private readonly _config: NamedExecutorConfig) {}

  /**
   * Выполняет действие run в рамках ответственности NamedExecutor.
   */
  run(id: string, callback: () => void): void {
    const now = Date.now()

    // 1. Запоминаем первый вызов
    if (!this._firstCallTime.has(id)) {
      this._firstCallTime.set(id, now)

      // Устанавливаем maxTimer — только один раз
      const maxTimer = setTimeout(() => {
        this.flush(id)
      }, this._config.maxMs)

      this._maxTimers.set(id, maxTimer)
    }

    // 2. Обновляем последний callback
    this._callbacks.set(id, callback)

    // 3. Сброс и пересоздание delayTimer
    clearTimeout(this._delayTimers.get(id)!)
    const delayTimer = setTimeout(() => {
      this.flush(id)
    }, this._config.delayMs)

    this._delayTimers.set(id, delayTimer)
  }

  /**
   * Принудительно завершает накопленные изменения NamedExecutor.
   */
  flush(id: string): void {
    try {
      const cb = this._callbacks.get(id)
      if (cb) {
        cb()
      }
    }
    catch (e) {
      console.error(`[NamedExecutor] flush error: ${consoleErrorSummary(e)}`)
    }

    this._clear(id)
  }

  /**
   * Выполняет действие cancel в рамках ответственности NamedExecutor.
   */
  cancel(id: string): void {
    this._clear(id)
  }

  /**
   * Принудительно завершает накопленные изменения NamedExecutor.
   */
  flushAll(): void {
    for (const id of this._callbacks.keys()) {
      this.flush(id)
    }
  }

  /**
   * Очищает накопленное состояние NamedExecutor.
   */
  private _clear(id: string): void {
    clearTimeout(this._delayTimers.get(id)!)
    clearTimeout(this._maxTimers.get(id)!)
    this._delayTimers.delete(id)
    this._maxTimers.delete(id)
    this._callbacks.delete(id)
    this._firstCallTime.delete(id)
  }
}
