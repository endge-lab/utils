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
  [Events.Add]: T[]
  [Events.Remove]: T[]
  [Events.Update]: T[]
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
  all(): readonly T[]
  size(): number
  unfiltered(): readonly T[]
  has(id: ID): boolean
  forEach(callback: (item: T) => void): void
}
