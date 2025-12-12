import { TranslationProvider, TranslationResult, LanguagePair } from '@/types/translation.types'

/**
 * Mock translation provider for development
 * Returns bracketed word as "translation" for testing UI without real API
 */
export class MockProvider implements TranslationProvider {
  name = 'Mock (Development)'
  
  private delay: number
  
  constructor(delay: number = 50) {
    this.delay = delay
  }
  
  async translateWord(
    word: string, 
    _context: string, 
    _pair: LanguagePair
  ): Promise<TranslationResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delay))
    
    // Return mock translation: [word] as translation
    return {
      original: word,
      translation: `[${word}]`,
      partOfSpeech: 'noun',  // Always return noun for mock
    }
  }
  
  async translatePhrase(
    phrase: string, 
    _pair: LanguagePair
  ): Promise<TranslationResult> {
    await new Promise(resolve => setTimeout(resolve, this.delay))
    
    return {
      original: phrase,
      translation: `[${phrase}]`,
      partOfSpeech: 'phrase',
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return true  // Mock is always available
  }
}

