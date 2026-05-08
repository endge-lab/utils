import { type Maybe } from '@/shared/types/Maybe'

type GetterFn<T> = (x: T) => Maybe<T>

export default GetterFn
