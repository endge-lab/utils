type HotkeyHandler = (event: KeyboardEvent) => void

interface HotkeyManagerOptions {
  ignoreInput?: boolean
  target?: EventTarget // по умолчанию — window
}

export class HotkeyManager {
  private bindings: Map<string, Set<HotkeyHandler>> = new Map()
  private enabled = true
  private readonly target: EventTarget
  private readonly ignoreInput: boolean
  private readonly handleBound: (event: KeyboardEvent) => void

  constructor(options: HotkeyManagerOptions = {}) {
    this.target = options.target || window
    this.ignoreInput = options.ignoreInput ?? false
    this.handleBound = this.handle.bind(this)
    this.target.addEventListener('keydown', this.handleBound)
  }

  private isIgnoredTarget(target: EventTarget | null): boolean {
    if (!this.ignoreInput) return false
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    )
  }

  private normalizeKey(event: KeyboardEvent): string {
    const keys = []
    if (event.ctrlKey) keys.push('ctrl')
    if (event.metaKey) keys.push('meta')
    if (event.altKey) keys.push('alt')
    if (event.shiftKey) keys.push('shift')
    keys.push(event.key.toLowerCase())
    return keys.join('+')
  }

  private handle(event: KeyboardEvent) {
    if (!this.enabled || this.isIgnoredTarget(event.target)) return

    const key = this.normalizeKey(event)
    const handlers = this.bindings.get(key)
    if (handlers) {
      for (const handler of handlers) {
        handler(event)
      }
    }
  }

  on(keys: string | Array<string>, handler: HotkeyHandler): void {
    const keyList = Array.isArray(keys) ? keys : [keys]
    for (const key of keyList) {
      const normalized = key.toLowerCase()
      if (!this.bindings.has(normalized)) {
        this.bindings.set(normalized, new Set())
      }
      this.bindings.get(normalized)!.add(handler)
    }
  }

  off(keys: string | Array<string>, handler: HotkeyHandler): void {
    const keyList = Array.isArray(keys) ? keys : [keys]
    for (const key of keyList) {
      const normalized = key.toLowerCase()
      this.bindings.get(normalized)?.delete(handler)
    }
  }

  clear(key?: string): void {
    if (key) {
      this.bindings.delete(key.toLowerCase())
    } else {
      this.bindings.clear()
    }
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  destroy() {
    this.clear()
    this.target.removeEventListener('keydown', this.handleBound)
  }
}
