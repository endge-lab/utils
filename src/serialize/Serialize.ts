import type { ClassConstructor } from 'class-transformer'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { getOnDeserializedMethod } from '@/serialize/decorators/onDeserialized'

// Инструмент сериализации данных на основании
// пакета class-transformer
/**
 * Описывает ответственность Serialize в архитектуре проекта.
 */
export class Serialize {
  /**
   * Выполняет действие toPlain в рамках ответственности Serialize.
   */
  static toPlain<T>(instance: T): any {
    return instanceToPlain(instance, {
      exposeDefaultValues: true,
      excludeExtraneousValues: true,
    })
  }

  /**
   * Выполняет действие fromJSON в рамках ответственности Serialize.
   */
  static fromJSON<T>(cls: ClassConstructor<T>, json: any): T {
    const instance = plainToInstance(cls, json, {
      exposeDefaultValues: true,
      excludeExtraneousValues: true,
    })

    // Вызываем метод с @onDeserialized(), если он есть
    const onDeserializedMethod = getOnDeserializedMethod(instance)
    if (onDeserializedMethod) {
      onDeserializedMethod()
    }

    return instance
  }
}
