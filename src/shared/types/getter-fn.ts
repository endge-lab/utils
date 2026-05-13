import { type Maybe } from '@/shared/types/maybe'

type GetterFn<T> = (x: T) => Maybe<T>

export default GetterFn
