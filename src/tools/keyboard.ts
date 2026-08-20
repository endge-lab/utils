export { isAnyKeyComboActive, type KeyCombo, type KeyComboArray } from '@/shared/utils/keyboard'

export type KeyboardStatePlatform = 'macos' | 'windows' | 'linux' | 'unknown'

export interface KeyboardStateSnapshot {
  platform: KeyboardStatePlatform
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
    mod: boolean
    altGraph: boolean
  }
  held: {
    key: string[]
    code: string[]
  }
}

interface KeyboardStateEntry {
  key: string
  code: string
}

interface KeyboardStateTracker {
  snapshot: KeyboardStateSnapshot
  entries: Map<string, KeyboardStateEntry>
  subscribers: Set<(snapshot: KeyboardStateSnapshot) => void>
}

const keyboardStateTrackers = new WeakMap<Document, KeyboardStateTracker>()
const modifierKeys = new Set([
  'Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'FnLock', 'Hyper', 'Meta', 'NumLock',
  'OS', 'ScrollLock', 'Shift', 'Super', 'Symbol', 'SymbolLock',
])

/** Returns the shared document-scoped keyboard snapshot, installing one tracker lazily. */
export function getKeyboardStateSnapshot(target: Document): KeyboardStateSnapshot {
  return cloneKeyboardStateSnapshot(ensureKeyboardStateTracker(target).snapshot)
}

/** Subscribes to the shared document-scoped keyboard state and immediately emits its snapshot. */
export function subscribeKeyboardState(
  target: Document,
  listener: (snapshot: KeyboardStateSnapshot) => void,
): () => void {
  const tracker = ensureKeyboardStateTracker(target)
  tracker.subscribers.add(listener)
  listener(cloneKeyboardStateSnapshot(tracker.snapshot))
  return () => tracker.subscribers.delete(listener)
}

function ensureKeyboardStateTracker(target: Document): KeyboardStateTracker {
  const existing = keyboardStateTrackers.get(target)
  if (existing)
    return existing

  const platform = resolveKeyboardStatePlatform(target.defaultView?.navigator)
  const tracker: KeyboardStateTracker = {
    snapshot: emptyKeyboardStateSnapshot(platform),
    entries: new Map(),
    subscribers: new Set(),
  }
  const publish = (event?: KeyboardEvent): void => {
    const modifiers = event
      ? {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey,
          mod: platform === 'macos'
            ? event.metaKey
            : platform === 'windows' || platform === 'linux'
              ? event.ctrlKey
              : event.ctrlKey || event.metaKey,
          altGraph: event.getModifierState?.('AltGraph') === true,
        }
      : emptyKeyboardStateSnapshot(platform).modifiers
    const entries = [...tracker.entries.values()]
    const next: KeyboardStateSnapshot = {
      platform,
      modifiers,
      held: {
        key: [...new Set(entries.map(entry => entry.key))].sort(),
        code: [...new Set(entries.map(entry => entry.code).filter(Boolean))].sort(),
      },
    }
    if (sameKeyboardStateSnapshot(tracker.snapshot, next))
      return
    tracker.snapshot = next
    for (const subscriber of tracker.subscribers)
      subscriber(cloneKeyboardStateSnapshot(next))
  }
  const reset = (): void => {
    tracker.entries.clear()
    publish()
  }

  target.addEventListener('keydown', (event) => {
    if (!modifierKeys.has(event.key)) {
      const key = event.key.toLowerCase()
      tracker.entries.set(event.code || `key:${key}`, { key, code: event.code })
    }
    publish(event)
  }, true)
  target.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase()
    tracker.entries.delete(event.code || `key:${key}`)
    publish(event)
  }, true)
  target.addEventListener('visibilitychange', () => {
    if (target.visibilityState === 'hidden')
      reset()
  })
  target.defaultView?.addEventListener('blur', reset)
  target.defaultView?.addEventListener('pagehide', reset)
  keyboardStateTrackers.set(target, tracker)
  return tracker
}

function emptyKeyboardStateSnapshot(platform: KeyboardStatePlatform): KeyboardStateSnapshot {
  return {
    platform,
    modifiers: {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      mod: false,
      altGraph: false,
    },
    held: { key: [], code: [] },
  }
}

function resolveKeyboardStatePlatform(navigator: Navigator | undefined): KeyboardStatePlatform {
  const source = navigator as (Navigator & { userAgentData?: { platform?: string } }) | undefined
  const label = String(source?.userAgentData?.platform ?? source?.platform ?? source?.userAgent ?? '').toLowerCase()
  if (label.includes('mac') || label.includes('darwin') || label.includes('iphone') || label.includes('ipad')) return 'macos'
  if (label.includes('win')) return 'windows'
  if (label.includes('linux') || label.includes('x11') || label.includes('cros')) return 'linux'
  return 'unknown'
}

function sameKeyboardStateSnapshot(left: KeyboardStateSnapshot, right: KeyboardStateSnapshot): boolean {
  return left.platform === right.platform
    && left.modifiers.ctrl === right.modifiers.ctrl
    && left.modifiers.shift === right.modifiers.shift
    && left.modifiers.alt === right.modifiers.alt
    && left.modifiers.meta === right.modifiers.meta
    && left.modifiers.mod === right.modifiers.mod
    && left.modifiers.altGraph === right.modifiers.altGraph
    && sameStrings(left.held.key, right.held.key)
    && sameStrings(left.held.code, right.held.code)
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function cloneKeyboardStateSnapshot(snapshot: KeyboardStateSnapshot): KeyboardStateSnapshot {
  return {
    platform: snapshot.platform,
    modifiers: { ...snapshot.modifiers },
    held: { key: [...snapshot.held.key], code: [...snapshot.held.code] },
  }
}
