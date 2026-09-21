import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SSEManager } from '@/updates/SSEManager'

// Uses the installed fetch-event-source implementation, with only browser I/O replaced.
describe('sse manager transport ownership', () => {
  const managers: SSEManager[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('document', new EventTarget())
    vi.stubGlobal('window', { fetch: vi.fn(), setTimeout, clearTimeout })
  })
  afterEach(() => {
    managers.forEach(manager => manager.stop())
    managers.length = 0
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  function manager(options: Partial<ConstructorParameters<typeof SSEManager>[0]> = {}) {
    const value = new SSEManager({ url: 'https://events.test', retryInterval: 5000, onEvent: vi.fn(), ...options })
    managers.push(value)
    return value
  }

  it('does not open a connection when token resolution finishes after stop', async () => {
    let resolve!: (value: string) => void
    const value = manager({ getToken: () => new Promise((next) => {
      resolve = next
    }) })
    value.start()
    value.stop()
    resolve('late')
    await vi.advanceTimersByTimeAsync(10000)
    expect(window.fetch).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('has one retry loop and aborts the current request after repeated errors', async () => {
    const signals: AbortSignal[] = []
    vi.mocked(window.fetch).mockImplementation(async (_, init) => {
      signals.push(init!.signal!)
      throw new Error('network unavailable')
    })
    const onError = vi.fn()
    const value = manager({ onError })
    value.start()
    value.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(window.fetch).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(window.fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(14000)
    expect(window.fetch).toHaveBeenCalledTimes(4)
    expect(onError).toHaveBeenCalledTimes(4)
    value.stop()
    await vi.advanceTimersByTimeAsync(20000)
    expect(window.fetch).toHaveBeenCalledTimes(4)
    expect(signals.every(signal => signal.aborted)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops an open reader and permits one new start with fresh credentials', async () => {
    const signals: AbortSignal[] = []
    const getToken = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    vi.mocked(window.fetch).mockImplementation(async (_, init) => {
      signals.push(init!.signal!)
      return new Response(new ReadableStream({ start(controller) {
        init!.signal!.addEventListener('abort', () => controller.error(new DOMException('stopped', 'AbortError')))
      } }), { headers: { 'content-type': 'text/event-stream; charset=utf-8' } })
    })
    const onOpen = vi.fn()
    const value = manager({ getToken, onOpen })
    value.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(value.isConnected).toBe(true)
    value.stop()
    expect(signals[0].aborted).toBe(true)
    value.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(window.fetch).toHaveBeenCalledTimes(2)
    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(vi.mocked(window.fetch).mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer second' })
    value.stop()
    await vi.advanceTimersByTimeAsync(10000)
    expect(signals.every(signal => signal.aborted)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cannot reconnect after stop inside an error callback or after an obsolete token', async () => {
    let resolve!: (value: string) => void
    const getToken = vi.fn().mockImplementationOnce(() => new Promise((next) => {
      resolve = next
    })).mockResolvedValue('fresh')
    vi.mocked(window.fetch).mockRejectedValue(new Error('denied'))
    const value = manager({ getToken, onError: () => value.stop() })
    value.start()
    value.stop()
    value.start()
    await vi.advanceTimersByTimeAsync(0)
    resolve('obsolete')
    await vi.advanceTimersByTimeAsync(10000)
    expect(window.fetch).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
