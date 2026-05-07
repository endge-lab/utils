export const IS_DEBUG = process.env.NODE_ENV !== 'production'

// Запуск функции с замерами производительности
export function profile<T>(label: string, fn: () => T): T {
  if (!IS_DEBUG) return fn()

  console.groupCollapsed(`⏳ ${label}`)
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  console.log(`${label}: ${Math.round(end - start)} ms`)
  console.groupEnd()
  return result
}
