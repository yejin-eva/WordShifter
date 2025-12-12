import { create } from 'zustand'
import { ProcessedText, ProcessingState, Token, ProcessedWord } from '@/types/text.types'
import { LanguageCode } from '@/constants/languages'
import { ProcessingMode } from '@/types/processing.types'
import { LanguagePair } from '@/types/translation.types'
import { parseFile } from '@/services/fileParser'
import { tokenize } from '@/services/language/tokenizer'
import { getTranslationService } from '@/services/translation'

interface TextStore {
  // Current text being read
  currentText: ProcessedText | null
  
  // Processing state
  processing: ProcessingState
  
  // Background translation progress
  backgroundProgress: number // 0-100, for dynamic mode
  
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
  
  // Update a word's translation
  updateWord: (wordId: string, translation: string, partOfSpeech: string) => void
  
  // Background translation for dynamic mode
  translateRemainingWords: (tokens: Token[], pair: LanguagePair) => Promise<void>
}

const initialProcessingState: ProcessingState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
}

export const useTextStore = create<TextStore>((set, get) => ({
  currentText: null,
  processing: initialProcessingState,
  backgroundProgress: 100, // 100 = complete (or not started)
  
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
      
      let processedWords: ProcessedWord[]
      
      if (mode === 'full') {
        // Full mode: Pre-translate all words
        set({
          processing: {
            status: 'translating',
            progress: 15,
            currentStep: 'Translating words...',
          },
        })
        
        const translationService = getTranslationService()
        
        processedWords = await translationService.processTokens(
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
      } else {
        // Dynamic mode: Translate first batch, continue in background
        const INITIAL_BATCH_SIZE = 50 // Translate first 50 words immediately
        
        set({
          processing: {
            status: 'translating',
            progress: 15,
            currentStep: 'Translating first page...',
          },
        })
        
        const translationService = getTranslationService()
        const wordTokens = tokens.filter(t => t.type === 'word')
        
        // Split into initial batch and rest
        const initialTokens = wordTokens.slice(0, INITIAL_BATCH_SIZE)
        const remainingTokens = wordTokens.slice(INITIAL_BATCH_SIZE)
        
        // Translate initial batch synchronously
        const initialWords = await translationService.processTokens(
          initialTokens.map(t => ({ ...t, type: 'word' as const })),
          pair,
          (progress) => {
            set({
              processing: {
                status: 'translating',
                progress: 15 + Math.round(progress * 0.3),
                currentStep: `Preparing first page... ${progress}%`,
              },
            })
          }
        )
        
        // Create placeholder words for the rest
        const placeholderWords: ProcessedWord[] = remainingTokens.map(token => ({
          id: crypto.randomUUID(),
          original: token.value,
          normalized: token.value.toLowerCase(),
          translation: '', // Empty = will be translated in background
          partOfSpeech: '',
          index: token.index,
        }))
        
        processedWords = [...initialWords, ...placeholderWords]
        
        // Start background translation after returning
        if (remainingTokens.length > 0) {
          // We'll trigger background translation after setting currentText
          setTimeout(() => {
            get().translateRemainingWords(remainingTokens, pair)
          }, 100)
        }
      }
      
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
  
  updateWord: (wordId, translation, partOfSpeech) => {
    const { currentText } = get()
    if (!currentText) return
    
    const updatedWords = currentText.words.map(word =>
      word.id === wordId
        ? { ...word, translation, partOfSpeech }
        : word
    )
    
    set({
      currentText: {
        ...currentText,
        words: updatedWords,
      },
    })
  },
  
  translateRemainingWords: async (tokens, pair) => {
    const BATCH_SIZE = 20 // Translate 20 words at a time in background
    const translationService = getTranslationService()
    const { currentText } = get()
    
    if (!currentText) return
    
    set({ backgroundProgress: 0 })
    
    // Process in batches
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE)
      
      try {
        const translatedBatch = await translationService.processTokens(
          batch.map(t => ({ ...t, type: 'word' as const })),
          pair,
          () => {} // No progress callback for background
        )
        
        // Update each word in the store
        const { currentText: latestText } = get()
        if (!latestText) return // User navigated away
        
        const updatedWords = [...latestText.words]
        for (const translated of translatedBatch) {
          const wordIndex = updatedWords.findIndex(w => w.index === translated.index)
          if (wordIndex !== -1) {
            updatedWords[wordIndex] = translated
          }
        }
        
        const progress = Math.round(((i + batch.length) / tokens.length) * 100)
        set({
          currentText: { ...latestText, words: updatedWords },
          backgroundProgress: progress,
        })
        
      } catch (error) {
        console.error('Background translation batch failed:', error)
        // Continue with next batch
      }
      
      // Small delay to avoid overwhelming the translation service
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    set({ backgroundProgress: 100 })
  },
}))

