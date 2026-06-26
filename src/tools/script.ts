/**
 * Описывает ответственность ScriptRunner в архитектуре проекта.
 */
export class ScriptRunner {
  /**
   * Создает экземпляр ScriptRunner и подготавливает базовое состояние.
   */
  constructor(private script: string) {}

  /**
   * Запускает скрипт с некоторым контекстом и автоматически
   * добавляют экспортируемые имена которые парсятся из JSX
   */
  async runAsync(
    context: Record<string, any>,
    exportNames: Set<string> = new Set(),
  ): Promise<void> {
    const argNames = Object.keys(context)

    const wrappedContext = Object.fromEntries(
      argNames.map(name => [name, this.wrapIfAsync(context[name])]),
    )

    const names = Array.from(exportNames)

    // Генерируем строку: expose({ handler1, handler2 })
    const exposeCode =
      names.length > 0 ? `\n\nexpose({ ${names.join(', ')} });\n` : ''

    const fullScript = `${this.script}${exposeCode}`

    try {
      const fn = new Function(
        ...argNames,
        `"use strict"; return (async () => { ${fullScript} })();`,
      )

      return await fn(...Object.values(wrappedContext))
    } catch (e) {
      console.warn(
        '(ScriptRunner.runAsync): Ошибка в скрипте:',
        fullScript,
        e,
      )
    }
  }

  /**
   * Синхронно вычисляет выражение в контексте.
   * Используется для интерполяций, :bind, v-if и т.п.
   */
  runSync(
    context: Record<string, any>,
    exportNames: Set<string> = new Set(),
  ): void {
    const argNames = Object.keys(context)
    const argValues = Object.values(context)

    const names = Array.from(exportNames)

    // Генерируем строку: expose({ handler1, handler2 })
    const exposeCode =
      names.length > 0 ? `\n\nexpose({ ${names.join(', ')} });\n` : ''

    try {
      const fn = new Function(
        ...argNames,
        `"use strict"; ${this.script}${exposeCode};`,
      )
      fn(...argValues)
    } catch (e) {
      console.warn(
        '(ScriptRunner.runSync): Ошибка в скрипте:',
        this.script,
        e,
      )
    }
  }

  /**
   * Синхронно вычисляет выражение в контексте.
   * Используется для интерполяций, :bind, v-if и т.п.
   */
  evaluate(context: Record<string, any>): any {
    const argNames = Object.keys(context)
    const argValues = Object.values(context)

    try {
      const fn = new Function(
        ...argNames,
        `"use strict"; return (${this.script});`,
      )
      return fn(...argValues)
    } catch (e) {
      console.warn(
        '(ScriptRunner.evaluate): Ошибка в выражении:',
        this.script,
        e,
      )
      return undefined
    }
  }

  /**
   * Выполняет внутренний шаг wrapIfAsync для ScriptRunner.
   */
  private wrapIfAsync(obj: any): Record<string, any> {
    if (typeof obj !== 'object' || obj === null) return obj

    const wrapped: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'function') {
        wrapped[key] = (...args: Array<any>) => {
          const result = value(...args)
          if (result instanceof Promise) {
            return result // await будет в обёртке скрипта
          }
          return result
        }
      } else {
        wrapped[key] = value
      }
    }

    return wrapped
  }
}
