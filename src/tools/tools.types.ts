/**
 * Тип, обозначающий возможное отсутствие значения.
 * Аналог Maybe<P> из функционального программирования.
 */
export type Maybe<T> = T | null | undefined

/**
 * Тип, обозначающий возможное значение null.
 */
export type Nullable<T> = T | null

/**
 * Тип, обозначающий возможное значение undefined.
 */
export type Undefinable<T> = T | undefined

/**
 * Тип конструктора для класса.
 * Используется, например, в DI-контейнерах или фабриках.
 */
export type Constructor<T = any> = new (...args: Array<any>) => T

/**
 * Частичный рекурсивный тип.
 * Делает все поля и вложенные поля необязательными.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Тип, исключающий null и undefined.
 */
export type NonNullableStrict<T> = T extends null | undefined ? never : T

/**
 * Тип, позволяющий переопределить свойства в типе.
 * Аналог расширения типов с заменой полей.
 */
export type Override<Base, Overrides> = Omit<Base, keyof Overrides> & Overrides

/**
 * Тип для асинхронной функции.
 */
export type AsyncFn<Args extends Array<any> = Array<any>, R = any> = (...args: Args) => Promise<R>

/**
 * Тип, представляющий значение или промис значения.
 */
export type Awaitable<T> = T | Promise<T>

/**
 * Тип, представляющий функцию без аргументов и без возвращаемого значения.
 */
export type VoidFn = () => void

/**
 * Тип, обозначающий словарь значений.
 */
export type Dictionary<T = any> = Record<string, T>

/**
 * Тип, обозначающий функцию обратного вызова (callback).
 */
export type Callback<T = void> = (arg: T) => void

/**
 * Тип с возможностью `null`, `undefined` или любого значения.
 */
export type Falsy = false | '' | 0 | null | undefined

/**
 * Тип, исключающий falsy-значения.
 */
export type Truthy<T> = T extends Falsy ? never : T

/**
 * Тип, объединяющий `P` или массив `P`.
 */
export type MaybeArray<T> = T | Array<T>

/**
 * Тип, возвращающий все ключи объекта, значения которых равны заданному типу.
 */
export type KeysWithType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Тип, помечающий, что значение может быть `never` или `void`, и его можно проигнорировать.
 */
export type Ignored = never | void

/**
 * Универсальный тип для одного или нескольких объектов.
 */
export type OneOrMany<T> = T | Array<T>

/**
 * Тип для активного состояния с вычисляемым значением.
 */
export type ActiveState<T> = {
  value: T
  computed: T
}

/**
 * Тип для глубокой частичной рекурсии.
 */
export type PartialDeep<T> =
  T extends (...args: Array<any>) => any
    ? T
    : T extends Array<infer U>
      ? Array<PartialDeep<U>>
      : T extends object
        ? { [K in keyof T]?: PartialDeep<T[K]> }
        : T
