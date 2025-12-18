import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Available highlight colors
export const HIGHLIGHT_COLORS = {
  yellow: { name: 'Yellow', value: '#fef08a', dark: '#facc15' },
  green: { name: 'Green', value: '#bbf7d0', dark: '#4ade80' },
  blue: { name: 'Blue', value: '#bfdbfe', dark: '#60a5fa' },
  purple: { name: 'Purple', value: '#ddd6fe', dark: '#a78bfa' },
  pink: { name: 'Pink', value: '#fbcfe8', dark: '#f472b6' },
} as const

export type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS

// LLM Provider types
export type LLMProvider = 'ollama' | 'openai'

const SETTINGS_STORAGE_KEY = 'wordshifter-settings'
const LEGACY_SETTINGS_STORAGE_KEY = 'wordshift-settings'

const migratingSettingsStorage: Storage = {
  getItem: (name: string) => {
    const current = localStorage.getItem(name)
    if (current) return current

    // Migrate from older key (WordShift -> WordShifter rename)
    const legacy = localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY)
    if (legacy) {
      localStorage.setItem(name, legacy)
      return legacy
    }

    return null
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(name, value)
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
    localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY)
  },
  key: (index: number) => localStorage.key(index),
  length: localStorage.length,
  clear: () => localStorage.clear(),
}

interface SettingsState {
  // Appearance
  highlightColor: HighlightColorKey
  
  // Translation
  llmProvider: LLMProvider
  ollamaModel: string
  ollamaUrl: string
  openaiApiKey: string
  
  // Actions
  setHighlightColor: (color: HighlightColorKey) => void
  setLLMProvider: (provider: LLMProvider) => void
  setOllamaModel: (model: string) => void
  setOllamaUrl: (url: string) => void
  setOpenAIApiKey: (key: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      highlightColor: 'yellow',
      llmProvider: 'ollama',
      ollamaModel: 'qwen2.5:7b',
      ollamaUrl: 'http://localhost:11434',
      openaiApiKey: '',
      
      // Actions
      setHighlightColor: (color) => set({ highlightColor: color }),
      setLLMProvider: (provider) => set({ llmProvider: provider }),
      setOllamaModel: (model) => set({ ollamaModel: model }),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => migratingSettingsStorage),
    }
  )
)

