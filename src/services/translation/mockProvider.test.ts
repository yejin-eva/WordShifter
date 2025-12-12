import { describe, it, expect } from 'vitest'
import { MockProvider } from './mockProvider'

describe('MockProvider', () => {
  it('returns bracketed word as translation', async () => {
    const provider = new MockProvider(0)  // No delay for tests
    
    const result = await provider.translateWord('hello', 'test context', {
      source: 'en',
      target: 'ru',
    })
    
    expect(result.translation).toBe('[hello]')
    expect(result.partOfSpeech).toBe('noun')
  })

  it('returns bracketed phrase as translation', async () => {
    const provider = new MockProvider(0)
    
    const result = await provider.translatePhrase('hello world', {
      source: 'en',
      target: 'ru',
    })
    
    expect(result.translation).toBe('[hello world]')
    expect(result.partOfSpeech).toBe('phrase')
  })

  it('is always available', async () => {
    const provider = new MockProvider(0)
    
    const available = await provider.isAvailable()
    
    expect(available).toBe(true)
  })

  it('simulates delay when specified', async () => {
    const provider = new MockProvider(100)
    
    const start = Date.now()
    await provider.translateWord('test', '', { source: 'en', target: 'ru' })
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeGreaterThanOrEqual(90)  // Allow some variance
  })
})

