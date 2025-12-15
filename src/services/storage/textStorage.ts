import { db, StoredText } from './database'
import { ProcessedText, Token, WordTranslation } from '@/types/text.types'

/**
 * Optimized storage format v3 - stores wordDict directly (already deduplicated!)
 */
interface StorageFormatV3 {
  version: 3
  id: string
  title: string
  originalContent: string
  sourceLanguage: string
  targetLanguage: string
  createdAt: string
  lastOpenedAt: string
  lastReadTokenIndex?: number  // Token index of first word on last read page
  
  // Compact tokens: [type, value, index, charStart, charEnd]
  // type: 0=word, 1=punctuation, 2=whitespace
  tokens: Array<[number, string, number, number, number]>
  
  // Word dictionary: normalized -> [translation, partOfSpeech]
  wordDict: Record<string, [string, string]>
}

/**
 * Service for managing saved texts in IndexedDB
 */
export const textStorage = {
  /**
   * Save a processed text
   */
  async save(text: ProcessedText): Promise<void> {
    // Compact tokens
    const typeMap = { word: 0, punctuation: 1, whitespace: 2 }
    const compactTokens: Array<[number, string, number, number, number]> = 
      text.tokens.map(t => [typeMap[t.type], t.value, t.index, t.charStart, t.charEnd])
    
    // Compact wordDict: [translation, pos] tuples
    const compactWordDict: Record<string, [string, string]> = {}
    for (const [key, val] of Object.entries(text.wordDict)) {
      compactWordDict[key] = [val.translation, val.partOfSpeech || '']
    }
    
    const storageData: StorageFormatV3 = {
      version: 3,
      id: text.id,
      title: text.title,
      originalContent: text.originalContent,
      sourceLanguage: text.sourceLanguage,
      targetLanguage: text.targetLanguage,
      createdAt: text.createdAt.toISOString(),
      lastOpenedAt: text.lastOpenedAt.toISOString(),
      tokens: compactTokens,
      wordDict: compactWordDict,
    }
    
    // Count words in tokens for metadata
    const wordCount = text.tokens.filter(t => t.type === 'word').length
    
    const storedText: StoredText = {
      id: text.id,
      title: text.title,
      sourceLanguage: text.sourceLanguage,
      targetLanguage: text.targetLanguage,
      wordCount,
      createdAt: text.createdAt,
      updatedAt: new Date(),
      data: JSON.stringify(storageData),
    }
    
    console.log(`Saving: ${wordCount} word tokens, ${Object.keys(text.wordDict).length} unique translations`)
    
    await db.texts.put(storedText)
  },
  
  /**
   * Get all saved texts (metadata only)
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
      
      // Version 3 format (current)
      if (parsed.version === 3) {
        return this.reconstructV3(parsed as StorageFormatV3)
      }
      
      // Legacy formats - reconstruct as best we can
      console.warn('Loading legacy format, will be upgraded on next save')
      return this.reconstructLegacy(parsed)
    } catch (error) {
      console.error('Failed to parse saved text:', error)
      return null
    }
  },
  
  /**
   * Reconstruct from v3 format
   */
  reconstructV3(data: StorageFormatV3): ProcessedText {
    const typeNames: Array<'word' | 'punctuation' | 'whitespace'> = ['word', 'punctuation', 'whitespace']
    
    const tokens: Token[] = data.tokens.map(([type, value, index, charStart, charEnd]) => ({
      type: typeNames[type],
      value,
      index,
      charStart,
      charEnd,
    }))
    
    // Expand wordDict from tuples
    const wordDict: Record<string, WordTranslation> = {}
    for (const [key, [translation, partOfSpeech]] of Object.entries(data.wordDict)) {
      wordDict[key] = { translation, partOfSpeech }
    }
    
    return {
      id: data.id,
      title: data.title,
      originalContent: data.originalContent,
      sourceLanguage: data.sourceLanguage as ProcessedText['sourceLanguage'],
      targetLanguage: data.targetLanguage as ProcessedText['targetLanguage'],
      createdAt: new Date(data.createdAt),
      lastOpenedAt: new Date(data.lastOpenedAt),
      lastReadTokenIndex: data.lastReadTokenIndex,
      tokens,
      wordDict,
    }
  },
  
  /**
   * Reconstruct from legacy formats (v1/v2)
   */
  reconstructLegacy(data: any): ProcessedText {
    // Try to extract what we can
    const tokens: Token[] = data.tokens?.map((t: any) => {
      if (Array.isArray(t)) {
        // v2 compact format
        const typeNames: Array<'word' | 'punctuation' | 'whitespace'> = ['word', 'punctuation', 'whitespace']
        return { type: typeNames[t[0]], value: t[1], index: t[2], charStart: t[3], charEnd: t[4] }
      }
      return t
    }) || []
    
    // Build wordDict from legacy words array or dictionary
    const wordDict: Record<string, WordTranslation> = {}
    
    if (data.words) {
      for (const word of data.words) {
        const key = word.normalized || word.original?.toLowerCase()
        if (key && !wordDict[key]) {
          wordDict[key] = { 
            translation: word.translation || '?', 
            partOfSpeech: word.partOfSpeech || '' 
          }
        }
      }
    } else if (data.dictionary) {
      for (const [key, val] of Object.entries(data.dictionary)) {
        const [translation, pos] = val as [string, string]
        wordDict[key] = { translation, partOfSpeech: pos }
      }
    }
    
    return {
      id: data.id,
      title: data.title,
      originalContent: data.originalContent,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      createdAt: new Date(data.createdAt),
      lastOpenedAt: new Date(data.lastOpenedAt || data.createdAt),
      tokens,
      wordDict,
    }
  },
  
  /**
   * Update last opened time
   */
  async updateLastOpened(id: string): Promise<void> {
    await db.texts.update(id, { updatedAt: new Date() })
  },
  
  /**
   * Update reading position (token index of first word on current page)
   */
  async updateReadingPosition(id: string, tokenIndex: number): Promise<void> {
    const stored = await db.texts.get(id)
    if (!stored) return
    
    try {
      const data = JSON.parse(stored.data)
      data.lastReadTokenIndex = tokenIndex
      await db.texts.update(id, { 
        data: JSON.stringify(data),
        updatedAt: new Date() 
      })
    } catch (error) {
      console.error('Failed to update reading position:', error)
    }
  },
  
  /**
   * Delete a saved text
   */
  async delete(id: string): Promise<void> {
    await db.texts.delete(id)
  },
  
  /**
   * Check if a text exists
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
