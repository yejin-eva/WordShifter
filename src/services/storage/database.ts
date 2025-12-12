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
 * WordShift IndexedDB database
 */
class WordShiftDatabase extends Dexie {
  vocabulary!: Table<VocabularyEntry, string>
  texts!: Table<StoredText, string>
  
  constructor() {
    super('WordShiftDB')
    
    // Schema version 1
    this.version(1).stores({
      // Vocabulary: indexed by id, with secondary indexes for filtering
      vocabulary: 'id, sourceLanguage, targetLanguage, textId, createdAt, [sourceLanguage+targetLanguage]',
      // Saved texts: indexed by id
      texts: 'id, sourceLanguage, targetLanguage, createdAt, updatedAt',
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
}

/**
 * Export database stats
 */
export async function getDatabaseStats(): Promise<{
  vocabularyCount: number
  textsCount: number
}> {
  const [vocabularyCount, textsCount] = await Promise.all([
    db.vocabulary.count(),
    db.texts.count(),
  ])
  return { vocabularyCount, textsCount }
}

