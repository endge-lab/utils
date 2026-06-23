import { Transform } from 'class-transformer'

export function JsonString(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Transform(
      ({ value }) => {
        if (value == null)
          return '{}'

        if (typeof value === 'object') {
          try {
            return JSON.stringify(value, null, 2)
          } catch {
            return '{}'
          }
        }

        return value
      },
      { toClassOnly: true },
    )(target, propertyKey)

    Transform(
      ({ value }) => {
        if (!value)
          return {}

        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch {
            return {}
          }
        }

        return value
      },
      { toPlainOnly: true },
    )(target, propertyKey)
  }
}
