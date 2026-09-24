import { describe, expect, it, vi } from 'vitest'

import { Collection } from '@/collection/collection'

describe('подписка Collection', () => {
  // Проверяет сохранение public subscription contract после внутренней замены notifier.
  it('уведомляет об изменении и поддерживает отписку', () => {
    const collection = new Collection<{ id: string }>()
    const listener = vi.fn()
    const unsubscribe = collection.subscribe(listener)

    collection.add({ id: 'first' })
    unsubscribe()
    collection.add({ id: 'second' })

    expect(listener).toHaveBeenCalledOnce()
  })
})
