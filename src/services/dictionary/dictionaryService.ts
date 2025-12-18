import { LanguagePair } from '@/types/translation.types'
import { dictionaryStorage } from '@/services/storage/dictionaryStorage'

export interface DictionaryEntry {
  word: string
  translation: string
  pos: string
}

type DictionaryData = Map<string, DictionaryEntry>

export type DictionaryPairKey = `${string}-${string}`

export const AVAILABLE_DICTIONARY_KEYS: DictionaryPairKey[] = [
  'en-ru',
  'ru-en',
  'en-ko',
  'ko-en',
  'ru-ko',
  'ko-ru',
]

class DictionaryService {
  private dictionaries = new Map<string, DictionaryData>()
  
  private getKey(pair: LanguagePair): string {
    return `${pair.source}-${pair.target}`
  }

  private parseRawDataToMap(rawData: unknown): DictionaryData {
    const dict = new Map<string, DictionaryEntry>()

    // Handle multiple formats
    if (Array.isArray(rawData)) {
      // Array format: [{ word, translation, pos }, ...]
      for (const entry of rawData as any[]) {
        if (entry?.word && entry?.translation) {
          dict.set(String(entry.word).toLowerCase(), {
            word: String(entry.word),
            translation: String(entry.translation),
            pos: String(entry.pos || ''),
          })
        }
      }
      return dict
    }

    if (rawData && typeof rawData === 'object') {
      // Object format (two variants)
      for (const [word, value] of Object.entries(rawData as Record<string, any>)) {
        const v = value as Record<string, string>

        // Check for compact format { t: translation, p: pos } or full { translation, pos }
        const translation = v.t || v.translation || ''
        const pos = v.p || v.pos || ''

        if (translation) {
          dict.set(word.toLowerCase(), {
            word,
            translation,
            pos,
          })
        }
      }
      return dict
    }

    return dict
  }

  private async fetchDictionaryRaw(pair: LanguagePair): Promise<unknown | null> {
    const key = this.getKey(pair)
    const response = await fetch(`/dictionaries/${key}.json`)
    if (!response.ok) return null
    return await response.json()
  }
  
  async loadDictionary(pair: LanguagePair): Promise<void> {
    const key = this.getKey(pair)
    if (this.dictionaries.has(key)) return
    
    try {
      // 1) Try cached dictionary
      const cached = await dictionaryStorage.get(pair)
      if (cached) {
        const raw = JSON.parse(cached.data)
        const dict = this.parseRawDataToMap(raw)
        this.dictionaries.set(key, dict)
        console.log(`Dictionary loaded from cache: ${key} (${dict.size} entries)`)
        return
      }

      // 2) Fetch from public/ and cache it
      const rawData = await this.fetchDictionaryRaw(pair)
      if (!rawData) {
        console.warn(`Dictionary not found: ${key}.json`)
        this.dictionaries.set(key, new Map())
        return
      }

      await dictionaryStorage.save(pair, rawData)
      const dict = this.parseRawDataToMap(rawData)
      this.dictionaries.set(key, dict)
      console.log(`Dictionary loaded: ${key} (${dict.size} entries)`)
    } catch (error) {
      console.error(`Failed to load dictionary ${key}:`, error)
      this.dictionaries.set(key, new Map())
    }
  }

  async downloadDictionary(pair: LanguagePair): Promise<number> {
    const key = this.getKey(pair)
    const rawData = await this.fetchDictionaryRaw(pair)
    if (!rawData) {
      throw new Error(`Dictionary not found: ${key}.json`)
    }
    await dictionaryStorage.save(pair, rawData)
    const dict = this.parseRawDataToMap(rawData)
    this.dictionaries.set(key, dict)
    return dict.size
  }

  async removeCachedDictionary(pair: LanguagePair): Promise<void> {
    const key = this.getKey(pair)
    this.dictionaries.delete(key)
    await dictionaryStorage.remove(pair)
  }

  async isCached(pair: LanguagePair): Promise<boolean> {
    return dictionaryStorage.exists(pair)
  }

  async listCached(): Promise<Array<{ key: string; entryCount: number; updatedAt: Date }>> {
    const all = await dictionaryStorage.list()
    return all.map((d) => ({ key: d.key, entryCount: d.entryCount, updatedAt: d.updatedAt }))
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
