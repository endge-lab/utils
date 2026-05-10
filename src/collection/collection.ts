import type {
  CollectionEntity,
  CollectionEvents,
} from '@/collection/collection.types'
import { Events } from '@/collection/collection.types'
import { EventBus } from '@/events/EventBus'
import { Subscribable } from '@/events/Subscribable'

export class Collection<T extends CollectionEntity> extends Subscribable {
  private items: Array<T> = []
  private indices: Map<keyof T, Map<any, T>> = new Map()
  private rootIds: Set<string> = new Set()
  private bus: EventBus<CollectionEvents<T>>

  constructor(initialItems: Array<T> = []) {
    super()
    this.bus = new EventBus<CollectionEvents<T>>(Object.values(Events))
    if (initialItems.length) {
      this.add(initialItems)
    }
    this.createIndex('id')
  }

  add(items: T | Array<T>): void {
    const list = Array.isArray(items) ? items : [items]
    list.forEach(item => {
      this.items.push(item)
      this.indices.forEach((indexMap, field) => {
        indexMap.set(item[field], item)
      })
      if (!item.parentId) {
        this.rootIds.add(item.id)
      }
    })
    if (list?.length) {
      this.bus.emit(Events.Add, list)
      this.notify()
    }
  }

  remove(arg: string | T | Array<string | T>): void {
    const list: Array<string | T> = Array.isArray(arg) ? arg : [arg]
    const removedItems: Array<T> = []

    list.forEach(itemOrId => {
      const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id
      const index = this.items.findIndex(i => i.id === id)

      if (index !== -1) {
        const [removed] = this.items.splice(index, 1)

        // Удаляем из всех индексов
        this.indices.forEach((indexMap, field) => {
          indexMap.delete(removed[field])
        })

        if (!removed.parentId) {
          this.rootIds.delete(removed.id)
        }

        removedItems.push(removed)
      }
    })

    if (removedItems.length) {
      this.bus.emit(Events.Remove, removedItems)
      this.notify()
    }
  }

  update(itemOrItems: T | Array<T>): void {
    const list = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]
    list.forEach(item => {
      const existing = this.get(item.id)
      if (existing) {
        Object.assign(existing, item)
        this.indices.forEach((indexMap, field) => {
          indexMap.set(item[field], existing)
        })
      }
    })
    if (list?.length) {
      this.bus.emit(Events.Update, list)
      this.notify()
    }
  }

  get(arg: string | Partial<T>): T | undefined {
    if (typeof arg === 'string') {
      return this.indices.get('id')!.get(arg)
    } else {
      const [field, value] = Object.entries(arg)[0] as [keyof T, any]
      if (!this.indices.has(field)) {
        this.createIndex(field)
      }
      return this.indices.get(field)!.get(value)
    }
  }

  private createIndex(field: keyof T): void {
    if (this.indices.has(field)) return
    const indexMap = new Map<any, T>()
    this.items.forEach(item => {
      indexMap.set(item[field], item)
    })
    this.indices.set(field, indexMap)
    this.bus.emit(Events.IndexCreate, field)
  }

  /**
   * Возвращает реактивный массив всех элементов.
   */
  get all(): Array<T> {
    return this.items
  }

  /**
   * Возвращает массив корневых элементов (без parentId).
   */
  get allRoot(): Array<T> {
    return Array.from(this.rootIds).map(id => this.get(id)!)
  }

  // Доступ к подпискам
  on<K extends keyof CollectionEvents<T>>(
    event: K,
    cb: (payload: CollectionEvents<T>[K]) => void,
  ): void {
    this.bus.on(event, cb)
  }

  off<K extends keyof CollectionEvents<T>>(
    event: K,
    cb: (payload: CollectionEvents<T>[K]) => void,
  ): void {
    this.bus.off(event, cb)
  }
}
