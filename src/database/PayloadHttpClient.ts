export interface PayloadClientOptions {
  baseUrl: string
}

export class PayloadHttpClient {
  private readonly baseUrl: string

  constructor(opts: PayloadClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(
      path.replace(/^\//, ''),
      this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`,
    )

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null)
          continue
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  private buildHeaders(extra?: HeadersInit): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(extra || {}),
    }
  }

  async get<T>(
    path: string,
    query?: Record<string, unknown>,
    extraHeaders?: HeadersInit,
  ): Promise<T> {
    const res = await fetch(this.buildUrl(path, query), {
      method: 'GET',
      headers: this.buildHeaders(extraHeaders),
      credentials: 'include',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Payload GET ${path} failed: ${res.status} ${res.statusText} ${text}`)
    }

    return await res.json() as T
  }

  async post<T>(
    path: string,
    body?: unknown,
    extraHeaders?: HeadersInit,
  ): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: 'POST',
      headers: this.buildHeaders(extraHeaders),
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Payload POST ${path} failed: ${res.status} ${res.statusText} ${text}`)
    }

    return await res.json() as T
  }

  async patch<T>(
    path: string,
    body?: unknown,
    extraHeaders?: HeadersInit,
  ): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: 'PATCH',
      headers: this.buildHeaders(extraHeaders),
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Payload PATCH ${path} failed: ${res.status} ${res.statusText} ${text}`)
    }

    return await res.json() as T
  }

  async delete<T>(path: string, extraHeaders?: HeadersInit): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: 'DELETE',
      headers: this.buildHeaders(extraHeaders),
      credentials: 'include',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Payload DELETE ${path} failed: ${res.status} ${res.statusText} ${text}`)
    }

    return await res.json().catch(() => ({})) as T
  }
}
