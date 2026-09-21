type HotkeyHandler = (event: KeyboardEvent) => void

interface HotkeyManagerOptions {
  ignoreInput?: boolean
  target?: EventTarget // по умолчанию — window
}

/**
 * Управляет ресурсами и состоянием HotkeyManager.
 */
export class HotkeyManager {
  private _bindings: Map<string, Set<HotkeyHandler>> = new Map()
  private _enabled = true
  private readonly _target: EventTarget
  private readonly _ignoreInput: boolean
  private readonly _handleBound: EventListener

  /**
   * Создает экземпляр HotkeyManager и подготавливает базовое состояние.
   */
  constructor(options: HotkeyManagerOptions = {}) {
    this._target = options.target || window
    this._ignoreInput = options.ignoreInput ?? false
    this._handleBound = this._handle.bind(this)
    this._target.addEventListener('keydown', this._handleBound)
  }

  /**
   * Выполняет внутренний шаг isIgnoredTarget для HotkeyManager.
   */
  private _isIgnoredTarget(target: EventTarget | null): boolean {
    if (!this._ignoreInput) {
      return false
    }
    return (
      target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || (target instanceof HTMLElement && target.isContentEditable)
    )
  }

  /**
   * Нормализует входные данные HotkeyManager.
   */
  private _normalizeKey(event: KeyboardEvent): string {
    const keys = []
    if (event.ctrlKey) {
      keys.push('ctrl')
    }
    if (event.metaKey) {
      keys.push('meta')
    }
    if (event.altKey) {
      keys.push('alt')
    }
    if (event.shiftKey) {
      keys.push('shift')
    }
    keys.push(event.key.toLowerCase())
    return keys.join('+')
  }

  /**
   * Обрабатывает runtime-событие HotkeyManager.
   */
  private _handle(event: Event): void {
    if (!(event instanceof KeyboardEvent) || !this._enabled || this._isIgnoredTarget(event.target)) {
      return
    }

    const key = this._normalizeKey(event)
    const handlers = this._bindings.get(key)
    if (handlers) {
      for (const handler of handlers) {
        handler(event)
      }
    }
  }

  /**
   * Обрабатывает входящее событие HotkeyManager.
   */
  on(keys: string | Array<string>, handler: HotkeyHandler): void {
    const keyList = Array.isArray(keys) ? keys : [keys]
    for (const key of keyList) {
      const normalized = key.toLowerCase()
      if (!this._bindings.has(normalized)) {
        this._bindings.set(normalized, new Set())
      }
      this._bindings.get(normalized)!.add(handler)
    }
  }

  /**
   * Выполняет действие off в рамках ответственности HotkeyManager.
   */
  off(keys: string | Array<string>, handler: HotkeyHandler): void {
    const keyList = Array.isArray(keys) ? keys : [keys]
    for (const key of keyList) {
      const normalized = key.toLowerCase()
      this._bindings.get(normalized)?.delete(handler)
    }
  }

  /**
   * Очищает накопленное состояние HotkeyManager.
   */
  clear(key?: string): void {
    if (key) {
      this._bindings.delete(key.toLowerCase())
    }
    else {
      this._bindings.clear()
    }
  }

  /**
   * Выполняет действие enable в рамках ответственности HotkeyManager.
   */
  enable() {
    this._enabled = true
  }

  /**
   * Выполняет действие disable в рамках ответственности HotkeyManager.
   */
  disable() {
    this._enabled = false
  }

  /**
   * Освобождает runtime-ресурсы и подписки HotkeyManager.
   */
  destroy() {
    this.clear()
    this._target.removeEventListener('keydown', this._handleBound)
  }
}
