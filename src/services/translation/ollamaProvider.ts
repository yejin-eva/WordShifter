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
    
    // Build language-specific instructions
    const scriptInstruction = this.getScriptInstruction(pair.target)
    
    const prompt = `Translate this ${sourceLang} word to ${targetLang}.

Word: ${word}
Context: ${context}

RULES:
1. Write the translation in ${targetLang} script${scriptInstruction}
2. NO quotation marks
3. NO romanization or transliteration
4. Format: translation|pos (pos = noun, verb, adj, adv, prep, pron, conj)

Examples for Russian target:
- счастливый|adj
- бежать|verb
- вы|pron

Reply with ONLY: translation|pos`

    const response = await this.callOllama(prompt)
    return this.parseResponse(word, response)
  }
  
  /**
   * Get script-specific instructions for the target language
   */
  private getScriptInstruction(target: string): string {
    switch (target) {
      case 'ru':
        return ' (Cyrillic letters like А, Б, В, not Latin A, B, V)'
      case 'ko':
        return ' (Hangul like 한글, not romanization)'
      default:
        return ''
    }
  }
  
  async translatePhrase(
    phrase: string, 
    pair: LanguagePair
  ): Promise<TranslationResult> {
    const sourceLang = getLanguageName(pair.source)
    const targetLang = getLanguageName(pair.target)
    
    const scriptInstruction = this.getScriptInstruction(pair.target)
    
    const prompt = `Translate this ${sourceLang} phrase to ${targetLang}.

Phrase: ${phrase}

RULES:
1. Write in ${targetLang} script${scriptInstruction}
2. NO quotation marks
3. NO romanization

Reply with ONLY the translation.`

    const response = await this.callOllama(prompt)
    
    return {
      original: phrase,
      translation: this.cleanTranslation(response),
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

