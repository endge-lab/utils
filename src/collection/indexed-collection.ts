import type { CollectionOptions, IndexCollectionEntity } from '@/collection/collection.types'
import type { OneOrMany } from '@/tools/tools.types'

/**
 * Высокопроизводительная IndexedCollection
 *
 * Цели:
 * - O(1) добавление, удаление и доступ по id
 * - O(1) обновление membership фильтра (dense массив + swap-remove)
 * - Ленивый sort, полный пересчет только по запросу
 * - Инкрементальная поддержка filteredList (swap-remove) при включенном filterIndexEnabled
 *
 * Важно:
 * - При sort list меняется порядок -> filteredList должен быть пересобран (иначе он останется в старом порядке).
 * - При изменении filterFn можно пересобрать filteredList без пересортировки list.
 */
export class IndexedCollection<T extends IndexCollectionEntity<ID>, ID = string | null> {
  private _list: Array<T> = []
  private _filteredList: Array<T> = []

  private _map: Map<ID, T> = new Map()
  private _indexById: Map<ID, number> = new Map()

  private _dirtySort = false
  private _dirtyFilter = false

  private _sortFn?: (a: T, b: T) => number
  private _filterFn?: (item: T) => boolean
  private _indexEnabled = false
  private _filterIndexEnabled = false

  /**
   * Создает экземпляр IndexedCollection и подготавливает базовое состояние.
   */
  constructor(opts: Partial<CollectionOptions<T, ID>> | null = null) {
    if (opts) {
      this.options(opts)
    }
  }

  /**
   * Выполняет действие options в рамках ответственности IndexedCollection.
   */
  options(opts: Partial<CollectionOptions<T, ID>>): this {
    if (Object.hasOwn(opts, 'sortFn')) {
      this._sortFn = opts.sortFn
      this._dirtySort = true
    }

    if (Object.hasOwn(opts, 'filterFn')) {
      this._filterFn = opts.filterFn
      this._dirtyFilter = true
    }

    if (opts.indexEnabled !== undefined) {
      this._indexEnabled = opts.indexEnabled
      this._dirtySort = true
    }

    if (opts.filterIndexEnabled !== undefined) {
      this._filterIndexEnabled = opts.filterIndexEnabled
      this._dirtyFilter = true
    }

    return this
  }

  /**
   * Выполняет действие markDirty в рамках ответственности IndexedCollection.
   */
  markDirty(opts: { filter?: boolean, sort?: boolean }): void {
    if (opts.sort) {
      this._dirtySort = true
    }
    if (opts.filter) {
      this._dirtyFilter = true
    }
  }

  /**
   * Выполняет действие ensure в рамках ответственности IndexedCollection.
   */
  ensure(): void {
    this.ensureSorted()
    this.ensureFiltered()
  }

  // Сортировка list, если нужно
  /**
   * Выполняет действие ensureSorted в рамках ответственности IndexedCollection.
   */
  ensureSorted(): void {
    if (this._dirtySort) {
      if (this._sortFn) {
        this._list.sort(this._sortFn)
      }

      // пересобираем indexById + index
      this._indexById.clear()
      for (let i = 0; i < this._list.length; i++) {
        const item = this._list[i]!
        this._indexById.set(item.id, i)
        if (this._indexEnabled) {
          item.index = i
        }
      }

      // если включён фильтр, порядок filteredList теперь потенциально неверный
      if (this._filterFn) {
        this._dirtyFilter = true
      }

      this._dirtySort = false
    }
  }

  // Фильтр, если нужно
  /**
   * Выполняет действие ensureFiltered в рамках ответственности IndexedCollection.
   */
  ensureFiltered(): void {
    if (this._dirtyFilter) {
      this._rebuildFilteredFromScratch()
      this._dirtyFilter = false
    }
  }

