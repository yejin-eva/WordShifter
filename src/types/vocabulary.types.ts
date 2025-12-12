import { LanguageCode } from '@/constants/languages'

/**
 * A saved vocabulary entry
 */
export interface VocabularyEntry {
  /** Unique identifier */
  id: string
  
  /** Original word/phrase in source language */
  original: string
  
  /** Translated word/phrase in target language */
  translation: string
  
  /** Part of speech (noun, verb, adj, etc.) */
  partOfSpeech: string
  
  /** Source language code */
  sourceLanguage: LanguageCode
  
  /** Target language code */
  targetLanguage: LanguageCode
  
  /** ID of the text this word was saved from (optional) */
  textId?: string
  
  /** Title of the text this word was saved from */
  textTitle?: string
  
  /** Whether this is a phrase (multiple words) */
  isPhrase: boolean
  
  /** Timestamp when saved */
  createdAt: Date
}

/**
 * Filter options for vocabulary list
 */
export type VocabularyFilter = 
  | { type: 'all' }
  | { type: 'byLanguage'; sourceLanguage: LanguageCode; targetLanguage: LanguageCode }
  | { type: 'byText'; textId: string }

/**
 * Format a vocabulary entry for display/export
 * Format: "original (partOfSpeech) : translation"
 */
export function formatVocabularyEntry(entry: VocabularyEntry): string {
  const pos = entry.partOfSpeech !== 'unknown' ? ` (${entry.partOfSpeech})` : ''
  return `${entry.original}${pos} : ${entry.translation}`
}

/**
 * Format multiple entries for clipboard export
 */
export function formatVocabularyList(entries: VocabularyEntry[]): string {
  return entries.map(formatVocabularyEntry).join('\n')
}

