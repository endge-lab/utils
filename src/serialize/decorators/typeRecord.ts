import type { ClassConstructor } from 'class-transformer'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Transform, TransformationType } from 'class-transformer'

/**
 * Декоратор `@TypeRecord` для автоматической (де)сериализации полей типа `Record<string, V>`.
 * Работает аналогично `@Type(() => V)`, но для структур, где ключами являются строки (как у обычного объекта),
 * а значениями — экземпляры определённого класса.
 *
 * Используется с библиотекой `class-transformer`.
 *
 * @param valueType - Класс значений, содержащихся в `Record<string, V>`.
 *
 * @example
 * ```ts
 * import { Expose } from 'class-transformer'
 *
 * class RField {
 *   @Expose()
 *   name!: string
 * }
 *
 * class Component {
 *   @Expose()
 *   @TypeRecord(RField)
 *   inputFields!: Record<string, RField>
 * }
 * ```
 *
 * ## Пример JSON:
 * ```json
 * {
 *   "inputFields": {
 *     "user": { "name": "user" },
 *     "email": { "name": "email" }
 *   }
 * }
 * ```
 * После `plainToInstance(Component, json)`:
 * ```ts
 * component.inputFields // Record<string, RField>
 * component.inputFields.user instanceof RField // true
 * ```
 *
 * ## Пример сериализации:
 * ```ts
 * const component = new Component()
 * component.inputFields = {
 *   user: new RField("user"),
 *   email: new RField("email"),
 * }
 *
 * const json = instanceToPlain(component)
 * // json = {
 * //   inputFields: {
 * //     user: { name: "user" },
 * //     email: { name: "email" }
 * //   }
 * // }
 * ```
 */
export function TypeRecord<V>(
  valueType: ClassConstructor<V>,
): PropertyDecorator {
  return Transform(({ value, type }) => {
    if (!value || typeof value !== 'object') return {}

    if (type === TransformationType.PLAIN_TO_CLASS) {
      const result: Record<string, V> = {}
      for (const key of Object.keys(value)) {
        result[key] = plainToInstance(valueType, value[key])
      }
      return result
    }

    if (type === TransformationType.CLASS_TO_PLAIN) {
      const result: Record<string, any> = {}
      for (const key of Object.keys(value)) {
        result[key] = instanceToPlain(value[key])
      }
      return result
    }

    return value
  })
}