  /**
   * Выполняет действие add в рамках ответственности IndexedCollection.
   */
  add(items: OneOrMany<T>): void {
    const toAdd: Array<T> = Array.isArray(items) ? items : [items]

    for (const item of toAdd) {
      if (this._map.has(item.id)) {
        continue
      }

      const idx = this._list.length
      this._list.push(item)

      this._map.set(item.id, item)
      this._indexById.set(item.id, idx)

      if (this._indexEnabled) {
        item.index = idx
      }
      if (this._filterIndexEnabled) {
        item.filteredIndex = -1
      }

      this._addToFilteredIfPasses(item)
    }

    if (this._sortFn) {
      this._dirtySort = true
    }
  }

  /**
   * Удаляет сущность из runtime-коллекции IndexedCollection.
   */
  remove(ids: OneOrMany<ID>): void {
    const toRemove = Array.isArray(ids) ? ids : [ids]

    for (const id of toRemove) {
      const item = this._map.get(id)
      if (!item) {
        continue
      }

      this._removeFromFilteredO1(item)
      this._removeFromListO1(id)

      this._map.delete(id)

      if (this._indexEnabled) {
        item.index = -1
      }
      if (this._filterIndexEnabled) {
        item.filteredIndex = -1
      }
    }

    if (this._sortFn) {
      this._dirtySort = true
    }
  }

  /**
   * Вызывать после изменения полей элемента
   * mayAffectFilter если изменились поля фильтра
   * mayAffectSort если изменились поля сортировки
   */
  touch(id: ID, opts: { mayAffectFilter?: boolean, mayAffectSort?: boolean } = {}): void {
    const item = this._map.get(id)
    if (!item) {
      return
    }

    if (opts.mayAffectFilter !== false) {
      // Если умеем инкрементально — делаем O(1).
      // Если не умеем — отмечаем грязным и пересоберем в ensure().
      this._refilterOneO1(item)
      if (!this._filterIndexEnabled && this._filterFn) {
        // без filterIndexEnabled мы не держим membership инкрементально
        // поэтому просто пометим dirtyFilter (если фильтр вообще есть)
        this._dirtyFilter = true
      }
    }

    if (opts.mayAffectSort !== false && this._sortFn) {
      this._dirtySort = true
    }
  }

  /**
   * Выполняет действие forEach в рамках ответственности IndexedCollection.
   */
  forEach(callback: (item: T, index: number) => void): void {
    this.ensure()
    const src = this._filterFn ? this._filteredList : this._list
    for (let i = 0; i < src.length; i++) {
      callback(src[i]!, i)
    }
  }

  /**
   * Отсортированный и/или отфильтрованный список (в зависимости от включенных функций).
   */
  all(): Array<T> {
    return this.filtered()
  }

  /**
   * Отсортированный полный список (без фильтра), если есть sortFn.
   */
  unfiltered(): Array<T> {
    this.ensureSorted()
    return this._list
  }

  /**
   * Отсортированный и отфильтрованный список (если есть filterFn).
   * Если filterFn нет — возвращается list.
   */
  filtered(): Array<T> {
    this.ensure()
    return this._filterFn ? this._filteredList : this._list
  }

  /**
   * Выполняет действие pos в рамках ответственности IndexedCollection.
   */
  pos(index: number): T | null {
    const all = this.all()
    if (index < 0 || index >= all.length) {
      return null
    }
    return all[index] ?? null
  }

  /**
   * Выполняет действие first в рамках ответственности IndexedCollection.
   */
  first(): T | null {
    const all = this.all()
    return all.length ? all[0] ?? null : null
  }

  /**
   * Выполняет действие last в рамках ответственности IndexedCollection.
   */
  last(): T | null {
    const all = this.all()
    return all.length ? all[all.length - 1] ?? null : null
  }

  /**
   * Выполняет действие has в рамках ответственности IndexedCollection.
   */
  has(id: ID): boolean {
    return this._map.has(id)
  }

  /**
   * Возвращает значение состояния IndexedCollection.
   */
  get(id: ID): T | undefined {
    return this._map.get(id)
  }

