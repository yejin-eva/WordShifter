import { describe, it, expect, vi } from 'vitest'
import { TranslationService } from './translationService'
import { tokenize } from '@/services/language/tokenizer'

describe('TranslationService', () => {
  it('uses ollama provider by default', () => {
    const service = new TranslationService()
    
    expect(service.getProvider().name).toBe('Ollama (Local)')
  })

  it('can use mock provider when specified', () => {
    const service = new TranslationService({ provider: 'mock' })
    
    expect(service.getProvider().name).toBe('Mock (Development)')
  })

  it('can switch to mock provider', () => {
    const service = new TranslationService()
    service.setProvider('mock')
    
    expect(service.getProvider().name).toBe('Mock (Development)')
  })

  it('translates a single word', async () => {
    const service = new TranslationService({ provider: 'mock' })
    
    const result = await service.translateWord('hello', 'test context', {
      source: 'en',
      target: 'ru',
    })
    
    expect(result.translation).toBe('[hello]')
  })

  it('translates a phrase', async () => {
    const service = new TranslationService({ provider: 'mock' })
    
    const result = await service.translatePhrase('hello world', {
      source: 'en',
      target: 'ru',
    })
    
    expect(result.translation).toBe('[hello world]')
  })

  it('processes tokens and returns word dictionary with ? for unknown words', async () => {
    const service = new TranslationService({ provider: 'mock' })
    const tokens = tokenize('Hello world')
    
    // Dictionary not loaded, so all words show "?"
    const wordDict = await service.processTokens(tokens, {
      source: 'en',
      target: 'ru',
    })
    
    // Returns a dictionary of unique words, not an array
    expect(Object.keys(wordDict)).toHaveLength(2)
    expect(wordDict['hello'].translation).toBe('?')  // Unknown word
    expect(wordDict['world'].translation).toBe('?')  // Unknown word
  })

  it('does not call LLM during processTokens (dictionary only)', async () => {
    const service = new TranslationService({ provider: 'mock' })
    const tokens = tokenize('hello hello hello')
    
    const translateSpy = vi.spyOn(service, 'translateWord')
    
    await service.processTokens(tokens, { source: 'en', target: 'ru' })
    
    // No LLM calls - dictionary only! LLM is only for retry button
    expect(translateSpy).toHaveBeenCalledTimes(0)
  })

  it('reports progress during processing', async () => {
    const service = new TranslationService({ provider: 'mock' })
    const tokens = tokenize('one two three four')
    const progressValues: number[] = []
    
    await service.processTokens(
      tokens,
      { source: 'en', target: 'ru' },
      (progress) => progressValues.push(progress)
    )
    
    // Progress reports at start/end and periodically (every 100 words)
    // For small texts, just check we get 100% at the end
    expect(progressValues[progressValues.length - 1]).toBe(100)
  })

  it('mock provider is always available', async () => {
    const service = new TranslationService({ provider: 'mock' })
    
    const available = await service.isAvailable()
    
    expect(available).toBe(true)
  })
})

