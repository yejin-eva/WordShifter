import { describe, it, expect } from 'vitest'
import { parseTxtFile, detectFileFormat, isSupported } from './txtParser'

describe('txtParser', () => {
  describe('parseTxtFile', () => {
    it('parses text content from a txt file', async () => {
      const content = 'Hello, World!'
      const file = new File([content], 'test.txt', { type: 'text/plain' })
      
      const result = await parseTxtFile(file)
      
      expect(result).toBe(content)
    })

    it('handles UTF-8 content including Cyrillic', async () => {
      const content = 'Привет, мир!'
      const file = new File([content], 'russian.txt', { type: 'text/plain' })
      
      const result = await parseTxtFile(file)
      
      expect(result).toBe(content)
    })

    it('handles UTF-8 content including Korean', async () => {
      const content = '안녕하세요!'
      const file = new File([content], 'korean.txt', { type: 'text/plain' })
      
      const result = await parseTxtFile(file)
      
      expect(result).toBe(content)
    })

    it('handles multi-line content', async () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const file = new File([content], 'multiline.txt', { type: 'text/plain' })
      
      const result = await parseTxtFile(file)
      
      expect(result).toBe(content)
    })
  })

  describe('detectFileFormat', () => {
    it('detects txt format', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' })
      expect(detectFileFormat(file)).toBe('txt')
    })

    it('detects pdf format', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(detectFileFormat(file)).toBe('pdf')
    })

    it('detects epub format', () => {
      const file = new File([''], 'test.epub', { type: 'application/epub+zip' })
      expect(detectFileFormat(file)).toBe('epub')
    })

    it('returns unknown for unsupported format', () => {
      const file = new File([''], 'test.doc', { type: 'application/msword' })
      expect(detectFileFormat(file)).toBe('unknown')
    })
  })

  describe('isSupported', () => {
    it('returns true for txt files', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' })
      expect(isSupported(file)).toBe(true)
    })

    it('returns false for pdf files (not yet implemented)', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(isSupported(file)).toBe(false)
    })

    it('returns false for epub files (not yet implemented)', () => {
      const file = new File([''], 'test.epub', { type: 'application/epub+zip' })
      expect(isSupported(file)).toBe(false)
    })
  })
})

