import { describe, it, expect } from 'vitest'
import { detectLanguage, detectLanguageFromSample } from './languageDetector'

describe('languageDetector', () => {
  describe('detectLanguage', () => {
    it('detects Russian text (Cyrillic)', () => {
      expect(detectLanguage('Привет мир')).toBe('ru')
      expect(detectLanguage('Война и мир')).toBe('ru')
      expect(detectLanguage('счастливые семьи')).toBe('ru')
    })

    it('detects Korean text (Hangul)', () => {
      expect(detectLanguage('안녕하세요')).toBe('ko')
      expect(detectLanguage('한국어 텍스트')).toBe('ko')
      expect(detectLanguage('좋은 아침입니다')).toBe('ko')
    })

    it('detects English text (Latin)', () => {
      expect(detectLanguage('Hello world')).toBe('en')
      expect(detectLanguage('The quick brown fox')).toBe('en')
      expect(detectLanguage('Good morning')).toBe('en')
    })

    it('defaults to English for empty text', () => {
      expect(detectLanguage('')).toBe('en')
    })

    it('defaults to English for numbers and symbols only', () => {
      expect(detectLanguage('12345')).toBe('en')
      expect(detectLanguage('!@#$%')).toBe('en')
      expect(detectLanguage('   ')).toBe('en')
    })

    it('detects dominant language in mixed text', () => {
      // Mostly Russian with some English
      expect(detectLanguage('Привет hello мир world текст')).toBe('ru')
      
      // Mostly English with some Russian
      expect(detectLanguage('Hello world Привет')).toBe('en')
    })

    it('handles text with punctuation correctly', () => {
      expect(detectLanguage('Привет! Как дела?')).toBe('ru')
      expect(detectLanguage('Hello, how are you?')).toBe('en')
      expect(detectLanguage('안녕하세요! 반갑습니다.')).toBe('ko')
    })
  })

  describe('detectLanguageFromSample', () => {
    it('works with short text', () => {
      expect(detectLanguageFromSample('Привет')).toBe('ru')
    })

    it('samples first 1000 characters of long text', () => {
      // Create a long Russian text
      const russianText = 'Привет '.repeat(200) // 1400 chars
      expect(detectLanguageFromSample(russianText)).toBe('ru')
    })
  })
})

