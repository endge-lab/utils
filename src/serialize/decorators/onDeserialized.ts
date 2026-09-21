const ON_DESERIALIZED_KEY = Symbol('onDeserialized')

export function onDeserialized(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata(ON_DESERIALIZED_KEY, propertyKey, target)
  }
}

export function getOnDeserializedMethod<T>(instance: T): (() => void) | null {
  const methodName = Reflect.getMetadata(
    ON_DESERIALIZED_KEY,
    instance as object,
  )
  return methodName ? (instance as any)[methodName].bind(instance) : null
}
