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
      
      const data: DictionaryEntry[] = await response.json()
      const dict = new Map<string, DictionaryEntry>()
      for (const entry of data) {
        dict.set(entry.word.toLowerCase(), entry)
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
