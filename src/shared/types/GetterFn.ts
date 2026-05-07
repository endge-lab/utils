import { type Maybe } from './Maybe'

type GetterFn<T> = (x: T) => Maybe<T>

export default GetterFn
