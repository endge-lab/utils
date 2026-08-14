import { describe, expect, it } from 'vitest'

import { consoleErrorSummary, consoleValueSummary } from '@/tools/console'

describe('console memory safety', () => {
  it('summarizes containers without traversing their contents', () => {
    const explosive = new Proxy({}, {
      ownKeys: () => { throw new Error('must not traverse') },
      get: (_target, key) => key === 'constructor' ? { name: 'Explosive' } : undefined,
    })

    expect(consoleValueSummary(Array.from({ length: 5 }))).toBe('Array(5)')
    expect(consoleValueSummary(new Map([['id', explosive]]))).toBe('Map(1)')
    expect(consoleValueSummary(explosive)).toBe('Explosive')
  })

  it('projects errors to strings', () => {
    const error = new Error('failed')
    expect(consoleErrorSummary(error)).toBe('Error: failed')
    expect(consoleErrorSummary({ huge: Array(100).fill('x') })).toBe('Object')
  })
})
