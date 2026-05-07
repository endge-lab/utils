import type { ClassConstructor } from 'class-transformer'
import {
  instanceToPlain,
  plainToInstance,
  Transform,
  TransformationType,
} from 'class-transformer'

/**
 * Декоратор @TypeMap для автоматической сериализации и десериализации `Map<K, V>`.
 * Поддерживает два формата JSON:
 * 1. **Объект → `Map<K, V>`** (если `keyField` не указан)
 * 2. **Массив → `Map<K, V>`** (если указан `keyField`)
 *
 * @param valueType - Класс значений в `Map<K, V>`.
 * @param keyField - (необязательно) Поле, используемое как ключ (`name`, `id`, и т. д.).
 *
 * ## Пример использования (объект → `Map`)
 * ```typescript
 * export class ReflectDomain {
 *   @TypeMap(RType) // JSON-объект { key: value } → Map<string, RType>
 *   private types: Map<string, RType> = new Map()
 * }
 * ```
 * **JSON**
 * ```json
 * {
 *   "types": {
 *     "User": { "name": "User", "fields": {} },
 *     "Company": { "name": "Company", "fields": {} }
 *   }
 * }
 * ```
 * **Результат**
 * ```typescript
 * ReflectDomain.types // Map<string, RType>
 * ReflectDomain.getType('User') // RType('User')
 * ```
 *
 * ## Пример использования (массив → `Map`)
 * ```typescript
 * export class ReflectDomain {
 *   @TypeMap(RType, 'name') // JSON-массив [{ name: value }, ...] → Map<string, RType>
 *   private types: Map<string, RType> = new Map()
 * }
 * ```
 * **JSON**
 * ```json
 * {
 *   "types": [
 *     { "name": "User", "fields": {} },
 *     { "name": "Company", "fields": {} }
 *   ]
 * }
 * ```
 * **Результат**
 * ```typescript
 * ReflectDomain.types // Map<string, RType>
 * ReflectDomain.getType('User') // RType('User')
 * ```
 */
export function TypeMap<V>(
  valueType: ClassConstructor<V>,
  keyField?: keyof V,
): PropertyDecorator {
  return Transform(({ value, type }) => {
    if (!value) return new Map()

    // Десериализация (JSON → Map)
    if (type === TransformationType.PLAIN_TO_CLASS) {
      if (Array.isArray(value)) {
        if (!keyField) {
          console.warn(
            '[TypeMap] Key field is required for array transformation!',
          )
          return new Map()
        }

        return new Map(
          value.map((item) => {
            const instance: V = plainToInstance(valueType, item)
            return [instance[keyField] as string, instance]
          }),
        )
      }

      if (typeof value === 'object') {
        return new Map(
          Object.entries(value).map(([key, val]) => {
            const instance: V = new valueType()
            Object.assign(instance as object, val)
            return [key, instance]
          }),
        )
      }

      console.warn('[TypeMap] Expected object or array, got:', value)
      return new Map()
    }

    // Сериализация (Map → JSON)
    if (type === TransformationType.CLASS_TO_PLAIN) {
      if (!(value instanceof Map)) {
        console.warn('[TypeMap] Expected Map, got:', value)
        return keyField ? [] : {}
      }

      return Array.from(value.values()).map((item) => instanceToPlain(item))
    }

    console.warn('[TypeMap] Unexpected transformation type:', type)
    return value
  })
}
