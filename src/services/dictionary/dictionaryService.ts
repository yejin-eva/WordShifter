import { LanguagePair } from '@/types/translation.types'

export interface DictionaryEntry {
  word: string
  translation: string
  pos: string
}

type DictionaryData = Map<string, DictionaryEntry>

class DictionaryService {
  private dictionaries = new Map<string, DictionaryData>()
  
  private getKey(pair: LanguagePair): string {
    return `${pair.source}-${pair.target}`
  }
  
  async loadDictionary(pair: LanguagePair): Promise<void> {
    const key = this.getKey(pair)
    if (this.dictionaries.has(key)) return
    
    try {
      const response = await fetch(`/dictionaries/${key}.json`)
      if (!response.ok) {
        console.warn(`Dictionary not found: ${key}.json`)
        this.dictionaries.set(key, new Map())
        return
      }
      
      const rawData = await response.json()
      const dict = new Map<string, DictionaryEntry>()
      
      // Handle both array format and object format
      if (Array.isArray(rawData)) {
        // Array format: [{ word, translation, pos }, ...]
        for (const entry of rawData) {
          dict.set(entry.word.toLowerCase(), entry)
        }
      } else {
        // Object format: { "word": { translation, pos }, ... }
        for (const [word, value] of Object.entries(rawData)) {
          const entry = value as { translation: string; pos: string }
          dict.set(word.toLowerCase(), {
            word: word,
            translation: entry.translation,
            pos: entry.pos,
          })
        }
      }
      
      this.dictionaries.set(key, dict)
      console.log(`Dictionary loaded: ${key} (${dict.size} entries)`)
    } catch (error) {
      console.error(`Failed to load dictionary ${key}:`, error)
      this.dictionaries.set(key, new Map())
    }
  }
  
  lookup(word: string, pair: LanguagePair): DictionaryEntry | null {
    const key = this.getKey(pair)
    const dict = this.dictionaries.get(key)
    if (!dict) return null
    return dict.get(word.toLowerCase()) || null
  }
  
  isLoaded(pair: LanguagePair): boolean {
    return this.dictionaries.has(this.getKey(pair))
  }
  
  clear(): void {
    this.dictionaries.clear()
  }
}

export const dictionaryService = new DictionaryService()
