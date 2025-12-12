import { db } from './database'
import { VocabularyEntry, VocabularyFilter } from '@/types/vocabulary.types'
import { LanguageCode } from '@/constants/languages'

/**
 * Service for managing vocabulary entries in IndexedDB
 */
export const vocabularyStorage = {
  /**
   * Save a new vocabulary entry
   */
  async save(entry: VocabularyEntry): Promise<void> {
    await db.vocabulary.put(entry)
  },
  
  /**
   * Delete a vocabulary entry by ID
   */
  async delete(id: string): Promise<void> {
    await db.vocabulary.delete(id)
  },
  
  /**
   * Get all vocabulary entries with optional filter
   */
  async getAll(filter?: VocabularyFilter): Promise<VocabularyEntry[]> {
    if (!filter || filter.type === 'all') {
      return db.vocabulary.orderBy('createdAt').reverse().toArray()
    }
    
    if (filter.type === 'byLanguage') {
      return db.vocabulary
        .where('[sourceLanguage+targetLanguage]')
        .equals([filter.sourceLanguage, filter.targetLanguage])
        .reverse()
        .sortBy('createdAt')
    }
    
    if (filter.type === 'byText') {
      return db.vocabulary
        .where('textId')
        .equals(filter.textId)
        .reverse()
        .sortBy('createdAt')
    }
    
    return []
  },
  
  /**
   * Get vocabulary entries for a specific text
   */
  async getByTextId(textId: string): Promise<VocabularyEntry[]> {
    return db.vocabulary
      .where('textId')
      .equals(textId)
      .reverse()
      .sortBy('createdAt')
  },
  
  /**
   * Get vocabulary entries for a language pair
   */
  async getByLanguagePair(
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode
  ): Promise<VocabularyEntry[]> {
    return db.vocabulary
      .where('[sourceLanguage+targetLanguage]')
      .equals([sourceLanguage, targetLanguage])
      .reverse()
      .sortBy('createdAt')
  },
  
  /**
   * Check if a word/phrase is already saved
   */
  async exists(original: string, sourceLanguage: LanguageCode, targetLanguage: LanguageCode): Promise<boolean> {
    const count = await db.vocabulary
      .where('[sourceLanguage+targetLanguage]')
      .equals([sourceLanguage, targetLanguage])
      .filter(entry => entry.original.toLowerCase() === original.toLowerCase())
      .count()
    return count > 0
  },
  
  /**
   * Get count of vocabulary entries
   */
  async count(filter?: VocabularyFilter): Promise<number> {
    if (!filter || filter.type === 'all') {
      return db.vocabulary.count()
    }
    
    if (filter.type === 'byLanguage') {
      return db.vocabulary
        .where('[sourceLanguage+targetLanguage]')
        .equals([filter.sourceLanguage, filter.targetLanguage])
        .count()
    }
    
    if (filter.type === 'byText') {
      return db.vocabulary
        .where('textId')
        .equals(filter.textId)
        .count()
    }
    
    return 0
  },
  
  /**
   * Get unique text IDs that have vocabulary entries
   */
  async getTextIds(): Promise<string[]> {
    const entries = await db.vocabulary
      .orderBy('textId')
      .uniqueKeys()
    return entries.filter((id): id is string => typeof id === 'string' && id.length > 0)
  },
  
  /**
   * Clear all vocabulary
   */
  async clear(): Promise<void> {
    await db.vocabulary.clear()
  },
}

