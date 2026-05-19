import type { OneOrMany } from '@/tools/tools.types'
import type { CollectionOptions, IndexCollectionEntity } from '@/collection/collection.types'

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
  private list: Array<T> = []
  private filteredList: Array<T> = []

  private map: Map<ID, T> = new Map()
  private indexById: Map<ID, number> = new Map()

  private dirtySort = false
  private dirtyFilter = false

  private sortFn?: (a: T, b: T) => number
  private filterFn?: (item: T) => boolean
  private indexEnabled = false
  private filterIndexEnabled = false

  /**
   * Создает экземпляр IndexedCollection и подготавливает базовое состояние.
   */
  constructor(opts: Partial<CollectionOptions<T, ID>> | null = null) {
    if (opts) this.options(opts)
  }

  /**
   * Выполняет действие options в рамках ответственности IndexedCollection.
   */
  options(opts: Partial<CollectionOptions<T, ID>>): this {
    if (Object.prototype.hasOwnProperty.call(opts, 'sortFn')) {
      this.sortFn = opts.sortFn
      this.dirtySort = true
    }

    if (Object.prototype.hasOwnProperty.call(opts, 'filterFn')) {
      this.filterFn = opts.filterFn
      this.dirtyFilter = true
    }

    if (opts.indexEnabled !== undefined) {
      this.indexEnabled = opts.indexEnabled
      this.dirtySort = true
    }

    if (opts.filterIndexEnabled !== undefined) {
      this.filterIndexEnabled = opts.filterIndexEnabled
      this.dirtyFilter = true
    }

    return this
  }

  /**
   * Выполняет действие markDirty в рамках ответственности IndexedCollection.
   */
  markDirty(opts: { filter?: boolean; sort?: boolean }): void {
    if (opts.sort) this.dirtySort = true
    if (opts.filter) this.dirtyFilter = true
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
    if (this.dirtySort) {
      if (this.sortFn) {
        this.list.sort(this.sortFn)
      }

      // пересобираем indexById + index
      this.indexById.clear()
      for (let i = 0; i < this.list.length; i++) {
        const item = this.list[i]!
        this.indexById.set(item.id, i)
        if (this.indexEnabled) item.index = i
      }

      // если включён фильтр, порядок filteredList теперь потенциально неверный
      if (this.filterFn) {
        this.dirtyFilter = true
      }

      this.dirtySort = false
    }
  }

  // Фильтр, если нужно
  /**
   * Выполняет действие ensureFiltered в рамках ответственности IndexedCollection.
   */
  ensureFiltered(): void {
    if (this.dirtyFilter) {
      this.rebuildFilteredFromScratch()
      this.dirtyFilter = false
    }
  }

  /**
   * Выполняет действие add в рамках ответственности IndexedCollection.
   */
  add(items: OneOrMany<T>): void {
    const toAdd: Array<T> = Array.isArray(items) ? items : [items]

    for (const item of toAdd) {
      if (this.map.has(item.id)) continue

      const idx = this.list.length
      this.list.push(item)

      this.map.set(item.id, item)
      this.indexById.set(item.id, idx)

      if (this.indexEnabled) item.index = idx
      if (this.filterIndexEnabled) item.filteredIndex = -1

      this.addToFilteredIfPasses(item)
    }

    if (this.sortFn) this.dirtySort = true
  }

  /**
   * Удаляет сущность из runtime-коллекции IndexedCollection.
   */
  remove(ids: OneOrMany<ID>): void {
    const toRemove = Array.isArray(ids) ? ids : [ids]

    for (const id of toRemove) {
      const item = this.map.get(id)
      if (!item) continue

      this.removeFromFilteredO1(item)
      this.removeFromListO1(id)

      this.map.delete(id)

      if (this.indexEnabled) item.index = -1
      if (this.filterIndexEnabled) item.filteredIndex = -1
    }

    if (this.sortFn) this.dirtySort = true
  }

  /**
   * Вызывать после изменения полей элемента
   * mayAffectFilter если изменились поля фильтра
   * mayAffectSort если изменились поля сортировки
   */
  touch(id: ID, opts: { mayAffectFilter?: boolean; mayAffectSort?: boolean } = {}): void {
    const item = this.map.get(id)
    if (!item) return

    if (opts.mayAffectFilter !== false) {
      // Если умеем инкрементально — делаем O(1).
      // Если не умеем — отмечаем грязным и пересоберем в ensure().
      this.refilterOneO1(item)
      if (!this.filterIndexEnabled && this.filterFn) {
        // без filterIndexEnabled мы не держим membership инкрементально
        // поэтому просто пометим dirtyFilter (если фильтр вообще есть)
        this.dirtyFilter = true
      }
    }

    if (opts.mayAffectSort !== false && this.sortFn) {
      this.dirtySort = true
    }
  }

  /**
   * Выполняет действие forEach в рамках ответственности IndexedCollection.
   */
  forEach(callback: (item: T, index: number) => void): void {
    this.ensure()
    const src = this.filterFn ? this.filteredList : this.list
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
    return this.list
  }

  /**
   * Отсортированный и отфильтрованный список (если есть filterFn).
   * Если filterFn нет — возвращается list.
   */
  filtered(): Array<T> {
    this.ensure()
    return this.filterFn ? this.filteredList : this.list
  }

  /**
   * Выполняет действие pos в рамках ответственности IndexedCollection.
   */
  pos(index: number): T | null {
    const all = this.all()
    if (index < 0 || index >= all.length) return null
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
    return this.map.has(id)
  }

  /**
   * Возвращает значение состояния IndexedCollection.
   */
  get(id: ID): T | undefined {
    return this.map.get(id)
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
    this.list = []
    this.filteredList = []
    this.map.clear()
    this.indexById.clear()
    this.dirtySort = false
    this.dirtyFilter = false
  }

  /**
   * Выполняет внутренний шаг rebuildFilteredFromScratch для IndexedCollection.
   */
  private rebuildFilteredFromScratch(): void {
    // Если фильтра нет — filteredList не используется
    if (!this.filterFn) {
      this.filteredList = []
      if (this.filterIndexEnabled) {
        for (const item of this.list) item.filteredIndex = -1
      }
      return
    }

    this.filteredList = []

    if (this.filterIndexEnabled) {
      for (const item of this.list) item.filteredIndex = -1
    }

    // ВАЖНО: строим в порядке list => filteredList тоже будет отсортирован, если list отсортирован
    for (const item of this.list) {
      if (!this.filterFn(item)) continue
      this.appendToFiltered(item)
    }
  }

  /**
   * Выполняет внутренний шаг addToFilteredIfPasses для IndexedCollection.
   */
  private addToFilteredIfPasses(item: T): void {
    if (!this.filterFn) return

    // Если filterIndexEnabled выключен, мы НЕ поддерживаем filteredList инкрементально.
    // В этом режиме filteredList считается “ленивым” и будет построен через ensure().
    if (!this.filterIndexEnabled) {
      this.dirtyFilter = true
      return
    }

    if ((item.filteredIndex ?? -1) >= 0) return

    if (this.filterFn(item)) {
      this.appendToFiltered(item)
    }
  }

  /**
   * Добавляет сущность в runtime-коллекцию IndexedCollection.
   */
  private appendToFiltered(item: T): void {
    const idx = this.filteredList.length
    this.filteredList.push(item)
    if (this.filterIndexEnabled) item.filteredIndex = idx
  }

  /**
   * Выполняет внутренний шаг refilterOneO1 для IndexedCollection.
   */
  private refilterOneO1(item: T): boolean {
    if (!this.filterFn) return false
    if (!this.filterIndexEnabled) return false

    const passes = this.filterFn(item)
    const idx = item.filteredIndex ?? -1
    const inFiltered = idx >= 0

    if (passes) {
      if (inFiltered) return false
      this.appendToFiltered(item)
      return true
    }

    if (!inFiltered) return false
    this.removeFromFilteredO1(item)
    return true
  }

  /**
   * Удаляет сущность из runtime-коллекции IndexedCollection.
   */
  private removeFromFilteredO1(item: T): void {
    if (!this.filterIndexEnabled) return

    const idx = item.filteredIndex ?? -1
    if (idx < 0) return

    const lastIdx = this.filteredList.length - 1
    if (idx !== lastIdx) {
      const last = this.filteredList[lastIdx]!
      this.filteredList[idx] = last
      last.filteredIndex = idx
    }

    this.filteredList.pop()
    item.filteredIndex = -1
  }

  /**
   * Удаляет сущность из runtime-коллекции IndexedCollection.
   */
  private removeFromListO1(id: ID): void {
    const idx = this.indexById.get(id)
    if (idx === undefined) return

    const lastIdx = this.list.length - 1
    if (idx !== lastIdx) {
      const last = this.list[lastIdx]!
      this.list[idx] = last
      this.indexById.set(last.id, idx)
      if (this.indexEnabled) last.index = idx
    }

    this.list.pop()
    this.indexById.delete(id)
  }
}
