import { create } from 'zustand'
import { ProcessedText, ProcessingState, Token, WordTranslation } from '@/types/text.types'
import { LanguageCode } from '@/constants/languages'
import { parseFile } from '@/services/fileParser'
import { tokenize } from '@/services/language/tokenizer'
import { getTranslationService } from '@/services/translation'
import { textStorage } from '@/services/storage/textStorage'

interface TextStore {
  // Current text being read
  currentText: ProcessedText | null
  
  // Processing state
  processing: ProcessingState
  
  // Actions
  processFile: (
    file: File,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ) => Promise<void>
  
  setCurrentText: (text: ProcessedText | null) => void
  clearCurrentText: () => void
  
  // Get translation for a word (O(1) lookup by normalized key)
  getTranslation: (word: string) => WordTranslation | undefined
  
  // Update a word's translation in the dictionary
  updateTranslation: (normalized: string, translation: string, partOfSpeech: string) => void
  
  // Load a saved text
  loadSavedText: (id: string) => Promise<boolean>
  
  // Update reading position (both store and IndexedDB)
  updateReadingPosition: (tokenIndex: number) => void
  
  // Update font size (both store and IndexedDB)
  updateFontSize: (fontSize: number) => void
}

const initialProcessingState: ProcessingState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
}

export const useTextStore = create<TextStore>((set, get) => ({
  currentText: null,
  processing: initialProcessingState,
  
  processFile: async (file, sourceLanguage, targetLanguage) => {
    const pair = { source: sourceLanguage, target: targetLanguage }
    
    try {
      // Step 1: Parse file
      set({
        processing: {
          status: 'parsing',
          progress: 0,
          currentStep: 'Reading file...',
        },
      })
      
      const content = await parseFile(file)
      
      // Step 2: Tokenize
      set({
        processing: {
          status: 'tokenizing',
          progress: 10,
          currentStep: 'Tokenizing text...',
        },
      })
      
      const tokens: Token[] = tokenize(content)
      
      // Step 3: Load dictionary and build word dict (instant!)
      set({
        processing: {
          status: 'translating',
          progress: 12,
          currentStep: 'Loading dictionary...',
        },
      })
      
      const translationService = getTranslationService()
      await translationService.loadDictionary(pair)
      
      set({
        processing: {
          status: 'translating',
          progress: 15,
          currentStep: 'Looking up words...',
        },
      })
      
      // Returns ONLY unique words (~15K for novel, not ~200K!)
      const wordDict = await translationService.processTokens(
        tokens,
        pair,
        (progress) => {
          const overallProgress = 15 + Math.round(progress * 0.8)
          set({
            processing: {
              status: 'translating',
              progress: overallProgress,
              currentStep: `Looking up words... ${progress}%`,
            },
          })
        }
      )
      
      // Step 4: Create processed text (lightweight - only stores unique words!)
      const processedText: ProcessedText = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        originalContent: content,
        sourceLanguage,
        targetLanguage,
        tokens,
        wordDict,  // Only unique words!
        createdAt: new Date(),
        lastOpenedAt: new Date(),
      }
      
      set({
        currentText: processedText,
        processing: {
          status: 'complete',
          progress: 100,
          currentStep: 'Complete!',
        },
      })
      
      // Save to IndexedDB for later
      textStorage.save(processedText).catch(err => {
        console.error('Failed to save text to storage:', err)
      })
      
    } catch (error) {
      set({
        processing: {
          status: 'error',
          progress: 0,
          currentStep: 'Processing failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      throw error
    }
  },
  
  setCurrentText: (text) => set({ currentText: text }),
  
  clearCurrentText: () => set({ 
    currentText: null,
    processing: initialProcessingState 
  }),
  
  getTranslation: (word) => {
    const { currentText } = get()
    if (!currentText) return undefined
    return currentText.wordDict[word.toLowerCase()]
  },
  
  updateTranslation: (normalized, translation, partOfSpeech) => {
    const { currentText } = get()
    if (!currentText) return
    
    // Update wordDict (immutable)
    const updatedWordDict = {
      ...currentText.wordDict,
      [normalized]: { translation, partOfSpeech }
    }
    
    const updatedText = { ...currentText, wordDict: updatedWordDict }
    
    set({ currentText: updatedText })
    
    // Persist to IndexedDB so it survives reload
    textStorage.save(updatedText).catch(err => {
      console.error('Failed to persist translation update:', err)
    })
  },
  
  loadSavedText: async (id) => {
    set({
      processing: {
        status: 'parsing',
        progress: 50,
        currentStep: 'Loading saved text...',
      },
    })
    
    try {
      const savedText = await textStorage.getById(id)
      
      if (!savedText) {
        set({
          processing: {
            status: 'error',
            progress: 0,
            currentStep: 'Text not found',
            error: 'Could not find saved text',
          },
        })
        return false
      }
      
      // Update last opened time
      await textStorage.updateLastOpened(id)
      
      set({
        currentText: savedText,
        processing: {
          status: 'complete',
          progress: 100,
          currentStep: 'Loaded!',
        },
      })
      
      return true
    } catch (error) {
      set({
        processing: {
          status: 'error',
          progress: 0,
          currentStep: 'Failed to load',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      return false
    }
  },
  
  updateReadingPosition: (tokenIndex) => {
    const { currentText } = get()
    if (!currentText) return
    
    // Update store immediately
    set({
      currentText: {
        ...currentText,
        lastReadTokenIndex: tokenIndex,
      },
    })
    
    // Persist to IndexedDB (async, fire-and-forget)
    textStorage.updateReadingPosition(currentText.id, tokenIndex).catch(err => {
      console.error('Failed to persist reading position:', err)
    })
  },
  
  updateFontSize: (fontSize) => {
    const { currentText } = get()
    if (!currentText) return
    
    // Update store immediately
    set({
      currentText: {
        ...currentText,
        fontSize,
      },
    })
    
    // Persist to IndexedDB (async, fire-and-forget)
    textStorage.updateFontSize(currentText.id, fontSize).catch(err => {
      console.error('Failed to persist font size:', err)
    })
  },
}))
