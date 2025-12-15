import { db, StoredText } from './database'
import { ProcessedText, ProcessedWord, Token } from '@/types/text.types'

/**
 * Optimized storage format - uses word dictionary for deduplication
 */
interface OptimizedTextData {
  version: 2  // Version for migration support
  id: string
  title: string
  originalContent: string
  sourceLanguage: string
  targetLanguage: string
  processingMode: 'full' | 'dynamic'
  createdAt: string
  lastOpenedAt: string
  
  // Compact token format: [type, value, index, charStart, charEnd]
  // type: 0=word, 1=punctuation, 2=whitespace
  tokens: Array<[number, string, number, number, number]>
  
  // Dictionary: normalized -> [translation, partOfSpeech]
  dictionary: Record<string, [string, string]>
  
  // Word positions: [index, normalized] - references dictionary
  wordRefs: Array<[number, string]>
}

/**
 * Service for managing saved texts in IndexedDB
 */
export const textStorage = {
  /**
   * Save a processed text with deduplication
   */
  async save(text: ProcessedText): Promise<void> {
    // Build translation dictionary (deduplicated)
    const dictionary: Record<string, [string, string]> = {}
    const wordRefs: Array<[number, string]> = []
    
    for (const word of text.words) {
      const key = word.normalized
      // Only store first translation for each normalized word
      if (!dictionary[key]) {
        dictionary[key] = [word.translation, word.partOfSpeech || '']
      }
      wordRefs.push([word.index, key])
    }
    
    // Compact tokens: [type, value, index, charStart, charEnd]
    const typeMap = { word: 0, punctuation: 1, whitespace: 2 }
    const compactTokens: Array<[number, string, number, number, number]> = 
      text.tokens.map(t => [typeMap[t.type], t.value, t.index, t.charStart, t.charEnd])
    
    const optimizedData: OptimizedTextData = {
      version: 2,
      id: text.id,
      title: text.title,
      originalContent: text.originalContent,
      sourceLanguage: text.sourceLanguage,
      targetLanguage: text.targetLanguage,
      processingMode: text.processingMode,
      createdAt: text.createdAt.toISOString(),
      lastOpenedAt: text.lastOpenedAt.toISOString(),
      tokens: compactTokens,
      dictionary,
      wordRefs,
    }
    
    const storedText: StoredText = {
      id: text.id,
      title: text.title,
      sourceLanguage: text.sourceLanguage,
      targetLanguage: text.targetLanguage,
      wordCount: text.words.length,
      createdAt: text.createdAt,
      updatedAt: new Date(),
      data: JSON.stringify(optimizedData),
    }
    
    console.log(`Saving text: ${text.words.length} words → ${Object.keys(dictionary).length} unique (${Math.round(Object.keys(dictionary).length / text.words.length * 100)}%)`)
    
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
      const parsed = JSON.parse(stored.data)
      
      // Check if it's the new optimized format (version 2)
      if (parsed.version === 2) {
        return this.reconstructFromOptimized(parsed as OptimizedTextData)
      }
      
      // Legacy format (version 1) - direct ProcessedText
      const legacy = parsed as ProcessedText
      legacy.createdAt = new Date(legacy.createdAt)
      legacy.lastOpenedAt = new Date(legacy.lastOpenedAt || legacy.createdAt)
      return legacy
    } catch (error) {
      console.error('Failed to parse saved text:', error)
      return null
    }
  },
  
  /**
   * Reconstruct ProcessedText from optimized storage format
   */
  reconstructFromOptimized(data: OptimizedTextData): ProcessedText {
    // Reconstruct tokens
    const typeNames: Array<'word' | 'punctuation' | 'whitespace'> = ['word', 'punctuation', 'whitespace']
    const tokens: Token[] = data.tokens.map(([type, value, index, charStart, charEnd]) => ({
      type: typeNames[type],
      value,
      index,
      charStart,
      charEnd,
    }))
    
    // Reconstruct words from dictionary + refs
    const words: ProcessedWord[] = data.wordRefs.map(([index, normalized]) => {
      const [translation, partOfSpeech] = data.dictionary[normalized] || ['', '']
      // Find the original value from tokens
      const token = tokens.find(t => t.index === index)
      return {
        id: crypto.randomUUID(),
        index,
        original: token?.value || normalized,
        normalized,
        translation,
        partOfSpeech,
      }
    })
    
    return {
      id: data.id,
      title: data.title,
      originalContent: data.originalContent,
      sourceLanguage: data.sourceLanguage as ProcessedText['sourceLanguage'],
      targetLanguage: data.targetLanguage as ProcessedText['targetLanguage'],
      processingMode: data.processingMode,
      createdAt: new Date(data.createdAt),
      lastOpenedAt: new Date(data.lastOpenedAt),
      tokens,
      words,
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

