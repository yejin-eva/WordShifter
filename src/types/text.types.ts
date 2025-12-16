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
 * Translation info for a unique word (stored once per unique word)
 */
export interface WordTranslation {
  translation: string
  partOfSpeech?: string
}

/**
 * A word instance in the text (for backwards compatibility with existing code)
 * This is computed on-the-fly from token + wordDict, not stored
 */
export interface ProcessedWord {
  id: string                    // Computed: `word-${token.index}`
  index: number                 // Position in text (from token)
  original: string              // Original word (from token.value)
  normalized: string            // Lowercase (computed)
  translation: string           // From wordDict lookup
  partOfSpeech?: string         // From wordDict lookup
}

/**
 * A fully processed text ready for reading
 * 
 * Key optimization: wordDict stores UNIQUE words only (~15K for a novel)
 * instead of storing every word instance (~200K for a novel)
 */
export interface ProcessedText {
  id: string                    // UUID
  title: string                 // User-provided or filename
  originalContent: string       // Raw text content
  sourceLanguage: LanguageCode  // Detected source language
  targetLanguage: LanguageCode  // User-selected target
  tokens: Token[]               // All tokens (words + punctuation + whitespace)
  wordDict: Record<string, WordTranslation>  // normalized -> translation (UNIQUE ONLY!)
  createdAt: Date
  lastOpenedAt: Date
  lastReadTokenIndex?: number   // Token index of first word on last read page
  fontSize?: number             // Font size in pixels (saved per text)
  displayMode?: 'scroll' | 'page'  // Last used display mode (saved per text)
  
  // Legacy field for backwards compatibility with stored texts
  words?: ProcessedWord[]
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

