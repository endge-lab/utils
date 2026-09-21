/** Возвращает строку ограниченной длины без обхода или удержания переданного значения. */
export function consoleValueSummary(value: unknown): string {
  if (value == null) {
    return String(value)
  }
  if (typeof value === 'string') {
    return `string(${value.length})`
  }
  if (typeof value !== 'object') {
    return `${typeof value}(${String(value)})`
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }
  if (value instanceof Map) {
    return `Map(${value.size})`
  }
  if (value instanceof Set) {
    return `Set(${value.size})`
  }
  return value.constructor?.name || 'Object'
}

/** Возвращает метаданные Error как текст, не передавая объект Error в Console. */
export function consoleErrorSummary(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : consoleValueSummary(error)
}
