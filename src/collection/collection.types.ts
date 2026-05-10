export interface CollectionEntity {
  id: string
  parentId?: string | null
}

export enum Events {
  Add = 'add',
  Remove = 'remove',
  Update = 'update',
  IndexCreate = 'indexCreate',
}

export type CollectionEvents<T extends CollectionEntity> = {
  [Events.Add]: Array<T>
  [Events.Remove]: Array<T>
  [Events.Update]: Array<T>
  [Events.IndexCreate]: keyof T
}

export interface IndexCollectionEntity<ID = string | null> {
  id: ID
  index: number // глобальный индекс в отсортированной коллекции
  filteredIndex: number // индекс в отфильтрованном массиве
}

export type CollectionOptions<T extends IndexCollectionEntity<ID>, ID = string | null> = {
  sortFn: (a: T, b: T) => number
  filterFn: (item: T) => boolean
  indexEnabled: boolean
  filterIndexEnabled: boolean
}

export interface ReadonlyIndexCollection<T extends IndexCollectionEntity<ID>, ID = string | null> {
  get(id: ID): T | undefined
  all(): ReadonlyArray<T>
  size(): number
  unfiltered(): ReadonlyArray<T>
  has(id: ID): boolean
  forEach(callback: (item: T) => void): void
}
