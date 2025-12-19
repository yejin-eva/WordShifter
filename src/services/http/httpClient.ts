import { Capacitor } from '@capacitor/core'
import { Http } from '@capacitor-community/http'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type JsonRequest = {
  method: HttpMethod
  url: string
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

export type JsonResponse = {
  ok: boolean
  status: number
  statusText?: string
  data: any
  rawText?: string
}

function isNative(): boolean {
  // True when running under Capacitor (Android/iOS).
  // In browser/PWA this will be false.
  return Capacitor.isNativePlatform()
}

export async function requestJson(req: JsonRequest): Promise<JsonResponse> {
  const { method, url, headers, body, timeoutMs } = req

  if (isNative()) {
    // Native HTTP (bypasses browser CORS).
    // Important: avoid passing undefined/null fields to the native plugin.
    // Some plugin/AGP combos can crash (NullPointerException) if optional fields are present but null.
    const options: any = {
      method,
      url,
      headers,
    }
    if (typeof timeoutMs === 'number') {
      options.connectTimeout = timeoutMs
      options.readTimeout = timeoutMs
    }
    if (body !== undefined) {
      options.data = body
    }

    const res = await Http.request(options)

    // Plugin returns `data` already parsed if JSON; `status` is number.
    const status = typeof res.status === 'number' ? res.status : 0
    const ok = status >= 200 && status < 300
    return { ok, status, data: res.data }
  }

  // Browser fetch fallback.
  const controller = timeoutMs ? new AbortController() : undefined
  const timeoutId =
    timeoutMs && controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(headers ?? {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    })

    const status = res.status
    const ok = res.ok
    const text = await res.text().catch(() => '')
    const data = (() => {
      try {
        return text ? JSON.parse(text) : null
      } catch {
        return null
      }
    })()

    return { ok, status, statusText: res.statusText, data, rawText: text }
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId)
  }
}


