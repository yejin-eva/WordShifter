import { create } from 'zustand'

interface UIStore {
  // Selected word for translation bubble
  selectedWordIndex: number | null
  selectedWord: string | null  // The original word text
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
  selectWord: (
    wordIndex: number, 
    word: string,
    position: { x: number; y: number }, 
    placement: 'above' | 'below'
  ) => void
  clearSelection: () => void
  
  selectPhrase: (startIndex: number, endIndex: number) => void
  clearPhraseSelection: () => void
  
  setDisplayMode: (mode: 'scroll' | 'page') => void
  setCurrentPage: (page: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedWordIndex: null,
  selectedWord: null,
  bubblePosition: null,
  bubblePlacement: 'above',
  phraseSelection: null,
  displayMode: 'scroll',
  currentPage: 1,
  
  selectWord: (wordIndex, word, position, placement) => set({
    selectedWordIndex: wordIndex,
    selectedWord: word,
    bubblePosition: position,
    bubblePlacement: placement,
    phraseSelection: null,
  }),
  
  clearSelection: () => set({
    selectedWordIndex: null,
    selectedWord: null,
    bubblePosition: null,
  }),
  
  selectPhrase: (startIndex, endIndex) => set({
    phraseSelection: { startIndex, endIndex },
    selectedWordIndex: null,
    selectedWord: null,
  }),
  
  clearPhraseSelection: () => set({
    phraseSelection: null,
  }),
  
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setCurrentPage: (page) => set({ currentPage: page }),
}))
