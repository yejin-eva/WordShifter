import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/stores/useSettingsStore'

type OllamaCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; models: string[]; hasModel: boolean }
  | { status: 'error'; message: string }

type ApiCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; details?: string }
  | { status: 'error'; message: string }

function normalizeOllamaModelName(name: string): string {
  // Ollama tags often look like "qwen2.5:7b" or "qwen2.5:7b-instruct"
  return name.trim()
}

function extractModelNamesFromTagsResponse(data: unknown): string[] {
  // Expected shape: { models: [{ name: string, ... }, ...] }
  if (!data || typeof data !== 'object') return []
  const models = (data as any).models
  if (!Array.isArray(models)) return []
  return models
    .map((m) => (typeof m?.name === 'string' ? m.name : ''))
    .filter((n: string) => n.length > 0)
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  } catch {
    // Fallback for non-secure contexts
    window.prompt('Copy this:', text)
  }
}

export function LLMProviderSettings() {
  const {
    llmProvider,
    setLLMProvider,
    apiProvider,
    setApiProvider,
    ollamaUrl,
    setOllamaUrl,
    ollamaModel,
    setOllamaModel,
    openaiApiKey,
    setOpenAIApiKey,
    groqApiKey,
    setGroqApiKey,
  } = useSettingsStore()

  const [ollamaCheck, setOllamaCheck] = useState<OllamaCheckState>({ status: 'idle' })
  const [apiCheck, setApiCheck] = useState<ApiCheckState>({ status: 'idle' })

  const modelPresets = useMemo(
    () => [
      'qwen2.5:7b',
      'llama3.2',
      'llama3.1:8b',
      'mistral',
      'phi3',
    ],
    []
  )

  const normalizedModel = useMemo(() => normalizeOllamaModelName(ollamaModel), [ollamaModel])

  // Local UI choice state so selecting "Custom…" immediately reveals the input,
  // even if the current model is a preset and hasn't changed yet.
  const [modelChoice, setModelChoice] = useState<'preset' | 'custom'>(() =>
    modelPresets.includes(normalizedModel) ? 'preset' : 'custom'
  )

  // Keep modelChoice in sync if settings change externally (e.g. rehydration)
  useEffect(() => {
    setModelChoice(modelPresets.includes(normalizedModel) ? 'preset' : 'custom')
  }, [modelPresets, normalizedModel])

  const modelSelectValue = modelChoice === 'custom' ? 'custom' : normalizedModel

  const checkOllama = useCallback(async () => {
    const url = ollamaUrl.replace(/\/$/, '')
    setOllamaCheck({ status: 'checking' })

    try {
      const res = await fetch(`${url}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(4000) })
      if (!res.ok) {
        setOllamaCheck({ status: 'error', message: `Ollama responded with ${res.status}` })
        return
      }
      const data = await res.json()
      const models = extractModelNamesFromTagsResponse(data).map(normalizeOllamaModelName)
      const hasModel = models.some((m) => m === normalizedModel || m.startsWith(`${normalizedModel}:`))
      setOllamaCheck({ status: 'ok', models, hasModel })
    } catch (err: any) {
      setOllamaCheck({
        status: 'error',
        message: err?.message || 'Could not connect to Ollama. Is it running?',
      })
    }
  }, [ollamaUrl, normalizedModel])

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
          LLM Provider
        </label>

        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setLLMProvider('ollama')}
            className={`px-3 py-2 text-sm transition-colors ${
              llmProvider === 'ollama'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Ollama (Local)
          </button>
          <button
            onClick={() => setLLMProvider('api')}
            className={`px-3 py-2 text-sm transition-colors ${
              llmProvider === 'api'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            API
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          WordShifter is dictionary-first. LLMs are used for phrase translation and “Retry” on unknown words.
        </p>
      </div>

      {llmProvider === 'ollama' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ollama URL
              </label>
              <input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="http://localhost:11434"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ollama model
              </label>
              <select
                value={modelSelectValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'custom') {
                    setModelChoice('custom')
                    return
                  }
                  setModelChoice('preset')
                  setOllamaModel(v)
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {modelPresets.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </select>

              {modelChoice === 'custom' && (
                <input
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Enter a model name (e.g. qwen2.5:7b)"
                />
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended: <span className="font-mono">qwen2.5:7b</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={checkOllama}
              disabled={ollamaCheck.status === 'checking'}
              className="px-3 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm disabled:opacity-60"
            >
              {ollamaCheck.status === 'checking' ? 'Checking…' : 'Test Ollama'}
            </button>

            <button
              onClick={() => copyText(`ollama pull ${normalizedModel}`)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Copy: ollama pull
            </button>

            <button
              onClick={() => copyText('ollama serve')}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Copy: ollama serve
            </button>
          </div>

          {ollamaCheck.status === 'ok' && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div>
                <span className="font-medium">Connection:</span> OK
              </div>
              <div>
                <span className="font-medium">Model installed:</span>{' '}
                {ollamaCheck.hasModel ? 'Yes' : 'No'}
              </div>
              {ollamaCheck.models.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">Installed models:</div>
                  <div className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400 break-words">
                    {ollamaCheck.models.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {ollamaCheck.status === 'error' && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {ollamaCheck.message}
            </div>
          )}

          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="font-medium mb-2">Ollama setup (Windows)</div>
            <ol className="list-decimal ml-5 space-y-1">
              <li>
                Install Ollama
                {' '}
                (<a className="underline" href="https://ollama.com/download" target="_blank" rel="noreferrer">download</a>)
              </li>
              <li>In cmd, run: <span className="font-mono">ollama pull {normalizedModel}</span></li>
              <li>Start the server in cmd: <span className="font-mono">ollama serve</span></li>
              <li>Come back here and click <span className="font-medium">Test Ollama</span></li>
            </ol>
          </div>
        </div>
      )}

      {llmProvider === 'api' && (
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
                Stored locally in your browser (localStorage). Don’t use this on a shared computer.
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
                Stored locally in your browser (localStorage). Don’t use this on a shared computer.
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
            Note: Some API providers block direct browser requests (CORS). If translations fail with “Failed to fetch”,
            you may need to use a proxy endpoint, or use Ollama.
          </div>
        </div>
      )}
    </div>
  )
}


