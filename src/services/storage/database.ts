import Dexie, { Table } from 'dexie'
import { VocabularyEntry } from '@/types/vocabulary.types'

/**
 * Stored text entry (without the full token array to save space)
 */
export interface StoredText {
  id: string
  title: string
  sourceLanguage: string
  targetLanguage: string
  wordCount: number
  createdAt: Date
  updatedAt: Date
  /** Serialized processed text data */
  data: string
}

/**
 * Stored dictionary entry (cached for offline use)
 */
export interface StoredDictionary {
  /** Key: `${source}-${target}` */
  key: string
  sourceLanguage: string
  targetLanguage: string
  createdAt: Date
  updatedAt: Date
  /** Estimated number of entries */
  entryCount: number
  /** Raw dictionary JSON (stringified) */
  data: string
}

/**
 * WordShift IndexedDB database
 */
class WordShiftDatabase extends Dexie {
  vocabulary!: Table<VocabularyEntry, string>
  texts!: Table<StoredText, string>
  dictionaries!: Table<StoredDictionary, string>
  
  constructor() {
    super('WordShiftDB')
    
    // Schema version 1
    this.version(1).stores({
      // Vocabulary: indexed by id, with secondary indexes for filtering
      vocabulary: 'id, sourceLanguage, targetLanguage, textId, createdAt, [sourceLanguage+targetLanguage]',
      // Saved texts: indexed by id
      texts: 'id, sourceLanguage, targetLanguage, createdAt, updatedAt',
    })

    // Schema version 2: add dictionary cache
    this.version(2).stores({
      vocabulary: 'id, sourceLanguage, targetLanguage, textId, createdAt, [sourceLanguage+targetLanguage]',
      texts: 'id, sourceLanguage, targetLanguage, createdAt, updatedAt',
      dictionaries: 'key, sourceLanguage, targetLanguage, createdAt, updatedAt, [sourceLanguage+targetLanguage]',
    })
  }
}

// Single database instance
export const db = new WordShiftDatabase()

/**
 * Clear all data (for testing/debugging)
 */
export async function clearDatabase(): Promise<void> {
  await db.vocabulary.clear()
  await db.texts.clear()
  await db.dictionaries.clear()
}

/**
 * Export database stats
 */
export async function getDatabaseStats(): Promise<{
  vocabularyCount: number
  textsCount: number
  dictionariesCount: number
}> {
  const [vocabularyCount, textsCount, dictionariesCount] = await Promise.all([
    db.vocabulary.count(),
    db.texts.count(),
    db.dictionaries.count(),
  ])
  return { vocabularyCount, textsCount, dictionariesCount }
}

