import { TranslationProvider, TranslationResult, LanguagePair, TranslationConfig, DEFAULT_TRANSLATION_CONFIG } from '@/types/translation.types'
import { Token, WordTranslation } from '@/types/text.types'
import { extractWords } from '@/services/language/tokenizer'
import { dictionaryService } from '@/services/dictionary'
import { MockProvider } from './mockProvider'
import { OllamaProvider } from './ollamaProvider'
import { OpenAIProvider } from './openaiProvider'
import { GroqProvider } from './groqProvider'
import { useSettingsStore } from '@/stores/useSettingsStore'

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
   * Returns a dictionary of unique words with translations (NOT an array!)
   * 
   * Key optimization: Only stores ~15K unique words for a novel
   * instead of ~200K word instances
   */
  async processTokens(
    tokens: Token[],
    pair: LanguagePair,
    onProgress?: (progress: number) => void
  ): Promise<Record<string, WordTranslation>> {
    const wordTokens = extractWords(tokens)
    
    // Extract unique normalized words
    const uniqueWords = new Set<string>()
    for (const token of wordTokens) {
      uniqueWords.add(token.value.toLowerCase())
    }
    
    const uniqueList = Array.from(uniqueWords)
    console.log(`Processing ${uniqueList.length} unique words (from ${wordTokens.length} total)`)
    
    // Look up each unique word in dictionary (instant!)
    const wordDict: Record<string, WordTranslation> = {}
    let dictHits = 0
    let dictMisses = 0
    
    for (let i = 0; i < uniqueList.length; i++) {
      const normalized = uniqueList[i]
      const dictEntry = dictionaryService.lookup(normalized, pair)
      
      if (dictEntry) {
        dictHits++
        wordDict[normalized] = {
          translation: dictEntry.translation,
          partOfSpeech: dictEntry.pos,
        }
      } else {
        dictMisses++
        wordDict[normalized] = {
          translation: '?',
          partOfSpeech: '',
        }
      }
      
      // Report progress (less frequently for large texts)
      if (onProgress && (i % 100 === 0 || i === uniqueList.length - 1)) {
        const progress = Math.round(((i + 1) / uniqueList.length) * 100)
        onProgress(progress)
      }
    }
    
    console.log(`Dictionary: ${dictHits} found, ${dictMisses} unknown (?)`)
    
    return wordDict
  }
  
  private createProvider(): TranslationProvider {
    switch (this.config.provider) {
      case 'ollama':
        return new OllamaProvider(this.config.ollamaEndpoint, this.config.ollamaModel)
      case 'openai':
        return new OpenAIProvider(this.config.openaiApiKey || '')
      case 'groq':
        return new GroqProvider(this.config.groqApiKey || '')
      case 'mock':
      default:
        return new MockProvider()
    }
  }
}

// Singleton instance for easy access
let translationService: TranslationService | null = null
let lastConfigKey: string | null = null

function configFromSettings(): Partial<TranslationConfig> {
  const s = useSettingsStore.getState()

  // Settings use a top-level "ollama vs api" toggle.
  // TranslationService expects the concrete provider name.
  const provider: TranslationConfig['provider'] =
    s.llmProvider === 'ollama'
      ? 'ollama'
      : s.apiProvider === 'groq'
        ? 'groq'
        : 'openai'

  return {
    provider,
    ollamaEndpoint: s.ollamaUrl,
    ollamaModel: s.ollamaModel,
    openaiApiKey: s.openaiApiKey || undefined,
    groqApiKey: s.groqApiKey || undefined,
  }
}

export function getTranslationService(config?: Partial<TranslationConfig>): TranslationService {
  const effectiveConfig = config ?? configFromSettings()
  const key = JSON.stringify(effectiveConfig)

  if (!translationService || lastConfigKey !== key) {
    translationService = new TranslationService(effectiveConfig)
    lastConfigKey = key
  }
  return translationService
}

