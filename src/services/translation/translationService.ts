import { TranslationProvider, TranslationResult, LanguagePair, TranslationConfig, DEFAULT_TRANSLATION_CONFIG } from '@/types/translation.types'
import { Token, ProcessedWord } from '@/types/text.types'
import { extractWords, getWordContext } from '@/services/language/tokenizer'
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
   * Process all words in a token array
   * Returns ProcessedWord array with translations
   */
  async processTokens(
    tokens: Token[],
    pair: LanguagePair,
    onProgress?: (progress: number) => void
  ): Promise<ProcessedWord[]> {
    const wordTokens = extractWords(tokens)
    const processedWords: ProcessedWord[] = []
    
    // Build a cache for unique words to avoid duplicate translations
    const translationCache = new Map<string, TranslationResult>()
    
    for (let i = 0; i < wordTokens.length; i++) {
      const token = wordTokens[i]
      const normalizedWord = token.value.toLowerCase()
      
      // Check cache first
      let result: TranslationResult
      if (translationCache.has(normalizedWord)) {
        result = translationCache.get(normalizedWord)!
      } else {
        // Get context and translate
        const context = getWordContext(tokens, token.index)
        result = await this.translateWord(token.value, context, pair)
        translationCache.set(normalizedWord, result)
      }
      
      processedWords.push({
        id: `word-${token.index}`,
        index: token.index,
        original: token.value,
        normalized: normalizedWord,
        translation: result.translation,
        partOfSpeech: result.partOfSpeech,
      })
      
      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / wordTokens.length) * 100)
        onProgress(progress)
      }
    }
    
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

