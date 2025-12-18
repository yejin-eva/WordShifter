import { db, StoredDictionary } from './database'
import { LanguagePair } from '@/types/translation.types'

function pairKey(pair: LanguagePair): string {
  return `${pair.source}-${pair.target}`
}

function estimateEntryCount(rawData: unknown): number {
  if (Array.isArray(rawData)) return rawData.length
  if (rawData && typeof rawData === 'object') return Object.keys(rawData as any).length
  return 0
}

/**
 * Service for caching dictionaries in IndexedDB (Dexie)
 */
export const dictionaryStorage = {
  keyForPair: pairKey,

  async get(pair: LanguagePair): Promise<StoredDictionary | null> {
    const key = pairKey(pair)
    return (await db.dictionaries.get(key)) || null
  },

  async list(): Promise<StoredDictionary[]> {
    return db.dictionaries.orderBy('updatedAt').reverse().toArray()
  },

  async exists(pair: LanguagePair): Promise<boolean> {
    const key = pairKey(pair)
    const count = await db.dictionaries.where('key').equals(key).count()
    return count > 0
  },

  async save(pair: LanguagePair, rawData: unknown): Promise<void> {
    const key = pairKey(pair)
    const now = new Date()

    const dataStr = JSON.stringify(rawData)
    const entryCount = estimateEntryCount(rawData)

    const existing = await db.dictionaries.get(key)

    const stored: StoredDictionary = {
      key,
      sourceLanguage: pair.source,
      targetLanguage: pair.target,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      entryCount,
      data: dataStr,
    }

    await db.dictionaries.put(stored)
  },

  async remove(pair: LanguagePair): Promise<void> {
    await db.dictionaries.delete(pairKey(pair))
  },

  async clear(): Promise<void> {
    await db.dictionaries.clear()
  },
}


