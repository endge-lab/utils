import type { ExposeOptions } from 'class-transformer'
import type { ValidationOptions } from 'class-validator'
import { Expose, Transform, TransformationType } from 'class-transformer'
import { IsOptional } from 'class-validator'

import 'reflect-metadata'

export function GenericExpose(options: ExposeOptions) {
  return function (target: object, propertyKey: string | symbol) {
    Expose(options)(target, propertyKey) // Используем декоратор @Expose
    Reflect.defineMetadata('genericExpose', options.name, target, propertyKey)
  }
}

// Ключ метаданных для хранения метода, вызываемого до сериализации
const BEFORE_SERIALIZE_KEY = Symbol('beforeSerialize')

// Пользовательский декоратор отмечает метод, вызываемый до сериализации
export function BeforeSerialize() {
  return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(BEFORE_SERIALIZE_KEY, propertyKey, target)
  }
}

export function AfterDeserialize(target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
  if (!target.__afterDeserializeMethods__) {
    target.__afterDeserializeMethods__ = []
  }
  target.__afterDeserializeMethods__.push(propertyKey)
}

// Объединяет в себе IsOptional c конвертацией null в undefined для исключения из json
export function IsOptionalTransformed(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    // Применяем Transform декоратор
    Transform(({ value }) => (value === null ? undefined : value), { toPlainOnly: true })(object, propertyName)

    // Применяем IsOptional декоратор
    IsOptional(validationOptions)(object, propertyName)
  }
}

export interface ISerializable {
  toPlain: () => any
  toJson: () => string
}

export function DeserializeId() {
  return Transform(({ value, type }) => {
    // При сериализации
    if (type === TransformationType.PLAIN_TO_CLASS) {
      return value?.id
    }
    return value
  })
}

export function DeserializeArrayField(field: string) {
  return Transform(({ value, type }) => {
    // При сериализации
    if (type === TransformationType.PLAIN_TO_CLASS) {
      return (value as Array<Record<string, unknown>> | null | undefined)?.map(item => item?.[field])
    }
    return value
  })
}

export function SerializeId() {
  return Transform(({ value, type }) => {
    // При сериализации
    if (type === TransformationType.CLASS_TO_PLAIN) {
      return value?.id || value
    }
    return value
  })
}

export function SerializeIds() {
  return Transform(({ value, type }) => {
    // При сериализации
    if (type === TransformationType.CLASS_TO_PLAIN) {
      return (value as Array<{ id: unknown }>).map(item => item.id)
    }
    return value
  })
}

export function IgnoreToPlain() {
  return Transform(({ value, type }) => (type === TransformationType.CLASS_TO_PLAIN ? undefined : value), { toPlainOnly: true })
}
