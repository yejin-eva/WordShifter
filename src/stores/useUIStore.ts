import { create } from 'zustand'

interface UIStore {
  // Selected word for translation bubble
  selectedWordId: string | null
  bubblePosition: { x: number; y: number } | null
  bubblePlacement: 'above' | 'below'
  
  // Phrase selection
  phraseSelection: {
    startIndex: number
    endIndex: number
  } | null
  
  // Display mode
  displayMode: 'scroll' | 'page'
  currentPage: number
  
  // Actions
  selectWord: (wordId: string, position: { x: number; y: number }, placement: 'above' | 'below') => void
  clearSelection: () => void
  
  selectPhrase: (startIndex: number, endIndex: number) => void
  clearPhraseSelection: () => void
  
  setDisplayMode: (mode: 'scroll' | 'page') => void
  setCurrentPage: (page: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedWordId: null,
  bubblePosition: null,
  bubblePlacement: 'above',
  phraseSelection: null,
  displayMode: 'scroll',
  currentPage: 1,
  
  selectWord: (wordId, position, placement) => set({
    selectedWordId: wordId,
    bubblePosition: position,
    bubblePlacement: placement,
    phraseSelection: null,  // Clear phrase selection when selecting word
  }),
  
  clearSelection: () => set({
    selectedWordId: null,
    bubblePosition: null,
  }),
  
  selectPhrase: (startIndex, endIndex) => set({
    phraseSelection: { startIndex, endIndex },
    selectedWordId: null,  // Clear word selection when selecting phrase
  }),
  
  clearPhraseSelection: () => set({
    phraseSelection: null,
  }),
  
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setCurrentPage: (page) => set({ currentPage: page }),
}))

