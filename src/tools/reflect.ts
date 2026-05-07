/**
 * Проверяет, является ли переданная функция конструктором.
 */
export function isConstructor<T extends new (...args: any[]) => any>(
  fn: any,
): fn is T {
  try {
    new new Proxy(fn, { construct: () => ({}) })()
    return true
  } catch {
    return false
  }
}

/**
 * Утилитарный тип: или конструктор, или фабрика.
 */
export type ConstructorOrFactory<T, Args extends any[] = any[]> =
  | (new (...args: Args) => T)
  | ((...args: Args) => T)

/**
 * Универсальный вызов: конструктор или фабрика.
 */
export function createInstance<T, Args extends any[]>(
  source: ConstructorOrFactory<T, Args>,
  ...args: Args
): T {
  if (isConstructor(source)) {
    const Ctor = source as new (...args: Args) => T
    return new Ctor(...args)
  } else {
    const Factory = source as (...args: Args) => T
    return Factory(...args)
  }
}
