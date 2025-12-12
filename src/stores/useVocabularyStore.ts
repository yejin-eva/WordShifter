import { create } from 'zustand'
import { VocabularyEntry, VocabularyFilter } from '@/types/vocabulary.types'
import { vocabularyStorage } from '@/services/storage/vocabularyStorage'
import { LanguageCode } from '@/constants/languages'

interface VocabularyStore {
  // State
  entries: VocabularyEntry[]
  filter: VocabularyFilter
  isLoading: boolean
  
  // Actions
  loadEntries: () => Promise<void>
  setFilter: (filter: VocabularyFilter) => Promise<void>
  
  saveWord: (params: {
    original: string
    translation: string
    partOfSpeech: string
    sourceLanguage: LanguageCode
    targetLanguage: LanguageCode
    textId?: string
    textTitle?: string
    isPhrase?: boolean
  }) => Promise<boolean>
  
  deleteEntry: (id: string) => Promise<void>
  
  // Helpers
  isWordSaved: (original: string, sourceLanguage: LanguageCode, targetLanguage: LanguageCode) => Promise<boolean>
}

export const useVocabularyStore = create<VocabularyStore>((set, get) => ({
  entries: [],
  filter: { type: 'all' },
  isLoading: false,
  
  loadEntries: async () => {
    set({ isLoading: true })
    try {
      const entries = await vocabularyStorage.getAll(get().filter)
      set({ entries, isLoading: false })
    } catch (error) {
      console.error('Failed to load vocabulary:', error)
      set({ isLoading: false })
    }
  },
  
  setFilter: async (filter) => {
    set({ filter, isLoading: true })
    try {
      const entries = await vocabularyStorage.getAll(filter)
      set({ entries, isLoading: false })
    } catch (error) {
      console.error('Failed to filter vocabulary:', error)
      set({ isLoading: false })
    }
  },
  
  saveWord: async (params) => {
    const { original, translation, partOfSpeech, sourceLanguage, targetLanguage, textId, textTitle, isPhrase = false } = params
    
    // Check if already saved
    const exists = await vocabularyStorage.exists(original, sourceLanguage, targetLanguage)
    if (exists) {
      return false // Already saved
    }
    
    const entry: VocabularyEntry = {
      id: crypto.randomUUID(),
      original,
      translation,
      partOfSpeech,
      sourceLanguage,
      targetLanguage,
      textId,
      textTitle,
      isPhrase,
      createdAt: new Date(),
    }
    
    await vocabularyStorage.save(entry)
    
    // Reload entries if filter matches
    const { filter } = get()
    if (
      filter.type === 'all' ||
      (filter.type === 'byLanguage' && filter.sourceLanguage === sourceLanguage && filter.targetLanguage === targetLanguage) ||
      (filter.type === 'byText' && filter.textId === textId)
    ) {
      const entries = await vocabularyStorage.getAll(filter)
      set({ entries })
    }
    
    return true
  },
  
  deleteEntry: async (id) => {
    await vocabularyStorage.delete(id)
    // Reload entries
    const entries = await vocabularyStorage.getAll(get().filter)
    set({ entries })
  },
  
  isWordSaved: async (original, sourceLanguage, targetLanguage) => {
    return vocabularyStorage.exists(original, sourceLanguage, targetLanguage)
  },
}))