  /**
   * Выполняет действие size в рамках ответственности IndexedCollection.
   */
  size(): number {
    return this.all().length
  }

  /**
   * Очищает накопленное состояние IndexedCollection.
   */
  clear(): void {
    this._list = []
    this._filteredList = []
    this._map.clear()
    this._indexById.clear()
    this._dirtySort = false
    this._dirtyFilter = false
  }

  /**
   * Выполняет внутренний шаг rebuildFilteredFromScratch для IndexedCollection.
   */
  private _rebuildFilteredFromScratch(): void {
    // Если фильтра нет — filteredList не используется
    if (!this._filterFn) {
      this._filteredList = []
      if (this._filterIndexEnabled) {
        for (const item of this._list) {
          item.filteredIndex = -1
        }
      }
      return
    }

    this._filteredList = []

    if (this._filterIndexEnabled) {
      for (const item of this._list) {
        item.filteredIndex = -1
      }
    }

    // ВАЖНО: строим в порядке list => filteredList тоже будет отсортирован, если list отсортирован
    for (const item of this._list) {
      if (!this._filterFn(item)) {
        continue
      }
      this._appendToFiltered(item)
    }
  }

  /**
   * Выполняет внутренний шаг addToFilteredIfPasses для IndexedCollection.
   */
  private _addToFilteredIfPasses(item: T): void {
    if (!this._filterFn) {
      return
    }

    // Если filterIndexEnabled выключен, мы НЕ поддерживаем filteredList инкрементально.
    // В этом режиме filteredList считается “ленивым” и будет построен через ensure().
    if (!this._filterIndexEnabled) {
      this._dirtyFilter = true
      return
    }

    if ((item.filteredIndex ?? -1) >= 0) {
      return
    }

    if (this._filterFn(item)) {
      this._appendToFiltered(item)
    }
  }

  /**
   * Добавляет сущность в runtime-коллекцию IndexedCollection.
   */
  private _appendToFiltered(item: T): void {
    const idx = this._filteredList.length
    this._filteredList.push(item)
    if (this._filterIndexEnabled) {
      item.filteredIndex = idx
    }
  }

  /**
   * Выполняет внутренний шаг refilterOneO1 для IndexedCollection.
   */
  private _refilterOneO1(item: T): boolean {
    if (!this._filterFn) {
      return false
    }
    if (!this._filterIndexEnabled) {
      return false
    }

    const passes = this._filterFn(item)
    const idx = item.filteredIndex ?? -1
    const inFiltered = idx >= 0

    if (passes) {
      if (inFiltered) {
        return false
      }
      this._appendToFiltered(item)
      return true
    }

    if (!inFiltered) {
      return false
    }
    this._removeFromFilteredO1(item)
    return true
  }

  /**
   * Удаляет сущность из runtime-коллекции IndexedCollection.
   */
  private _removeFromFilteredO1(item: T): void {
    if (!this._filterIndexEnabled) {
      return
    }

    const idx = item.filteredIndex ?? -1
    if (idx < 0) {
      return
    }

    const lastIdx = this._filteredList.length - 1
    if (idx !== lastIdx) {
      const last = this._filteredList[lastIdx]!
      this._filteredList[idx] = last
      last.filteredIndex = idx
    }

    this._filteredList.pop()
    item.filteredIndex = -1
  }

  /**
   * Удаляет сущность из runtime-коллекции IndexedCollection.
   */
  private _removeFromListO1(id: ID): void {
    const idx = this._indexById.get(id)
    if (idx === undefined) {
      return
    }

    const lastIdx = this._list.length - 1
    if (idx !== lastIdx) {
      const last = this._list[lastIdx]!
      this._list[idx] = last
      this._indexById.set(last.id, idx)
      if (this._indexEnabled) {
        last.index = idx
      }
    }

    this._list.pop()
    this._indexById.delete(id)
  }
}
