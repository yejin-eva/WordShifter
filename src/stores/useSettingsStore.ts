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

// API provider types
export type ApiProvider = 'openai' | 'groq'

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
  apiProvider: ApiProvider
  openaiApiKey: string
  groqApiKey: string
  
  // Actions
  setHighlightColor: (color: HighlightColorKey) => void
  setApiProvider: (provider: ApiProvider) => void
  setOpenAIApiKey: (key: string) => void
  setGroqApiKey: (key: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      highlightColor: 'yellow',
      apiProvider: 'openai',
      openaiApiKey: '',
      groqApiKey: '',
      
      // Actions
      setHighlightColor: (color) => set({ highlightColor: color }),
      setApiProvider: (provider) => set({ apiProvider: provider }),
      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
      setGroqApiKey: (key) => set({ groqApiKey: key }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => migratingSettingsStorage),
      version: 3,
      migrate: (persisted: any, version) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        if (version >= 3) return persisted

        const state = persisted.state ?? persisted

        // App branch is API-only: strip any old Ollama fields and normalize API settings.
        const nextState = {
          highlightColor: state.highlightColor ?? 'yellow',
          apiProvider: state.apiProvider ?? 'openai',
          openaiApiKey: state.openaiApiKey ?? '',
          groqApiKey: state.groqApiKey ?? '',
        }

        return persisted.state ? { ...persisted, state: nextState } : nextState
      },
    }
  )
)

