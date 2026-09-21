import type {
  CollectionEntity,
  CollectionEvents,
} from '@/collection/collection.types'
import { Events } from '@/collection/collection.types'
import { EventBus } from '@/events/EventBus'
import { Subscribable } from '@/events/Subscribable'

/**
 * Описывает ответственность Collection в архитектуре проекта.
 */
export class Collection<T extends CollectionEntity> extends Subscribable {
  private _items: Array<T> = []
  private _indices: Map<keyof T, Map<any, T>> = new Map()
  private _rootIds: Set<string> = new Set()
  private _bus: EventBus<CollectionEvents<T>>

  /**
   * Создает экземпляр Collection и подготавливает базовое состояние.
   */
  constructor(initialItems: Array<T> = []) {
    super()
    this._bus = new EventBus<CollectionEvents<T>>(Object.values(Events))
    if (initialItems.length) {
      this.add(initialItems)
    }
    this._createIndex('id')
  }

  /**
   * Выполняет действие add в рамках ответственности Collection.
   */
  add(items: T | Array<T>): void {
    const list = Array.isArray(items) ? items : [items]
    list.forEach((item) => {
      this._items.push(item)
      this._indices.forEach((indexMap, field) => {
        indexMap.set(item[field], item)
      })
      if (!item.parentId) {
        this._rootIds.add(item.id)
      }
    })
    if (list?.length) {
      this._bus.emit(Events.Add, list)
      this.notify()
    }
  }

  /**
   * Удаляет сущность из runtime-коллекции Collection.
   */
  remove(arg: string | T | Array<string | T>): void {
    const list: Array<string | T> = Array.isArray(arg) ? arg : [arg]
    const removedItems: Array<T> = []

    list.forEach((itemOrId) => {
      const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id
      const index = this._items.findIndex(i => i.id === id)

      if (index !== -1) {
        const [removed] = this._items.splice(index, 1)

        // Удаляем из всех индексов
        this._indices.forEach((indexMap, field) => {
          indexMap.delete(removed[field])
        })

        if (!removed.parentId) {
          this._rootIds.delete(removed.id)
        }

        removedItems.push(removed)
      }
    })

    if (removedItems.length) {
      this._bus.emit(Events.Remove, removedItems)
      this.notify()
    }
  }

  /**
   * Обновляет runtime-состояние Collection.
   */
  update(itemOrItems: T | Array<T>): void {
    const list = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]
    list.forEach((item) => {
      const existing = this.get(item.id)
      if (existing) {
        Object.assign(existing, item)
        this._indices.forEach((indexMap, field) => {
          indexMap.set(item[field], existing)
        })
      }
    })
    if (list?.length) {
      this._bus.emit(Events.Update, list)
      this.notify()
    }
  }

  /**
   * Возвращает значение состояния Collection.
   */
  get(arg: string | Partial<T>): T | undefined {
    if (typeof arg === 'string') {
      return this._indices.get('id')!.get(arg)
    }
    else {
      const [field, value] = Object.entries(arg)[0] as [keyof T, any]
      if (!this._indices.has(field)) {
        this._createIndex(field)
      }
      return this._indices.get(field)!.get(value)
    }
  }

  /**
   * Создает runtime-сущность Collection.
   */
  private _createIndex(field: keyof T): void {
    if (this._indices.has(field)) {
      return
    }
    const indexMap = new Map<any, T>()
    this._items.forEach((item) => {
      indexMap.set(item[field], item)
    })
    this._indices.set(field, indexMap)
    this._bus.emit(Events.IndexCreate, field)
  }

  /**
   * Возвращает реактивный массив всех элементов.
   */
  get all(): Array<T> {
    return this._items
  }

  /**
   * Возвращает массив корневых элементов (без parentId).
   */
  get allRoot(): Array<T> {
    return Array.from(this._rootIds).map(id => this.get(id)!)
  }

  // Доступ к подпискам
  /**
   * Обрабатывает входящее событие Collection.
   */
  on<K extends keyof CollectionEvents<T>>(
    event: K,
    cb: (payload: CollectionEvents<T>[K]) => void,
  ): void {
    this._bus.on(event, cb)
  }

  /**
   * Выполняет действие off в рамках ответственности Collection.
   */
  off<K extends keyof CollectionEvents<T>>(
    event: K,
    cb: (payload: CollectionEvents<T>[K]) => void,
  ): void {
    this._bus.off(event, cb)
  }
}
