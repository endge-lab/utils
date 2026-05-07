type NamedExecutorConfig = {
  delayMs: number
  maxMs: number
}
export class NamedExecutor {
  private delayTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private maxTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private callbacks = new Map<string, () => void>()
  private firstCallTime = new Map<string, number>()

  constructor(private readonly config: NamedExecutorConfig) {}

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

  flush(id: string): void {
    try {
      const cb = this.callbacks.get(id)
      if (cb) cb()
    } catch (e) {
      console.error('[NamedExecutor] flush error:', e)
    }

    this.clear(id)
  }

  cancel(id: string): void {
    this.clear(id)
  }

  flushAll(): void {
    for (const id of this.callbacks.keys()) {
      this.flush(id)
    }
  }

  private clear(id: string): void {
    clearTimeout(this.delayTimers.get(id)!)
    clearTimeout(this.maxTimers.get(id)!)
    this.delayTimers.delete(id)
    this.maxTimers.delete(id)
    this.callbacks.delete(id)
    this.firstCallTime.delete(id)
  }
}
