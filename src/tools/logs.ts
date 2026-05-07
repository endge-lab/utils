import { Subscribable } from '@/events/Subscribable'

/**
 * Структурированная запись лога.
 *
 * @example
 * {
 *   timestamp: 1692826342203,
 *   level: 'info',
 *   message: 'Компонент успешно собран',
 *   context: ['components', 'DriverCard'],
 *   actions: [
 *     {
 *       icon: 'ti ti-eye',
 *       tooltip: 'Посмотреть компонент',
 *       handler: () => alert('Открываю DriverCard'),
 *     },
 *   ],
 * }
 */
export interface StructuredLogEntry {
  /** Время создания лога (timestamp в ms) */
  timestamp: number

  /** Уровень лога: _debug, info, warn или error */
  level: 'debug' | 'info' | 'warn' | 'error' | 'success'

  /** Сообщение лога */
  message: string

  /** Контекст (иерархия вложенности) */
  context: string[]

  /** Дополнительные действия (например, кнопки для лога) */
  actions?: {
    icon: string
    tooltip?: string
    handler: () => void
  }[]
}

/**
 * Логгер с поддержкой:
 * - Иерархического контекста (`context`, `start`, `end`).
 * - Разных уровней (`_debug`, `info`, `warn`, `error`).
 * - Action-кнопок для каждого лога.
 * - Подписки на обновления (через `Subscribable`).
 *
 * @example
 * const logger = new StructuredLogger()
 *
 * // Устанавливаем контекст
 * logger.context('components', 'DriverCard')
 *
 * // Логируем сообщение
 * logger.info('Компонент успешно собран')
 *
 * // Добавляем действие
 * logger.warn('Предупреждение', [
 *   { icon: 'ti ti-alert', tooltip: 'Подробнее', handler: () => alert('Подробнее!') },
 * ])
 *
 * // Используем вложенные уровни
 * logger.start('attributes').info('Загрузка атрибутов')
 * logger.end()
 *
 * // Получаем все логи
 * const logs = logger.getLogs()
 */
export class StructuredLogger extends Subscribable {
  /** Массив всех логов */
  private logs: StructuredLogEntry[] = []

  /** Текущий контекст (иерархия) */
  private currentContext: string[] = []
  private currentActions: StructuredLogEntry['actions'] = []

  /**
   * Устанавливает текущий контекст.
   * Сбрасывает предыдущий контекст.
   *
   * @param context Массив строк или несколько строк с уровнями контекста.
   * @returns _surface (для цепочки вызовов)
   * @example
   * logger.context('components', 'DriverCard')
   */
  context(...context: string[]): this {
    this.currentContext = context
    return this
  }

  /**
   * Добавляет дополнительный уровень контекста.
   *
   * @param context Новый уровень (например, 'attributes').
   * @returns _surface (для цепочки вызовов)
   * @example
   * logger.start('attributes')
   */
  start(context: string): this {
    this.currentContext.push(context)
    return this
  }

  /**
   * Убирает последний уровень контекста.
   * При этом может сразу добавить финальный лог, связанный с этим контекстом.
   *
   * @param level Уровень лога (по умолчанию 'info')
   * @param message Сообщение лога (опционально)
   * @param actions Дополнительные действия (опционально)
   * @example
   * logger.end('info', 'Компиляция завершена', [...])
   */
  end(
    level?: 'debug' | 'info' | 'warn' | 'error' | 'success',
    message?: string,
    actions?: StructuredLogEntry['actions'],
  ): this {
    if (message) {
      // если есть сообщение — логируем перед выходом из контекста
      const combinedActions =
        (actions ?? this.currentActions.length)
          ? this.currentActions
          : undefined
      this.log(level ?? 'info', message, combinedActions)
    }

    this.currentContext.pop()
    this.currentActions = [] // сбрасываем экшены
    return this
  }

  /**
   * Добавляет экшены в текущий контекст (для следующего `end`)
   * @param icon Иконка (например, "ti ti-check text-xl")
   * @param tooltip Подсказка (опционально)
   * @param handler Функция при клике (опционально)
   * @example
   * logger.action('ti ti-check', 'Все успешно', () => console.logFrame('Успешно!'))
   */
  action(icon: string, tooltip?: string, handler?: () => void): this {
    this.currentActions.push({ icon, tooltip, handler })
    return this
  }

  /**
   * Внутренний метод для создания лога.
   *
   * @param level Уровень (_debug, info, warn, error)
   * @param message Сообщение
   * @param actions Дополнительные действия (иконки с обработчиками)
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error' | 'success',
    message: string,
    actions?: {
      icon: string
      tooltip?: string
      handler: () => void
    }[],
  ): void {
    const logEntry: StructuredLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context: [...this.currentContext],
      actions,
    }
    this.logs.push(logEntry)
    this.notify()
  }

  /**
   * Лог уровня _debug.
   *
   * @param message Сообщение
   * @param actions Дополнительные действия (опционально)
   * @example
   * logger._debug('Загрузка данных')
   */
  debug(message: string, actions?: StructuredLogEntry['actions']): void {
    this.log('debug', message, actions)
  }

  /**
   * Лог уровня info.
   *
   * @param message Сообщение
   * @param actions Дополнительные действия (опционально)
   * @example
   * logger.info('Загрузка завершена')
   */
  info(message: string, actions?: StructuredLogEntry['actions']): void {
    this.log('info', message, actions)
  }

  /**
   * Лог уровня warn.
   *
   * @param message Сообщение
   * @param actions Дополнительные действия (опционально)
   * @example
   * logger.warn('Низкий заряд батареи')
   */
  warn(message: string, actions?: StructuredLogEntry['actions']): void {
    this.log('warn', message, actions)
  }

  /**
   * Лог уровня error.
   *
   * @param message Сообщение
   * @param actions Дополнительные действия (опционально)
   * @example
   * logger.error('Ошибка загрузки', [
   *   { icon: 'ti ti-refresh', tooltip: 'Повторить', handler: () => retry() },
   * ])
   */
  error(message: string, actions?: StructuredLogEntry['actions']): void {
    this.log('error', message, actions)
  }

  /**
   * Лог уровня success.
   *
   * @param message Сообщение
   * @param actions Дополнительные действия (опционально)
   * @example
   * logger.success('Успешно', [
   *   { icon: 'ti ti-refresh', tooltip: 'Повторить', handler: () => retry() },
   * ])
   */
  success(message: string, actions?: StructuredLogEntry['actions']): void {
    this.log('success', message, actions)
  }

  /**
   * Получить все логи.
   *
   * @returns Массив логов
   */
  getLogs(): StructuredLogEntry[] {
    return this.logs
  }

  /**
   * Очистить все логи (полностью).
   */
  clear(): void {
    this.logs = []
    this.notify()
  }
}
