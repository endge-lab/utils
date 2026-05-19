import type { OneOrMany } from '@/tools/tools.types'

/**
 * Тип колбэка для события.
 * @template T Тип данных, передаваемых в событие.
 */
export type EventCallback<T = any> = (payload: T) => void

export type EventList = Record<string, any>

/**
 * EventBus реализует паттерн подписки на события.
 *
 * Поддерживает:
 * - Типизированные события через дженерик StaticEvents;
 * - Кастомные (непредопределённые) события;
 * - Подписку `on`, одноразовую подписку `once`, отписку `off`;
 * - Эмит `emit`, проверку `hasListeners` и список активных событий `eventNames`.
 *
 * Пример использования:
 *
 * ```ts
 * type Events = {
 *   userLogin: { id: string }
 *   error: { message: string }
 * }
 *
 * const bus = new EventBus<Events>(['userLogin', 'error'])
 *
 * bus.on('userLogin', ({ id }) => console.logFrame(`Login: ${id}`))
 * bus.once('error', ({ message }) => console.warn('One-time error:', message))
 *
 * bus.emit('userLogin', { id: 'u42' })         // Login: u42
 * bus.emit('error', { message: 'fail' })       // One-time error: fail
 * bus.emit('error', { message: 'fail again' }) // уже не сработает
 *
 * console.logFrame(bus.hasListeners('userLogin')) // true
 * console.logFrame(bus.eventNames())              // ['userLogin']
 * ```
 */
export class EventBus<
  StaticEvents extends Record<string, any>,
  CustomEventMap extends Record<string, any> = Record<string, any>,
> {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  /**
   * Создает экземпляр EventBus и подготавливает базовое состояние.
   */
  constructor(predefinedEvents: Array<keyof StaticEvents>) {
    predefinedEvents.forEach(event => {
      this.listeners.set(event as string, new Set())
    })
  }

  // ---- Типизированные события ----

  /**
   * Обрабатывает входящее событие EventBus.
   */
  on<K extends keyof StaticEvents>(events: OneOrMany<K>, callback: EventCallback<StaticEvents[K]>): void {
    this._on(events as string | Array<string>, callback)
  }

  /**
   * Обрабатывает входящее событие EventBus.
   */
  once<K extends keyof StaticEvents>(events: OneOrMany<K>, callback: EventCallback<StaticEvents[K]>): void {
    this._once(events as string | Array<string>, callback)
  }

  /**
   * Выполняет действие off в рамках ответственности EventBus.
   */
  off<K extends keyof StaticEvents>(events: OneOrMany<K>, callback: EventCallback<StaticEvents[K]>): void {
    this._off(events as string | Array<string>, callback)
  }
  /**
   * Выполняет действие offAll в рамках ответственности EventBus.
   */
  offAll(): void {
    for (const set of this.listeners.values()) {
      set.clear()
    }
  }

  /**
   * Публикует событие во внутренний event bus EventBus.
   */
  emit<K extends keyof StaticEvents>(event: K, payload: StaticEvents[K]): void {
    this._emit(event as string, payload)
  }

  // ---- Кастомные события (опционально) ----

  /**
   * Обрабатывает входящее событие EventBus.
   */
  onCustom<K extends keyof CustomEventMap>(events: OneOrMany<K>, callback: EventCallback<CustomEventMap[K]>): void {
    this._on(events as string | Array<string>, callback)
  }

  /**
   * Обрабатывает входящее событие EventBus.
   */
  onceCustom<K extends keyof CustomEventMap>(events: OneOrMany<K>, callback: EventCallback<CustomEventMap[K]>): void {
    this._once(events as string | Array<string>, callback)
  }

  /**
   * Выполняет действие offCustom в рамках ответственности EventBus.
   */
  offCustom<K extends keyof CustomEventMap>(events: OneOrMany<K>, callback: EventCallback<CustomEventMap[K]>): void {
    this._off(events as string | Array<string>, callback)
  }

  /**
   * Публикует событие во внутренний event bus EventBus.
   */
  emitCustom<K extends keyof CustomEventMap>(event: K, payload: CustomEventMap[K]): void {
    this._emit(event as string, payload)
  }

  // ---- Общая логика ----

  /**
   * Обрабатывает входящее событие EventBus.
   */
  private _on(events: OneOrMany<string>, callback: EventCallback): void {
    const eventList = Array.isArray(events) ? events : [events]
    for (const event of eventList) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set())
      }
      this.listeners.get(event)!.add(callback)
    }
  }

  /**
   * Обрабатывает входящее событие EventBus.
   */
  private _once(events: OneOrMany<string>, callback: EventCallback): void {
    const eventList = Array.isArray(events) ? events : [events]
    const wrapper = (payload: any): void => {
      for (const event of eventList) {
        this.off(event, wrapper)
      }
      callback(payload)
    }
    this._on(eventList, wrapper)
  }

  /**
   * Выполняет внутренний шаг _off для EventBus.
   */
  private _off(events: OneOrMany<string>, callback: EventCallback): void {
    const eventList = Array.isArray(events) ? events : [events]
    for (const event of eventList) {
      this.listeners.get(event)?.delete(callback)
    }
  }

  /**
   * Публикует событие во внутренний event bus EventBus.
   */
  private _emit(event: string, payload?: any): void {
    const callbacks = this.listeners.get(event)
    if (!callbacks) return
    for (const cb of callbacks) {
      cb(payload)
    }
  }

  /**
   * Выполняет действие hasListeners в рамках ответственности EventBus.
   */
  hasListeners(event: string): boolean {
    return (this.listeners.get(event)?.size ?? 0) > 0
  }

  /**
   * Выполняет действие eventNames в рамках ответственности EventBus.
   */
  eventNames(): Array<string> {
    return [...this.listeners.entries()].filter(([, set]) => set.size > 0).map(([event]) => event)
  }

  /**
   * Очищает накопленное состояние EventBus.
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.get(event)?.clear()
    } else {
      this.listeners.clear()
    }
  }
}

// Универсальный EventBus для глобальных событий приложения
export type GlobalEvents = {
  // Единая точка всех асинхронных UI-сообщений.
  notify: {
    severity: 'success' | 'error' | 'info' | 'warn'
    summary: string
    detail?: string
    life?: number
  }
  // Также можно использовать любые произвольные события
}

export const AppBus = new EventBus<GlobalEvents>(Object.keys({} as GlobalEvents) as Array<keyof GlobalEvents>)
