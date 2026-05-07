import { Transform } from 'class-transformer'

/**
 * Декоратор для преобразования JSON-поля:
 * - сериализует объект → строку
 * - десериализует строку → объект
 *
 * Пример:
 * @Json()
 * collection: Record<string, any> = {}
 */
export function Json(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Transform(
      ({ value }) => {
        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch {
            return {}
          }
        }
        return value
      },
      { toClassOnly: true },
    )(target, propertyKey)

    Transform(
      ({ value }) => {
        try {
          return JSON.stringify(value)
        } catch {
          return '{}'
        }
      },
      { toPlainOnly: true },
    )(target, propertyKey)
  }
}
