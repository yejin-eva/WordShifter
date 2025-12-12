import { LanguageCode } from '@/constants/languages'

/**
 * A single token from the tokenized text
 */
export interface Token {
  type: 'word' | 'punctuation' | 'whitespace'
  value: string
  index: number        // Position in token array
  charStart: number    // Character position in original text
  charEnd: number
}

/**
 * A word with its translation information
 */
export interface ProcessedWord {
  id: string                    // Unique ID for this word instance
  index: number                 // Position in text
  original: string              // Original word
  normalized: string            // Lowercase, trimmed (for caching)
  translation: string           // Translated word
  partOfSpeech?: string         // noun, verb, adj, etc.
  context?: string              // Surrounding words for context
}

/**
 * A fully processed text ready for reading
 */
export interface ProcessedText {
  id: string                    // UUID
  title: string                 // User-provided or filename
  originalContent: string       // Raw text content
  sourceLanguage: LanguageCode  // Detected source language
  targetLanguage: LanguageCode  // User-selected target
  tokens: Token[]               // All tokens (words + punctuation + whitespace)
  words: ProcessedWord[]        // Only the words with translations
  createdAt: Date
  lastOpenedAt: Date
  readingPosition?: number      // Last scroll position or page number
  processingMode: 'full' | 'dynamic'
}

/**
 * State during text processing
 */
export interface ProcessingState {
  status: 'idle' | 'parsing' | 'detecting' | 'tokenizing' | 'translating' | 'complete' | 'error'
  progress: number              // 0-100
  currentStep: string           // Human-readable step description
  error?: string
}

