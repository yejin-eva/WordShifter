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

  private normalizeLookupKey(raw: string): string {
    return (raw ?? '')
      .trim()
      .toLowerCase()
      // Strip diacritics/stress marks (e.g., Russian "бра́тина" -> "братина")
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
  }

  private getFromDict(dict: DictionaryData, rawWord: string): DictionaryEntry | null {
    const k0 = this.normalizeLookupKey(rawWord)
    if (!k0) return null

    // Try direct
    const direct = dict.get(k0)
    if (direct) return direct

    // Common fallback: ё vs е in Russian dictionaries
    const yoToE = k0.replace(/ё/g, 'е')
    if (yoToE !== k0) {
      const alt = dict.get(yoToE)
      if (alt) return alt
    }

    return null
  }

  private extractLemmaFromFormLikeTranslation(translation: string): string | null {
    const t = (translation ?? '').trim()
    if (!t) return null

    // Examples we see in Wiktionary-derived glosses:
    // - "obsolete form of бра́тина"
    // - "plural of книга"
    // - "genitive singular of кот"
    // We want the lemma at the end (often a non-Latin word).
    const lower = t.toLowerCase()
    const looksLikeForm =
      lower.includes(' form of ') ||
      lower.includes(' forms of ') ||
      lower.includes(' inflection of ') ||
      lower.includes(' plural of ') ||
      lower.includes(' singular of ') ||
      lower.includes(' genitive ') ||
      lower.includes(' dative ') ||
      lower.includes(' accusative ') ||
      lower.includes(' instrumental ') ||
      lower.includes(' prepositional ')

    if (!looksLikeForm) return null

    // Grab the last "word-like" token (letters/marks/hyphen). This works across scripts.
    const m = t.match(/([\p{L}\p{M}][\p{L}\p{M}-]*)\s*$/u)
    if (!m) return null

    const candidate = m[1]
    if (!candidate) return null
    return candidate
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

    // First try direct/fuzzy lookup.
    const entry = this.getFromDict(dict, word)
    if (!entry) return null

    // If the entry is a "form of X" pointer, follow it to show the base word's actual meaning.
    // This fixes cases like RU→EN returning "obsolete form of бра́тина" instead of the English gloss.
    const resolved = this.resolveFormLikeEntry(dict, entry, 0)
    return resolved ?? entry
  }

  private resolveFormLikeEntry(dict: DictionaryData, entry: DictionaryEntry, depth: number): DictionaryEntry | null {
    if (depth >= 3) return null

    const lemma = this.extractLemmaFromFormLikeTranslation(entry.translation)
    if (!lemma) return null

    const next = this.getFromDict(dict, lemma)
    if (!next) return null

    // Prevent loops like A -> B -> A
    const entryKey = this.normalizeLookupKey(entry.word)
    const nextKey = this.normalizeLookupKey(next.word)
    if (entryKey && nextKey && entryKey === nextKey) return null

    const deeper = this.resolveFormLikeEntry(dict, next, depth + 1)
    return deeper ?? next
  }
  
  isLoaded(pair: LanguagePair): boolean {
    return this.dictionaries.has(this.getKey(pair))
  }
  
  clear(): void {
    this.dictionaries.clear()
  }
}

export const dictionaryService = new DictionaryService()
