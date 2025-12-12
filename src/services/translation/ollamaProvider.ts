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
    
    // Get a translation example for this language pair
    const example = this.getExampleForPair(pair)
    
    const prompt = `${sourceLang}→${targetLang}: ${word}

${example}

ONE word answer. No explanation. Format: word|pos`

    const response = await this.callOllama(prompt)
    return this.parseResponse(word, response)
  }
  
  /**
   * Get a translation example for the given language pair
   */
  private getExampleForPair(pair: LanguagePair): string {
    const examples: Record<string, string> = {
      // From Russian
      'ru-en': 'книга → book|noun',
      'ru-ko': 'книга → 책|noun',
      // From English  
      'en-ru': 'book → книга|noun',
      'en-ko': 'book → 책|noun',
      // From Korean
      'ko-en': '책 → book|noun',
      'ko-ru': '책 → книга|noun',
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
    
    const example = this.getPhraseExampleForPair(pair)
    
    const prompt = `${sourceLang}→${targetLang}: "${phrase}"

${example}

Translation only. No explanation.`

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
    const cleaned = response.trim()
    const parts = cleaned.split('|')
    
    if (parts.length === 2) {
      return {
        original,
        translation: this.cleanTranslation(parts[0]),
        partOfSpeech: parts[1].trim().toLowerCase(),
      }
    }
    
    // Fallback if format is not as expected
    return {
      original,
      translation: this.cleanTranslation(cleaned),
      partOfSpeech: 'unknown',
    }
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

