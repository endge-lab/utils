import type { ClassConstructor } from 'class-transformer'
import { instanceToPlain, plainToInstance } from 'class-transformer'

export function toInstance<T>(ctor: ClassConstructor<T>, json: object): T {
  return plainToInstance(ctor, json, {
    exposeDefaultValues: true,
    excludeExtraneousValues: true,
  })
}

export function toPlain<T>(obj: T): object {
  return instanceToPlain(obj, {
    exposeUnsetFields: false,
  })
}
