import { describe, it, expect } from 'vitest'
import { 
  tokenize, 
  extractWords, 
  getUniqueWords, 
  getWordContext,
  tokensToText 
} from './tokenizer'

describe('tokenizer', () => {
  describe('tokenize', () => {
    it('tokenizes simple English text', () => {
      const tokens = tokenize('Hello world')
      
      expect(tokens).toHaveLength(3)
      expect(tokens[0]).toEqual({ type: 'word', value: 'Hello', index: 0, charStart: 0, charEnd: 5 })
      expect(tokens[1]).toEqual({ type: 'whitespace', value: ' ', index: 1, charStart: 5, charEnd: 6 })
      expect(tokens[2]).toEqual({ type: 'word', value: 'world', index: 2, charStart: 6, charEnd: 11 })
    })

    it('tokenizes Russian (Cyrillic) text', () => {
      const tokens = tokenize('Привет мир')
      
      expect(tokens).toHaveLength(3)
      expect(tokens[0].value).toBe('Привет')
      expect(tokens[0].type).toBe('word')
      expect(tokens[2].value).toBe('мир')
      expect(tokens[2].type).toBe('word')
    })

    it('tokenizes Korean (Hangul) text', () => {
      const tokens = tokenize('안녕하세요 세계')
      
      expect(tokens).toHaveLength(3)
      expect(tokens[0].value).toBe('안녕하세요')
      expect(tokens[0].type).toBe('word')
      expect(tokens[2].value).toBe('세계')
      expect(tokens[2].type).toBe('word')
    })

    it('handles punctuation', () => {
      const tokens = tokenize('Hello, world!')
      
      expect(tokens).toHaveLength(5)
      expect(tokens[0]).toMatchObject({ type: 'word', value: 'Hello' })
      expect(tokens[1]).toMatchObject({ type: 'punctuation', value: ',' })
      expect(tokens[2]).toMatchObject({ type: 'whitespace', value: ' ' })
      expect(tokens[3]).toMatchObject({ type: 'word', value: 'world' })
      expect(tokens[4]).toMatchObject({ type: 'punctuation', value: '!' })
    })

    it('handles contractions', () => {
      const tokens = tokenize("don't can't")
      
      const words = extractWords(tokens)
      expect(words).toHaveLength(2)
      expect(words[0].value).toBe("don't")
      expect(words[1].value).toBe("can't")
    })

    it('handles multiple whitespace', () => {
      const tokens = tokenize('Hello   world')
      
      expect(tokens).toHaveLength(3)
      expect(tokens[1].value).toBe('   ')
      expect(tokens[1].type).toBe('whitespace')
    })

    it('handles newlines', () => {
      const tokens = tokenize('Hello\nworld')
      
      expect(tokens).toHaveLength(3)
      expect(tokens[1].value).toBe('\n')
      expect(tokens[1].type).toBe('whitespace')
    })
  })

  describe('extractWords', () => {
    it('extracts only word tokens', () => {
      const tokens = tokenize('Hello, world!')
      const words = extractWords(tokens)
      
      expect(words).toHaveLength(2)
      expect(words[0].value).toBe('Hello')
      expect(words[1].value).toBe('world')
    })
  })

  describe('getUniqueWords', () => {
    it('returns unique lowercase words', () => {
      const tokens = tokenize('Hello hello HELLO world')
      const unique = getUniqueWords(tokens)
      
      expect(unique).toHaveLength(2)
      expect(unique).toContain('hello')
      expect(unique).toContain('world')
    })
  })

  describe('getWordContext', () => {
    it('returns surrounding words for context', () => {
      const tokens = tokenize('The quick brown fox jumps over the lazy dog')
      const foxToken = extractWords(tokens).find(t => t.value === 'fox')!
      
      const context = getWordContext(tokens, foxToken.index, 2)
      
      expect(context).toContain('quick')
      expect(context).toContain('brown')
      expect(context).toContain('fox')
      expect(context).toContain('jumps')
      expect(context).toContain('over')
    })

    it('handles words at start of text', () => {
      const tokens = tokenize('Hello world today')
      const helloToken = extractWords(tokens).find(t => t.value === 'Hello')!
      
      const context = getWordContext(tokens, helloToken.index, 2)
      
      expect(context).toContain('Hello')
      expect(context).toContain('world')
    })
  })

  describe('tokensToText', () => {
    it('reconstructs original text from tokens', () => {
      const original = 'Hello, world! How are you?'
      const tokens = tokenize(original)
      const reconstructed = tokensToText(tokens)
      
      expect(reconstructed).toBe(original)
    })

    it('preserves Russian text', () => {
      const original = 'Привет, мир! Как дела?'
      const tokens = tokenize(original)
      const reconstructed = tokensToText(tokens)
      
      expect(reconstructed).toBe(original)
    })
  })
})

