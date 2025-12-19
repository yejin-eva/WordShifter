/**
 * WordShifter Ollama proxy with CORS support.
 *
 * Why this exists:
 * - GitHub Pages serves WordShifter over HTTPS.
 * - Browsers block HTTPS pages from calling http://localhost:11434 (mixed content).
 * - Browsers also enforce CORS for cross-origin requests.
 *
 * This proxy:
 * - Forwards requests to Ollama (default: http://localhost:11434)
 * - Adds CORS headers for allowed origins (default includes WordShifter GitHub Pages)
 *
 * Usage:
 *   npm run ollama:proxy
 *
 * Env:
 *   OLLAMA_UPSTREAM=http://localhost:11434
 *   PROXY_PORT=8787
 *   ALLOWED_ORIGINS=https://yejin-eva.github.io,http://localhost:5173
 */

import http from 'node:http'
import { URL } from 'node:url'

const upstream = new URL(process.env.OLLAMA_UPSTREAM || 'http://localhost:11434')
const port = Number(process.env.PROXY_PORT || 8787)

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://yejin-eva.github.io,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)

function getCorsOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return null
  return allowedOrigins.has(origin) ? origin : null
}

function setCorsHeaders(res, origin) {
  if (!origin) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control'
  )
  res.setHeader('Access-Control-Max-Age', '86400')
}

function filterRequestHeaders(headers) {
  // Remove hop-by-hop headers + headers we shouldn't forward.
  const hopByHop = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
    'origin',
    'referer',
  ])

  const out = new Headers()
  for (const [k, v] of Object.entries(headers)) {
    if (!v) continue
    const key = k.toLowerCase()
    if (hopByHop.has(key)) continue
    if (Array.isArray(v)) {
      for (const item of v) out.append(k, item)
    } else {
      out.set(k, v)
    }
  }
  return out
}

const server = http.createServer(async (req, res) => {
  const origin = getCorsOrigin(req)
  setCorsHeaders(res, origin)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  try {
    const incomingUrl = new URL(req.url || '/', 'http://proxy.local')
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstream)

    const headers = filterRequestHeaders(req.headers)

    const method = req.method || 'GET'
    const hasBody = method !== 'GET' && method !== 'HEAD'

    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? req : undefined,
      // @ts-ignore - Node's fetch supports duplex in undici; safe to set for streams.
      duplex: hasBody ? 'half' : undefined,
    })

    res.statusCode = upstreamRes.status

    // Copy upstream headers (except hop-by-hop + content-encoding quirks)
    upstreamRes.headers.forEach((value, key) => {
      const k = key.toLowerCase()
      if (k === 'transfer-encoding') return
      if (k === 'connection') return
      // Keep our CORS headers (already set)
      if (k.startsWith('access-control-')) return
      res.setHeader(key, value)
    })

    if (!upstreamRes.body) {
      res.end()
      return
    }

    const reader = upstreamRes.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
    res.end()
  } catch (err) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: 'proxy_error',
        message: err?.message || String(err),
        upstream: upstream.toString(),
      })
    )
  }
})

server.listen(port, () => {
  console.log(`[wordshifter] Ollama CORS proxy listening on http://localhost:${port}`)
  console.log(`[wordshifter] Upstream: ${upstream.toString()}`)
  console.log(`[wordshifter] Allowed origins: ${Array.from(allowedOrigins).join(', ') || '(none)'}`)
})


