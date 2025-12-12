import { create } from 'zustand'
import { ProcessedText, ProcessingState, Token, ProcessedWord } from '@/types/text.types'
import { LanguageCode } from '@/constants/languages'
import { ProcessingMode } from '@/types/processing.types'
import { LanguagePair } from '@/types/translation.types'
import { parseTxtFile } from '@/services/fileParser'
import { tokenize } from '@/services/language/tokenizer'
import { getTranslationService } from '@/services/translation'

interface TextStore {
  // Current text being read
  currentText: ProcessedText | null
  
  // Processing state
  processing: ProcessingState
  
  // Actions
  processFile: (
    file: File,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    mode: ProcessingMode
  ) => Promise<void>
  
  setCurrentText: (text: ProcessedText | null) => void
  clearCurrentText: () => void
  
  // Get a word by its ID
  getWordById: (wordId: string) => ProcessedWord | undefined
}

const initialProcessingState: ProcessingState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
}

export const useTextStore = create<TextStore>((set, get) => ({
  currentText: null,
  processing: initialProcessingState,
  
  processFile: async (file, sourceLanguage, targetLanguage, mode) => {
    const pair: LanguagePair = { source: sourceLanguage, target: targetLanguage }
    
    try {
      // Step 1: Parse file
      set({
        processing: {
          status: 'parsing',
          progress: 0,
          currentStep: 'Reading file...',
        },
      })
      
      const content = await parseTxtFile(file)
      
      // Step 2: Tokenize
      set({
        processing: {
          status: 'tokenizing',
          progress: 10,
          currentStep: 'Tokenizing text...',
        },
      })
      
      const tokens: Token[] = tokenize(content)
      
      // Step 3: Translate
      set({
        processing: {
          status: 'translating',
          progress: 15,
          currentStep: 'Translating words...',
        },
      })
      
      const translationService = getTranslationService()
      
      const processedWords = await translationService.processTokens(
        tokens,
        pair,
        (progress) => {
          // Map translation progress (0-100) to overall progress (15-95)
          const overallProgress = 15 + Math.round(progress * 0.8)
          set({
            processing: {
              status: 'translating',
              progress: overallProgress,
              currentStep: `Translating... ${progress}%`,
            },
          })
        }
      )
      
      // Step 4: Create processed text
      const processedText: ProcessedText = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ''),  // Remove extension
        originalContent: content,
        sourceLanguage,
        targetLanguage,
        tokens,
        words: processedWords,
        createdAt: new Date(),
        lastOpenedAt: new Date(),
        processingMode: mode,
      }
      
      set({
        currentText: processedText,
        processing: {
          status: 'complete',
          progress: 100,
          currentStep: 'Complete!',
        },
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
  
  getWordById: (wordId) => {
    const { currentText } = get()
    if (!currentText) return undefined
    return currentText.words.find(w => w.id === wordId)
  },
}))

