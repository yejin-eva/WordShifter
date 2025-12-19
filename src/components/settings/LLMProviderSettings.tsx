import { useCallback, useState } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

type ApiCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; details?: string }
  | { status: 'error'; message: string }

export function LLMProviderSettings() {
  const {
    apiProvider,
    setApiProvider,
    openaiApiKey,
    setOpenAIApiKey,
    groqApiKey,
    setGroqApiKey,
  } = useSettingsStore()

  const [apiCheck, setApiCheck] = useState<ApiCheckState>({ status: 'idle' })

  const checkApi = useCallback(async () => {
    setApiCheck({ status: 'checking' })

    const provider = apiProvider
    const apiKey = provider === 'groq' ? groqApiKey : openaiApiKey

    if (!apiKey || !apiKey.trim()) {
      setApiCheck({ status: 'error', message: 'API key is missing' })
      return
    }

    const endpoint =
      provider === 'groq' ? 'https://api.groq.com/openai/v1/models' : 'https://api.openai.com/v1/models'

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(4000),
      })

      if (!res.ok) {
        setApiCheck({ status: 'error', message: `${provider.toUpperCase()} responded with ${res.status}` })
        return
      }

      const data: any = await res.json().catch(() => null)
      const count = Array.isArray(data?.data) ? data.data.length : undefined
      setApiCheck({
        status: 'ok',
        details: typeof count === 'number' ? `${count} models visible` : 'Connected',
      })
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect'
      if (/failed to fetch/i.test(msg)) {
        setApiCheck({
          status: 'error',
          message:
            'Request failed (“Failed to fetch”). This is often blocked by browser CORS in hosted apps. If this happens, use Ollama or an API proxy endpoint.',
        })
        return
      }
      setApiCheck({ status: 'error', message: msg })
    }
  }, [apiProvider, groqApiKey, openaiApiKey])
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Translation provider (API-only)
        </label>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          WordShifter is dictionary-first. LLMs are used for phrase translation and “Retry” on unknown words.
        </p>
      </div>

      <div className="space-y-3">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setApiProvider('openai')}
            className={`px-3 py-2 text-sm transition-colors ${
              apiProvider === 'openai'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            OpenAI
          </button>
          <button
            onClick={() => setApiProvider('groq')}
            className={`px-3 py-2 text-sm transition-colors ${
              apiProvider === 'groq'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Groq
          </button>
        </div>

        {apiProvider === 'openai' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              OpenAI API key{' '}
              <a
                className="text-xs underline font-normal"
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
              >
                (create one if you don’t have any)
              </a>
            </label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenAIApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="sk-…"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Stored locally on this device (localStorage). Don’t use this on a shared device.
            </p>
          </div>
        )}

        {apiProvider === 'groq' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Groq API key{' '}
              <a
                className="text-xs underline font-normal"
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
              >
                (create one if you don’t have any)
              </a>
            </label>
            <input
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="gsk_…"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Stored locally on this device (localStorage). Don’t use this on a shared device.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={checkApi}
            disabled={apiCheck.status === 'checking'}
            className="px-3 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm disabled:opacity-60"
          >
            {apiCheck.status === 'checking' ? 'Checking…' : 'Test API'}
          </button>

          {apiCheck.status === 'ok' && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Connection:</span> OK
              {apiCheck.details ? <span className="text-gray-500 dark:text-gray-400"> — {apiCheck.details}</span> : null}
            </div>
          )}

          {apiCheck.status === 'error' && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {apiCheck.message}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 text-sm text-yellow-900 dark:text-yellow-200">
          Note: Some API providers block direct browser requests (CORS). If “Test API” or translations fail with “Failed to fetch”,
          you may need to use an API proxy endpoint (server-side).
        </div>
      </div>
    </div>
  )
}


