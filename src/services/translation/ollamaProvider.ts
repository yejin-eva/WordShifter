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
    
    const prompt = `Translate the following word from ${sourceLang} to ${targetLang}.
Context: "${context}"
Word to translate: "${word}"

Respond in this exact format: translation|partOfSpeech
Where partOfSpeech is one of: noun, verb, adj, adv, prep, conj, pron, interj

Examples:
- "happy|adj"
- "to run|verb"
- "quickly|adv"

Respond with ONLY the translation|partOfSpeech, nothing else.`

    const response = await this.callOllama(prompt)
    return this.parseResponse(word, response)
  }
  
  async translatePhrase(
    phrase: string, 
    pair: LanguagePair
  ): Promise<TranslationResult> {
    const sourceLang = getLanguageName(pair.source)
    const targetLang = getLanguageName(pair.target)
    
    const prompt = `Translate the following phrase from ${sourceLang} to ${targetLang}.
Phrase to translate: "${phrase}"

Respond with ONLY the translation, nothing else.`

    const response = await this.callOllama(prompt)
    
    return {
      original: phrase,
      translation: response.trim(),
      partOfSpeech: 'phrase',
    }
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
        translation: parts[0].trim(),
        partOfSpeech: parts[1].trim().toLowerCase(),
      }
    }
    
    // Fallback if format is not as expected
    return {
      original,
      translation: cleaned,
      partOfSpeech: 'unknown',
    }
  }
}

