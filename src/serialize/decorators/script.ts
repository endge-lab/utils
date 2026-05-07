import { Transform } from 'class-transformer'

/**
 * Декоратор для хранения текста скрипта:
 * - сериализует как обычную строку
 * - десериализует строку, очищая лишние пробелы
 *
 * Пример:
 * @Script()
 * code: string = ''
 */
export function Script(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Десериализация: убираем лишние пробелы, валидируем строку
    Transform(
      ({ value }) => {
        if (typeof value === 'string') {
          return value.trim()
        }
        return String(value ?? '')
      },
      { toClassOnly: true },
    )(target, propertyKey)

    // Сериализация: просто как строку
    Transform(
      ({ value }) => {
        if (typeof value === 'string') return value
        return String(value ?? '')
      },
      { toPlainOnly: true },
    )(target, propertyKey)
  }
}
