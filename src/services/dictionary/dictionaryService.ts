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

  private getDictionaryUrl(key: string): string {
    // In production on GitHub Pages we’re hosted under a base path (e.g. /WordShifter/).
    // Never use an absolute "/dictionaries/..." URL because it will 404 on Pages.
    let base = (import.meta as any).env?.BASE_URL as string | undefined
    if (!base) base = '/'
    if (!base.endsWith('/')) base += '/'
    return `${base}dictionaries/${key}.json`
  }
  
  async loadDictionary(pair: LanguagePair): Promise<void> {
    const key = this.getKey(pair)
    if (this.dictionaries.has(key)) return
    
    try {
      const url = this.getDictionaryUrl(key)
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Dictionary not found: ${key}.json (${response.status}) @ ${response.url || url}`)
        this.dictionaries.set(key, new Map())
        return
      }
      
      const rawData = await response.json()
      const dict = new Map<string, DictionaryEntry>()
      
      // Handle multiple formats
      if (Array.isArray(rawData)) {
        // Array format: [{ word, translation, pos }, ...]
        for (const entry of rawData) {
          dict.set(entry.word.toLowerCase(), entry)
        }
      } else {
        // Object format (two variants)
        for (const [word, value] of Object.entries(rawData)) {
          const v = value as Record<string, string>
          
          // Check for compact format { t: translation, p: pos } or full { translation, pos }
          const translation = v.t || v.translation || ''
          const pos = v.p || v.pos || ''
          
          if (translation) {
            dict.set(word.toLowerCase(), {
              word: word,
              translation: translation,
              pos: pos,
            })
          }
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
