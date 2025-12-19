import { TranslationProvider, TranslationResult, LanguagePair } from '@/types/translation.types'
import { getLanguageName } from '@/constants/languages'

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string }
  }>
}

function parseTranslationPipe(original: string, raw: string): TranslationResult {
  const cleaned = (raw || '').trim()
  const parts = cleaned.split('|').map((p) => p.trim()).filter(Boolean)

  if (parts.length >= 2) {
    const pos = parts[1].split(/[\/,\s]/)[0].toLowerCase()
    return { original, translation: parts[0], partOfSpeech: pos || 'unknown' }
  }

  return { original, translation: cleaned, partOfSpeech: 'unknown' }
}

function maybeFriendlyCorsHint(endpoint: string, err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err)
  if (!/failed to fetch/i.test(msg)) return null
  if (typeof window !== 'undefined') {
    return `Request failed. If you're running WordShifter in a browser, this may be blocked by CORS. The hosted app may need an API proxy endpoint instead of calling ${endpoint} directly.`
  }
  return null
}

/**
 * Groq API provider (OpenAI-compatible endpoint; user-provided API key).
 *
 * Docs: https://console.groq.com/docs
 */
export class GroqProvider implements TranslationProvider {
  name = 'Groq (API)'

  private apiKey: string
  private model: string
  private endpoint: string

  constructor(
    apiKey: string,
    model: string = 'llama-3.1-8b-instant',
    endpoint: string = 'https://api.groq.com/openai/v1/chat/completions'
  ) {
    this.apiKey = apiKey
    this.model = model
    this.endpoint = endpoint
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  async translateWord(word: string, context: string, pair: LanguagePair): Promise<TranslationResult> {
    const sourceLang = getLanguageName(pair.source)
    const targetLang = getLanguageName(pair.target)

    const prompt = [
      `Translate the following word from ${sourceLang} to ${targetLang}.`,
      `Context: "${context}"`,
      `Word: "${word}"`,
      '',
      'Respond with ONLY: translation|partOfSpeech',
      'Where partOfSpeech is one of: noun, verb, adj, adv, prep, conj, pron, interj, det, part, phrase, unknown',
    ].join('\n')

    const content = await this.callChatCompletion(prompt)
    return parseTranslationPipe(word, content)
  }

  async translatePhrase(phrase: string, pair: LanguagePair): Promise<TranslationResult> {
    const sourceLang = getLanguageName(pair.source)
    const targetLang = getLanguageName(pair.target)

    const prompt = [
      `Translate the following phrase from ${sourceLang} to ${targetLang}.`,
      `Phrase: "${phrase}"`,
      '',
      'Respond with ONLY the translation (no quotes).',
    ].join('\n')

    const content = await this.callChatCompletion(prompt)
    return { original: phrase, translation: (content || '').trim(), partOfSpeech: 'phrase' }
  }

  private async callChatCompletion(userPrompt: string): Promise<string> {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new Error('Groq API key is missing')
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a translator. Follow the requested output format exactly. Do not include extra commentary.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Groq request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
      }

      const data = (await res.json()) as ChatCompletionResponse
      return data.choices?.[0]?.message?.content?.trim() || ''
    } catch (err) {
      const hint = maybeFriendlyCorsHint(this.endpoint, err)
      if (hint) throw new Error(hint)
      throw err
    }
  }
}


