import { describe, expect, it } from 'vitest'

import { consoleErrorSummary, consoleValueSummary } from '@/tools/console'

describe('безопасность памяти console', () => {
  it('создаёт summary контейнеров без обхода их содержимого', () => {
    const explosive = new Proxy({}, {
      ownKeys: () => { throw new Error('must not traverse') },
      get: (_target, key) => key === 'constructor' ? { name: 'Explosive' } : undefined,
    })

    expect(consoleValueSummary(Array.from({ length: 5 }))).toBe('Array(5)')
    expect(consoleValueSummary(new Map([['id', explosive]]))).toBe('Map(1)')
    expect(consoleValueSummary(explosive)).toBe('Explosive')
  })

  it('проецирует ошибки в строки', () => {
    const error = new Error('failed')
    expect(consoleErrorSummary(error)).toBe('Error: failed')
    expect(consoleErrorSummary({ huge: Array.from({ length: 100 }).fill('x') })).toBe('Object')
  })
})
