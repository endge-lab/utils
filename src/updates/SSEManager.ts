import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'

export interface SSEManagerOptions {
  url: string
  retryInterval?: number
  headers?: Record<string, string>
  getToken?: () => string | undefined
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

  constructor(options: SSEManagerOptions) {
    this._url = options.url
    this._retryInterval = options.retryInterval ?? 3000
    this._options = options
  }

  public start(): void {
    this._abortController = new AbortController()
    this._connect()
  }

  public stop(): void {
    this._clearReconnect()
    this._isConnected = false
    this._abortController?.abort()
    this._abortController = null
  }

  private _scheduleReconnect(): void {
    this._clearReconnect()
    this._reconnectTimeout = setTimeout(() => this.start(), this._retryInterval)
  }

  private _clearReconnect(): void {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout)
      this._reconnectTimeout = null
    }
  }

  private _buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { ...this._options.headers }

    const token = this._options.getToken?.()
    if (token)
      headers.Authorization = `Bearer ${token}`

    return headers
  }

  private async _connect(): Promise<void> {
    try {
      await fetchEventSource(this._url, {
        method: 'GET',
        headers: this._buildHeaders(),
        signal: this._abortController?.signal,
        openWhenHidden: true,
        onopen: (response) => {
          const isStream = response.ok && response.headers.get('content-type') === EventStreamContentType

          if (isStream) {
            this._isConnected = true
            this._options.onOpen?.()
            return
          }

          throw new Error(`Unexpected response: ${response.status}`)
        },
        onmessage: (msg) => {
          try {
            this._options.onEvent(JSON.parse(msg.data))
          } catch (err) {
            console.warn('[SSEManager] Failed to parse message', err)
          }
        },
        onclose: () => {
          this._isConnected = false
          this._options.onClose?.()
          this._scheduleReconnect()
        },
        onerror: (err) => {
          this._isConnected = false
          this._options.onError?.(err instanceof Error ? err : new Error(String(err)))
          this._scheduleReconnect()
        },
      })
    } catch (err) {
      console.error('[SSEManager] Fatal error', err)
      this._isConnected = false
      this._options.onError?.(err instanceof Error ? err : new Error(String(err)))
      this._scheduleReconnect()
    }
  }

  get isConnected(): boolean {
    return this._isConnected
  }
}
