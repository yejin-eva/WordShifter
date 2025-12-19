import { LanguageCode } from '@/constants/languages'

/**
 * A language pair for translation
 */
export interface LanguagePair {
  source: LanguageCode
  target: LanguageCode
}

/**
 * Result from a single translation
 */
export interface TranslationResult {
  original: string
  translation: string
  partOfSpeech: string
}

/**
 * Abstract interface for translation providers
 */
export interface TranslationProvider {
  name: string
  
  /**
   * Translate a single word with context
   */
  translateWord(
    word: string, 
    context: string, 
    pair: LanguagePair
  ): Promise<TranslationResult>
  
  /**
   * Translate a phrase
   */
  translatePhrase(
    phrase: string, 
    pair: LanguagePair
  ): Promise<TranslationResult>
  
  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>
}

/**
 * Configuration for translation service
 */
export interface TranslationConfig {
  provider: 'mock' | 'openai' | 'groq'
  openaiApiKey?: string
  groqApiKey?: string
}

/**
 * Default configuration
 */
export const DEFAULT_TRANSLATION_CONFIG: TranslationConfig = {
  provider: 'openai',
}

