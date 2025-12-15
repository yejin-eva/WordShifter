import { TranslationProvider, TranslationResult, LanguagePair, TranslationConfig, DEFAULT_TRANSLATION_CONFIG } from '@/types/translation.types'
import { Token, ProcessedWord } from '@/types/text.types'
import { extractWords, getWordContext } from '@/services/language/tokenizer'
import { dictionaryService } from '@/services/dictionary'
import { MockProvider } from './mockProvider'
import { OllamaProvider } from './ollamaProvider'

/**
 * Main translation service that coordinates translation of text
 */
export class TranslationService {
  private provider: TranslationProvider
  private config: TranslationConfig
  
  constructor(config: Partial<TranslationConfig> = {}) {
    this.config = { ...DEFAULT_TRANSLATION_CONFIG, ...config }
    this.provider = this.createProvider()
  }
  
  /**
   * Get the current provider
   */
  getProvider(): TranslationProvider {
    return this.provider
  }
  
  /**
   * Check if the current provider is available
   */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable()
  }
  
  /**
   * Switch to a different provider
   */
  setProvider(providerType: TranslationConfig['provider']): void {
    this.config.provider = providerType
    this.provider = this.createProvider()
  }
  
  /**
   * Translate a single word
   */
  async translateWord(word: string, context: string, pair: LanguagePair): Promise<TranslationResult> {
    return this.provider.translateWord(word, context, pair)
  }
  
  /**
   * Translate a phrase
   */
  async translatePhrase(phrase: string, pair: LanguagePair): Promise<TranslationResult> {
    return this.provider.translatePhrase(phrase, pair)
  }
  
  /**
   * Load dictionary for a language pair
   */
  async loadDictionary(pair: LanguagePair): Promise<void> {
    await dictionaryService.loadDictionary(pair)
  }
  
  /**
   * Process all words in a token array
   * Returns ProcessedWord array with translations
   * 
   * Uses dictionary first (instant), falls back to LLM if not found
   */
  async processTokens(
    tokens: Token[],
    pair: LanguagePair,
    onProgress?: (progress: number) => void
  ): Promise<ProcessedWord[]> {
    const wordTokens = extractWords(tokens)
    
    // Step 1: Extract unique normalized words
    const uniqueWordsMap = new Map<string, Token>()
    for (const token of wordTokens) {
      const normalized = token.value.toLowerCase()
      if (!uniqueWordsMap.has(normalized)) {
        uniqueWordsMap.set(normalized, token)
      }
    }
    
    const uniqueWords = Array.from(uniqueWordsMap.entries())
    console.log(`Processing ${uniqueWords.length} unique words (from ${wordTokens.length} total)`)
    
    // Step 2: Look up each unique word in dictionary (NO LLM - instant!)
    const translationCache = new Map<string, TranslationResult>()
    let dictHits = 0
    let dictMisses = 0
    
    for (let i = 0; i < uniqueWords.length; i++) {
      const [normalized, token] = uniqueWords[i]
      
      // Dictionary lookup only (instant!)
      const dictEntry = dictionaryService.lookup(normalized, pair)
      
      if (dictEntry) {
        // Dictionary hit
        dictHits++
        translationCache.set(normalized, {
          original: token.value,
          translation: dictEntry.translation,
          partOfSpeech: dictEntry.pos,
        })
      } else {
        // Dictionary miss - show "?" (user can click retry for LLM)
        dictMisses++
        translationCache.set(normalized, {
          original: token.value,
          translation: '?',
          partOfSpeech: '',
        })
      }
      
      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / uniqueWords.length) * 100)
        onProgress(progress)
      }
    }
    
    console.log(`Dictionary: ${dictHits} found, ${dictMisses} unknown (?)`)
    
    // Step 3: Map translations to all word positions
    const processedWords: ProcessedWord[] = wordTokens.map(token => {
      const normalized = token.value.toLowerCase()
      const result = translationCache.get(normalized)!
      
      return {
        id: `word-${token.index}`,
        index: token.index,
        original: token.value,
        normalized,
        translation: result.translation,
        partOfSpeech: result.partOfSpeech,
      }
    })
    
    return processedWords
  }
  
  private createProvider(): TranslationProvider {
    switch (this.config.provider) {
      case 'ollama':
        return new OllamaProvider(this.config.ollamaEndpoint, this.config.ollamaModel)
      case 'openai':
        // TODO: Implement OpenAI provider
        console.warn('OpenAI provider not yet implemented, falling back to mock')
        return new MockProvider()
      case 'mock':
      default:
        return new MockProvider()
    }
  }
}

// Singleton instance for easy access
let translationService: TranslationService | null = null

export function getTranslationService(config?: Partial<TranslationConfig>): TranslationService {
  if (!translationService || config) {
    translationService = new TranslationService(config)
  }
  return translationService
}

