type NamedExecutorConfig = {
  delayMs: number
  maxMs: number
}
/**
 * Описывает ответственность NamedExecutor в архитектуре проекта.
 */
export class NamedExecutor {
  private delayTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private maxTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private callbacks = new Map<string, () => void>()
  private firstCallTime = new Map<string, number>()

  /**
   * Создает экземпляр NamedExecutor и подготавливает базовое состояние.
   */
  constructor(private readonly config: NamedExecutorConfig) {}

  /**
   * Выполняет действие run в рамках ответственности NamedExecutor.
   */
  run(id: string, callback: () => void): void {
    const now = Date.now()

    // 1. Запоминаем первый вызов
    if (!this.firstCallTime.has(id)) {
      this.firstCallTime.set(id, now)

      // Устанавливаем maxTimer — только один раз
      const maxTimer = setTimeout(() => {
        this.flush(id)
      }, this.config.maxMs)

      this.maxTimers.set(id, maxTimer)
    }

    // 2. Обновляем последний callback
    this.callbacks.set(id, callback)

    // 3. Сброс и пересоздание delayTimer
    clearTimeout(this.delayTimers.get(id)!)
    const delayTimer = setTimeout(() => {
      this.flush(id)
    }, this.config.delayMs)

    this.delayTimers.set(id, delayTimer)
  }

  /**
   * Принудительно завершает накопленные изменения NamedExecutor.
   */
  flush(id: string): void {
    try {
      const cb = this.callbacks.get(id)
      if (cb) cb()
    } catch (e) {
      console.error('[NamedExecutor] flush error:', e)
    }

    this.clear(id)
  }

  /**
   * Выполняет действие cancel в рамках ответственности NamedExecutor.
   */
  cancel(id: string): void {
    this.clear(id)
  }

  /**
   * Принудительно завершает накопленные изменения NamedExecutor.
   */
  flushAll(): void {
    for (const id of this.callbacks.keys()) {
      this.flush(id)
    }
  }

  /**
   * Очищает накопленное состояние NamedExecutor.
   */
  private clear(id: string): void {
    clearTimeout(this.delayTimers.get(id)!)
    clearTimeout(this.maxTimers.get(id)!)
    this.delayTimers.delete(id)
    this.maxTimers.delete(id)
    this.callbacks.delete(id)
    this.firstCallTime.delete(id)
  }
}
