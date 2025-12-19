import { useCallback, useEffect, useMemo, useState } from 'react'
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
      // On GitHub Pages we’re served over HTTPS. Browsers will block HTTP calls to localhost
      // (mixed content), which shows up as a generic "Failed to fetch".
      const isHttps = window.location.protocol === 'https:'
      const isHttp = /^http:\/\//i.test(url)
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)
      if (isHttps && isHttp && isLocalhost) {
        setOllamaCheck({
          status: 'error',
          message:
            'This page is HTTPS (GitHub Pages). Browsers block HTTP calls to localhost, so the hosted app cannot reach Ollama at http://localhost:11434. Run WordShifter locally (npm run dev) OR expose Ollama over HTTPS (reverse proxy) and set that HTTPS URL here.',
        })
        return
      }

      setOllamaCheck({
        status: 'error',
        message: err?.message || 'Could not connect to Ollama. Is it running?',
      })
    }
  }, [ollamaUrl, normalizedModel])

  const pasteOllamaUrlFromClipboard = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) {
        toast.error('Clipboard is empty')
        return
      }
      if (!/^https?:\/\//i.test(text)) {
        toast.error('Clipboard does not look like a URL')
        return
      }
      const sanitized = text.replace(/\/$/, '')
      setOllamaUrl(sanitized)
      toast.success('Pasted Ollama URL')
    } catch (err: any) {
      toast.error(err?.message || 'Could not read clipboard')
    }
  }, [setOllamaUrl])

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
              <div className="flex gap-2">
                <input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="http://localhost:11434"
                />
                <button
                  onClick={pasteOllamaUrlFromClipboard}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
                  title="Paste an HTTPS tunnel URL (e.g. trycloudflare.com)"
                >
                  Paste
                </button>
              </div>
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
                Install Ollama{' '}
                (<a className="underline" href="https://ollama.com/download" target="_blank" rel="noreferrer">download</a>)
              </li>
              <li>
                <div>In cmd, run:</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono">ollama pull {normalizedModel}</span>
                  <button
                    onClick={() => copyText(`ollama pull ${normalizedModel}`)}
                    className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Copy
                  </button>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 p-4 text-sm text-blue-900 dark:text-blue-200">
            <div className="font-medium mb-2">Hosted WordShifter (GitHub Pages) + local Ollama</div>
            <p className="mb-3 text-blue-900/90 dark:text-blue-200/90">
              If you opened WordShifter from GitHub Pages (HTTPS), your browser will block calls to{' '}
              <span className="font-mono">http://localhost:11434</span>. Use an HTTPS tunnel to your local Ollama instead.
            </p>

            <ol className="list-decimal ml-5 space-y-2">
              <li>
                <div className="font-medium">Install Cloudflare Tunnel (cloudflared)</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyText('winget install --id Cloudflare.cloudflared -e')}
                    className="px-2 py-1 rounded border border-blue-200 dark:border-blue-900 text-xs hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    Copy (Windows, optional): winget install
                  </button>
                  <a
                    className="underline text-xs"
                    href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Manual download (all OS)
                  </a>
                </div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  If you install via <span className="font-mono">winget</span>, you usually need to <span className="font-medium">close and reopen your terminal</span>{' '}
                  before <span className="font-mono">cloudflared</span> is recognized.
                </div>
              </li>

              <li>
                <div className="font-medium">Start Ollama</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyText('ollama serve')}
                    className="px-2 py-1 rounded border border-blue-200 dark:border-blue-900 text-xs hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    Copy: ollama serve
                  </button>
                </div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  If this errors with “port 11434 already in use”, Ollama is already running — you can skip this step.
                </div>
              </li>

              <li>
                <div className="font-medium">Start the WordShifter proxy (this repo)</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyText('npm run ollama:proxy')}
                    className="px-2 py-1 rounded border border-blue-200 dark:border-blue-900 text-xs hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    Copy: npm run ollama:proxy
                  </button>
                </div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  Default proxy URL: <span className="font-mono">http://localhost:8787</span> (or use a different port if it’s in use).
                </div>
              </li>

              <li>
                <div className="font-medium">Start an HTTPS tunnel to the proxy</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyText('cloudflared tunnel --url http://localhost:8787')}
                    className="px-2 py-1 rounded border border-blue-200 dark:border-blue-900 text-xs hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    Copy: cloudflared tunnel
                  </button>
                  <button
                    onClick={() => copyText('%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\cloudflared.exe tunnel --url http://localhost:8787')}
                    className="px-2 py-1 rounded border border-blue-200 dark:border-blue-900 text-xs hover:bg-blue-100 dark:hover:bg-blue-900"
                    title="Fallback if cloudflared isn't on PATH yet (after winget install)"
                  >
                    Copy: tunnel (fallback path)
                  </button>
                </div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  Cloudflared will print an <span className="font-mono">https://....trycloudflare.com</span> URL.
                </div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  If you see “cloudflared is not recognized”, close/reopen your terminal, or use the fallback command above.
                </div>
              </li>

              <li>
                <div className="font-medium">Paste the HTTPS URL here</div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  Copy the <span className="font-mono">https://....trycloudflare.com</span> URL, click{' '}
                  <span className="font-medium">Paste</span> above, then click{' '}
                  <span className="font-medium">Test Ollama</span>.
                </div>
              </li>

              <li>
                <div className="font-medium">Come back here and test Ollama</div>
                <div className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
                  After the tunnel is running and you’ve pasted the HTTPS URL, click <span className="font-medium">Test Ollama</span>.
                </div>
              </li>
            </ol>

            <div className="mt-3 text-xs text-blue-900/80 dark:text-blue-200/80">
              Security note: a <span className="font-mono">trycloudflare.com</span> URL exposes your local Ollama to anyone with the link.
              Don’t share it, and close the tunnel when you’re done.
            </div>
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
            (to avoid browser CORS/key exposure). For now WordShifter will keep using Ollama for LLM calls.
          </div>
        </div>
      )}
    </div>
  )
}


