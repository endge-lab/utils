import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { consoleErrorSummary } from '@/tools/console'

export interface SSEManagerOptions {
  url: string
  retryInterval?: number
  headers?: Record<string, string>
  getToken?: () => string | undefined | Promise<string | undefined>
  onEvent: (data: any) => void
  onError?: (error: Error) => void
  onOpen?: () => void
  onClose?: () => void
}

export class SSEManager {
  private readonly _url: string
  private readonly _retryInterval: number
  private _abortController: AbortController | null = null
  private _isConnected = false
  private _reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly _options: SSEManagerOptions

  public constructor(options: SSEManagerOptions) {
    this._url = options.url
    this._retryInterval = options.retryInterval ?? 3000
    this._options = options
  }

  public start(): void {
    if (this._abortController) {
      return
    }
    const controller = new AbortController()
    this._abortController = controller
    void this._connect(controller)
  }

  public stop(): void {
    this._clearReconnect()
    this._isConnected = false
    const controller = this._abortController
    this._abortController = null
    controller?.abort()
  }

  private _isCurrent(controller: AbortController): boolean {
    return this._abortController === controller && !controller.signal.aborted
  }

  private _scheduleReconnect(controller: AbortController): void {
    if (!this._isCurrent(controller)) {
      return
    }
    this._clearReconnect()
    this._reconnectTimeout = setTimeout(() => {
      if (this._isCurrent(controller)) {
        this.stop()
        this.start()
      }
    }, this._retryInterval)
  }

  private _clearReconnect(): void {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout)
      this._reconnectTimeout = null
    }
  }

  private async _buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...this._options.headers }

    const token = await this._options.getToken?.()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  private async _connect(controller: AbortController): Promise<void> {
    try {
      const headers = await this._buildHeaders()
      // fetch-event-source does not reject an already aborted input signal.
      if (!this._isCurrent(controller)) {
        return
      }
      await fetchEventSource(this._url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        openWhenHidden: true,
        onopen: async (response) => {
          if (!this._isCurrent(controller)) {
            throw new Error('[SSEManager] Connection was stopped.')
          }
          const isStream = response.ok && response.headers.get('content-type')?.split(';')[0]?.trim() === EventStreamContentType

          if (isStream) {
            this._isConnected = true
            this._options.onOpen?.()
            return
          }

          throw new Error(`Unexpected response: ${response.status}`)
        },
        onmessage: (msg) => {
          if (!this._isCurrent(controller)) {
            return
          }
          try {
            this._options.onEvent(JSON.parse(msg.data))
          }
          catch (err) {
            console.warn(`[SSEManager] Failed to parse message: ${consoleErrorSummary(err)}`)
          }
        },
        onclose: () => {
          if (this._isCurrent(controller)) {
            this._isConnected = false
            this._options.onClose?.()
          }
        },
        // Retry belongs to this manager. Throwing disables the library's retry loop.
        onerror: (error) => { throw error },
      })
    }
    catch (err) {
      if (this._isCurrent(controller)) {
        this._isConnected = false
        try {
          this._options.onError?.(err instanceof Error ? err : new Error(String(err)))
        }
        catch (callbackError) {
          console.warn(`[SSEManager] Error callback failed: ${consoleErrorSummary(callbackError)}`)
        }
      }
    }
    finally {
      if (this._isCurrent(controller)) {
        this._isConnected = false
        this._scheduleReconnect(controller)
      }
    }
  }

  public get isConnected(): boolean {
    return this._isConnected
  }
}
