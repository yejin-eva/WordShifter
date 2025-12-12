import { TranslationProvider, TranslationResult, LanguagePair } from '@/types/translation.types'
import { getLanguageName } from '@/constants/languages'

/**
 * Ollama translation provider for local AI translation
 */
export class OllamaProvider implements TranslationProvider {
  name = 'Ollama (Local)'
  
  private endpoint: string
  private model: string
  
  constructor(endpoint: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.endpoint = endpoint
    this.model = model
  }
  
  async translateWord(
    word: string, 
    context: string, 
    pair: LanguagePair
  ): Promise<TranslationResult> {
    const sourceLang = getLanguageName(pair.source)
    const targetLang = getLanguageName(pair.target)
    
    const example = this.getExampleForPair(pair)
    
    const prompt = `${sourceLang} to ${targetLang} dictionary.
Output ONLY: translation|pos
No quotes. No original word. Just translation|pos.

${example}

${word} →`

    const response = await this.callOllama(prompt)
    return this.parseResponse(word, response)
  }
  
  /**
   * Get a translation example for the given language pair
   */
  private getExampleForPair(pair: LanguagePair): string {
    // Use varied examples including prepositions to avoid model copying one answer
    const examples: Record<string, string> = {
      // From Russian
      'ru-en': `быстрый → fast|adj
на → on|prep
бежать → run|verb`,
      'ru-ko': `быстрый → 빠른|adj
на → 위에|prep
бежать → 달리다|verb`,
      // From English  
      'en-ru': `fast → быстрый|adj
on → на|prep
run → бежать|verb`,
      'en-ko': `fast → 빠른|adj
on → 위에|prep
run → 달리다|verb`,
      // From Korean
      'ko-en': `빠른 → fast|adj
위에 → on|prep
달리다 → run|verb`,
      'ko-ru': `빠른 → быстрый|adj
위에 → на|prep
달리다 → бежать|verb`,
    }
    
    const key = `${pair.source}-${pair.target}`
    return examples[key] || 'hello → translation|noun'
  }
  
  async translatePhrase(
    phrase: string, 
    pair: LanguagePair
  ): Promise<TranslationResult> {
    const sourceLang = getLanguageName(pair.source)
    const targetLang = getLanguageName(pair.target)
    
    const prompt = `Translate to ${targetLang}. Reply with translation only.

"${phrase}" =`

    const response = await this.callOllama(prompt)
    
    return {
      original: phrase,
      translation: this.cleanTranslation(response),
      partOfSpeech: 'phrase',
    }
  }
  
  /**
   * Get a phrase translation example for the given language pair
   */
  private getPhraseExampleForPair(pair: LanguagePair): string {
    const examples: Record<string, string> = {
      'ru-en': 'доброе утро → good morning',
      'ru-ko': 'доброе утро → 좋은 아침',
      'en-ru': 'good morning → доброе утро',
      'en-ko': 'good morning → 좋은 아침',
      'ko-en': '좋은 아침 → good morning',
      'ko-ru': '좋은 아침 → доброе утро',
    }
    
    const key = `${pair.source}-${pair.target}`
    return examples[key] || 'hello world → translated phrase'
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Get instructions for starting Ollama
   */
  getStartupInstructions(): string {
    return `Ollama is not running. To start Ollama:

**Windows:**
1. Open Start Menu, search for "Ollama"
2. Click to launch (runs in system tray)
3. Or open PowerShell and run: ollama serve

**Mac/Linux:**
1. Open Terminal
2. Run: ollama serve

After starting, make sure you have a model installed:
  ollama pull ${this.model}

Then click "Retry" to check the connection.`
  }
  
  private async callOllama(prompt: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.response || ''
  }
  
  private parseResponse(original: string, response: string): TranslationResult {
    // Clean up the response aggressively
    let cleaned = response.trim()
    
    // Remove the original word if the model echoed it back (e.g., "Все"|all|adj)
    // Look for patterns like: originalWord"|translation or originalWord →
    const echoPatterns = [
      new RegExp(`^["']?${this.escapeRegex(original)}["']?\\s*["'|→=:]\\s*`, 'i'),
      /^["'][^"']+["']\s*["'|→=:]\s*/,  // Any quoted word at start
    ]
    for (const pattern of echoPatterns) {
      cleaned = cleaned.replace(pattern, '')
    }
    
    // Split by pipe and take first two meaningful parts
    const parts = cleaned.split('|').map(p => p.trim()).filter(p => p.length > 0)
    
    if (parts.length >= 2) {
      // Take first part as translation, second as POS
      // Clean POS: take only first word (e.g., "adj/noun" → "adj")
      const pos = parts[1].split(/[\/,\s]/)[0].toLowerCase()
      return {
        original,
        translation: this.cleanTranslation(parts[0]),
        partOfSpeech: this.normalizePOS(pos),
      }
    }
    
    // Fallback: just use the cleaned text
    return {
      original,
      translation: this.cleanTranslation(cleaned),
      partOfSpeech: 'unknown',
    }
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  
  private normalizePOS(pos: string): string {
    // Normalize common POS variations
    const posMap: Record<string, string> = {
      'noun': 'noun', 'n': 'noun',
      'verb': 'verb', 'v': 'verb',
      'adj': 'adj', 'adjective': 'adj',
      'adv': 'adv', 'adverb': 'adv',
      'prep': 'prep', 'preposition': 'prep',
      'pron': 'pron', 'pronoun': 'pron',
      'conj': 'conj', 'conjunction': 'conj',
      'det': 'det', 'determiner': 'det',
      'part': 'part', 'particle': 'part',
    }
    return posMap[pos] || pos
  }
  
  /**
   * Clean translation by removing quotation marks and extra whitespace
   */
  private cleanTranslation(text: string): string {
    return text
      .trim()
      .replace(/^["'"'"«»]+/, '')  // Remove leading quotes
      .replace(/["'"'"«»]+$/, '')  // Remove trailing quotes
      .trim()
  }
}

