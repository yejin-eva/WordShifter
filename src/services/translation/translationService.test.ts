import { describe, it, expect, vi } from 'vitest'
import { TranslationService } from './translationService'
import { tokenize } from '@/services/language/tokenizer'

describe('TranslationService', () => {
  it('uses mock provider by default', () => {
    const service = new TranslationService()
    
    expect(service.getProvider().name).toBe('Mock (Development)')
  })

  it('can switch to ollama provider', () => {
    const service = new TranslationService()
    service.setProvider('ollama')
    
    expect(service.getProvider().name).toBe('Ollama (Local)')
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

  it('processes tokens and returns ProcessedWord array', async () => {
    const service = new TranslationService({ provider: 'mock' })
    const tokens = tokenize('Hello world')
    
    const processedWords = await service.processTokens(tokens, {
      source: 'en',
      target: 'ru',
    })
    
    expect(processedWords).toHaveLength(2)
    expect(processedWords[0].original).toBe('Hello')
    expect(processedWords[0].translation).toBe('[Hello]')
    expect(processedWords[1].original).toBe('world')
    expect(processedWords[1].translation).toBe('[world]')
  })

  it('caches translations for duplicate words', async () => {
    const service = new TranslationService({ provider: 'mock' })
    const tokens = tokenize('hello hello hello')
    
    const translateSpy = vi.spyOn(service, 'translateWord')
    
    await service.processTokens(tokens, { source: 'en', target: 'ru' })
    
    // Should only translate 'hello' once despite appearing 3 times
    expect(translateSpy).toHaveBeenCalledTimes(1)
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
    
    expect(progressValues).toEqual([25, 50, 75, 100])
  })

  it('mock provider is always available', async () => {
    const service = new TranslationService({ provider: 'mock' })
    
    const available = await service.isAvailable()
    
    expect(available).toBe(true)
  })
})

