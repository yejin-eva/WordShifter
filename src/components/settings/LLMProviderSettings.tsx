import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/stores/useSettingsStore'

type OllamaCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; models: string[]; hasModel: boolean }
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
    ollamaUrl,
    setOllamaUrl,
    ollamaModel,
    setOllamaModel,
    openaiApiKey,
    setOpenAIApiKey,
  } = useSettingsStore()

  const [ollamaCheck, setOllamaCheck] = useState<OllamaCheckState>({ status: 'idle' })

  const normalizedModel = useMemo(() => normalizeOllamaModelName(ollamaModel), [ollamaModel])

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
            onClick={() => setLLMProvider('openai')}
            className={`px-3 py-2 text-sm transition-colors ${
              llmProvider === 'openai'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            OpenAI (API)
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          WordShift is dictionary-first. LLMs are used for phrase translation and “Retry” on unknown words.
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
              <input
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="qwen2.5:7b"
              />
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
              <li>Run <span className="font-mono">ollama pull {normalizedModel}</span></li>
              <li>Start the server: <span className="font-mono">ollama serve</span></li>
              <li>Come back here and click <span className="font-medium">Test Ollama</span></li>
            </ol>
          </div>
        </div>
      )}

      {llmProvider === 'openai' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              OpenAI API key
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

          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-4 text-sm text-yellow-900 dark:text-yellow-200">
            OpenAI support is planned, but in the current web-only build it requires a small server/proxy
            (to avoid browser CORS/key exposure). For now WordShift will keep using Ollama for LLM calls.
          </div>
        </div>
      )}
    </div>
  )
}


