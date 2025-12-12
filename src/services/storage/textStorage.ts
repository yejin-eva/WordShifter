import { db, StoredText } from './database'
import { ProcessedText } from '@/types/text.types'

/**
 * Service for managing saved texts in IndexedDB
 */
export const textStorage = {
  /**
   * Save a processed text
   */
  async save(text: ProcessedText): Promise<void> {
    const storedText: StoredText = {
      id: text.id,
      title: text.title,
      sourceLanguage: text.sourceLanguage,
      targetLanguage: text.targetLanguage,
      wordCount: text.words.length,
      createdAt: text.createdAt,
      updatedAt: new Date(),
      // Serialize the full processed text data
      data: JSON.stringify(text),
    }
    
    await db.texts.put(storedText)
  },
  
  /**
   * Get all saved texts (metadata only, not full data)
   */
  async getAll(): Promise<StoredText[]> {
    return db.texts.orderBy('updatedAt').reverse().toArray()
  },
  
  /**
   * Get a saved text by ID and deserialize it
   */
  async getById(id: string): Promise<ProcessedText | null> {
    const stored = await db.texts.get(id)
    if (!stored) return null
    
    try {
      const parsed = JSON.parse(stored.data) as ProcessedText
      // Convert date strings back to Date objects
      parsed.createdAt = new Date(parsed.createdAt)
      parsed.lastOpenedAt = new Date(parsed.lastOpenedAt || parsed.createdAt)
      return parsed
    } catch (error) {
      console.error('Failed to parse saved text:', error)
      return null
    }
  },
  
  /**
   * Update last opened time
   */
  async updateLastOpened(id: string): Promise<void> {
    const stored = await db.texts.get(id)
    if (!stored) return
    
    try {
      const parsed = JSON.parse(stored.data) as ProcessedText
      parsed.lastOpenedAt = new Date()
      
      await db.texts.update(id, {
        updatedAt: new Date(),
        data: JSON.stringify(parsed),
      })
    } catch (error) {
      console.error('Failed to update last opened:', error)
    }
  },
  
  /**
   * Delete a saved text
   */
  async delete(id: string): Promise<void> {
    await db.texts.delete(id)
  },
  
  /**
   * Check if a text is already saved
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.texts.where('id').equals(id).count()
    return count > 0
  },
  
  /**
   * Get count of saved texts
   */
  async count(): Promise<number> {
    return db.texts.count()
  },
  
  /**
   * Clear all saved texts
   */
  async clear(): Promise<void> {
    await db.texts.clear()
  },
}

