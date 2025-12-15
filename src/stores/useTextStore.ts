import { create } from 'zustand'
import { ProcessedText, ProcessingState, Token, ProcessedWord } from '@/types/text.types'
import { LanguageCode } from '@/constants/languages'
import { ProcessingMode } from '@/types/processing.types'
import { LanguagePair, TranslationResult } from '@/types/translation.types'
import { parseFile } from '@/services/fileParser'
import { tokenize } from '@/services/language/tokenizer'
import { getTranslationService } from '@/services/translation'
import { textStorage } from '@/services/storage/textStorage'

interface TextStore {
  // Current text being read
  currentText: ProcessedText | null
  
  // Processing state
  processing: ProcessingState
  
  // Background translation progress
  backgroundProgress: number // 0-100, for dynamic mode
  
  // Translation cache (shared across all batches)
  translationCache: Map<string, TranslationResult>
  
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
  
  // Load a saved text
  loadSavedText: (id: string) => Promise<boolean>
}

const initialProcessingState: ProcessingState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
}

// Global translation cache for current text (cleared on new text)
const createTranslationCache = () => new Map<string, TranslationResult>()

export const useTextStore = create<TextStore>((set, get) => ({
  currentText: null,
  processing: initialProcessingState,
  backgroundProgress: 100, // 100 = complete (or not started)
  translationCache: createTranslationCache(),
  
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
        
        // Clear and reset translation cache for new text
        const cache = createTranslationCache()
        set({ translationCache: cache })
        
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
        
        // Populate cache with initial translations
        for (const word of initialWords) {
          cache.set(word.normalized, {
            original: word.original,
            translation: word.translation,
            partOfSpeech: word.partOfSpeech || '',
          })
        }
        console.log(`Initial batch: ${initialWords.length} words, ${cache.size} unique cached`)
        
        // Create placeholder words for the rest (use cache if already translated!)
        const placeholderWords: ProcessedWord[] = remainingTokens.map(token => {
          const normalized = token.value.toLowerCase()
          const cached = cache.get(normalized)
          
          return {
            id: crypto.randomUUID(),
            original: token.value,
            normalized,
            translation: cached?.translation || '', // Use cache or empty
            partOfSpeech: cached?.partOfSpeech || '',
            index: token.index,
          }
        })
        
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
    const translationService = getTranslationService()
    const { currentText, translationCache: cache } = get()
    
    if (!currentText) return
    
    set({ backgroundProgress: 0 })
    
    // Step 1: Find unique words that haven't been translated yet
    const untranslatedWords = new Map<string, Token>() // normalized -> first token
    for (const token of tokens) {
      const normalized = token.value.toLowerCase()
      if (!cache.has(normalized) && !untranslatedWords.has(normalized)) {
        untranslatedWords.set(normalized, token)
      }
    }
    
    const uniqueToTranslate = Array.from(untranslatedWords.values())
    console.log(`Background: ${tokens.length} words, ${uniqueToTranslate.length} unique to translate (${cache.size} already cached)`)
    
    // Step 2: Translate unique words in small batches
    const BATCH_SIZE = 10
    for (let i = 0; i < uniqueToTranslate.length; i += BATCH_SIZE) {
      const batch = uniqueToTranslate.slice(i, i + BATCH_SIZE)
      
      // Yield to UI thread
      await new Promise(resolve => setTimeout(resolve, 0))
      
      try {
        const translatedBatch = await translationService.processTokens(
          batch.map(t => ({ ...t, type: 'word' as const })),
          pair,
          () => {}
        )
        
        // Add to cache
        for (const word of translatedBatch) {
          cache.set(word.normalized, {
            original: word.original,
            translation: word.translation,
            partOfSpeech: word.partOfSpeech || '',
          })
        }
        
        const progress = Math.round(((i + batch.length) / uniqueToTranslate.length) * 100)
        set({ backgroundProgress: progress })
        
      } catch (error) {
        console.error('Background translation batch failed:', error)
      }
      
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Step 3: Update ALL words from cache in one go
    const { currentText: latestText } = get()
    if (!latestText) return
    
    const updatedWords = latestText.words.map(word => {
      const cached = cache.get(word.normalized)
      if (cached && !word.translation) {
        return { ...word, translation: cached.translation, partOfSpeech: cached.partOfSpeech }
      }
      return word
    })
    
    set({
      currentText: { ...latestText, words: updatedWords },
      backgroundProgress: 100,
    })
    
    console.log(`Background complete: ${cache.size} unique translations cached`)
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
        backgroundProgress: 100,
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
}))

