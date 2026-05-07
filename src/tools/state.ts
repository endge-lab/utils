const globalCache = new WeakMap<Function, any>()

export function globalState<T>(factory: () => T): () => T {
  let value: T | undefined

  return (): T => {
    if (!value) {
      value = factory()
      globalCache.set(factory, value)
    }
    return value
  }
}
