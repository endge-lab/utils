import type { ClassConstructor } from 'class-transformer'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { getOnDeserializedMethod } from '@/serialize/decorators/onDeserialized'

// Инструмент сериализации данных на основании
// пакета class-transformer
export class Serialize {
  static toPlain<T>(instance: T): any {
    return instanceToPlain(instance, {
      exposeDefaultValues: true,
      excludeExtraneousValues: true,
    })
  }

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
