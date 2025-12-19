import { TranslationProvider, TranslationResult, LanguagePair } from '@/types/translation.types'
import { getLanguageName } from '@/constants/languages'
import { requestJson } from '@/services/http/httpClient'

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
  // In browsers, CORS/mixed-network errors usually surface as "TypeError: Failed to fetch"
  const msg = err instanceof Error ? err.message : String(err)
  if (!/failed to fetch/i.test(msg)) return null

  if (typeof window !== 'undefined') {
    return `Request failed. If you're running WordShifter in a browser, this may be blocked by CORS. The hosted app may need an API proxy endpoint instead of calling ${endpoint} directly.`
  }

  return null
}

/**
 * OpenAI API provider (user-provided API key).
 *
 * Note: many LLM APIs do not allow direct browser calls (CORS). If fetch fails with "Failed to fetch",
 * users may need to use a proxy endpoint.
 */
export class OpenAIProvider implements TranslationProvider {
  name = 'OpenAI (API)'

  private apiKey: string
  private model: string
  private endpoint: string

  constructor(apiKey: string, model: string = 'gpt-4o-mini', endpoint: string = 'https://api.openai.com/v1/chat/completions') {
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
      throw new Error('OpenAI API key is missing')
    }

    try {
      const res = await requestJson({
        method: 'POST',
        url: this.endpoint,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeoutMs: 15000,
        body: {
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
        },
      })

      if (!res.ok) {
        const extra = res.rawText ? ` - ${res.rawText}` : ''
        throw new Error(`OpenAI request failed: ${res.status}${extra}`)
      }

      const data = res.data as ChatCompletionResponse
      return data.choices?.[0]?.message?.content?.trim() || ''
    } catch (err) {
      const hint = maybeFriendlyCorsHint(this.endpoint, err)
      if (hint) throw new Error(hint)
      throw err
    }
  }
}


