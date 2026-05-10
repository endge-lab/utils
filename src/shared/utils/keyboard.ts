export interface KeyCombo {
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  key: string
}

export type KeyComboArray = Array<KeyCombo>

export function isAnyKeyComboActive(combos: KeyComboArray, event: KeyboardEvent): boolean {
  if (!event?.key) {
    return false
  }
  return combos.some(combo => {
    const ctrlOk = combo.ctrl === undefined || event.ctrlKey === combo.ctrl
    const altOk = combo.alt === undefined || event.altKey === combo.alt
    const shiftOk = combo.shift === undefined || event.shiftKey === combo.shift
    const metaOk = combo.meta === undefined || event.metaKey === combo.meta
    const keyOk = event.key && combo.key && event.key?.toLowerCase() === combo.key?.toLowerCase()
    return ctrlOk && altOk && shiftOk && metaOk && keyOk
  })
}
