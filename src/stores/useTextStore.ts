import { create } from 'zustand'
import { ProcessedText, ProcessingState, Token, ProcessedWord } from '@/types/text.types'
import { LanguageCode } from '@/constants/languages'
import { parseFile } from '@/services/fileParser'
import { tokenize } from '@/services/language/tokenizer'
import { getTranslationService } from '@/services/translation'
import { textStorage } from '@/services/storage/textStorage'

interface TextStore {
  // Current text being read
  currentText: ProcessedText | null
  
  // Word index for O(1) lookup by ID
  wordIndex: Map<string, ProcessedWord>
  
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
  
  // Get a word by its ID (O(1) lookup)
  getWordById: (wordId: string) => ProcessedWord | undefined
  
  // Update a word's translation
  updateWord: (wordId: string, translation: string, partOfSpeech: string) => void
  
  // Load a saved text
  loadSavedText: (id: string) => Promise<boolean>
}

const initialProcessingState: ProcessingState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
}

// Build word index for O(1) lookup
function buildWordIndex(words: ProcessedWord[]): Map<string, ProcessedWord> {
  const index = new Map<string, ProcessedWord>()
  for (const word of words) {
    index.set(word.id, word)
  }
  return index
}

export const useTextStore = create<TextStore>((set, get) => ({
  currentText: null,
  wordIndex: new Map(),
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
      
      // Step 3: Load dictionary and translate (instant with dictionary!)
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
      
      const processedWords = await translationService.processTokens(
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
        processingMode: 'full',  // Always full (instant with dictionary)
      }
      
      set({
        currentText: processedText,
        wordIndex: buildWordIndex(processedText.words),  // Build index for O(1) lookup
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
  
  setCurrentText: (text) => set({ 
    currentText: text,
    wordIndex: text ? buildWordIndex(text.words) : new Map(),
  }),
  
  clearCurrentText: () => set({ 
    currentText: null,
    wordIndex: new Map(),
    processing: initialProcessingState 
  }),
  
  getWordById: (wordId) => {
    // O(1) lookup using index!
    return get().wordIndex.get(wordId)
  },
  
  updateWord: (wordId, translation, partOfSpeech) => {
    const { currentText, wordIndex } = get()
    if (!currentText) return
    
    const updatedWord = { ...wordIndex.get(wordId)!, translation, partOfSpeech }
    
    // Update in array
    const updatedWords = currentText.words.map(word =>
      word.id === wordId ? updatedWord : word
    )
    
    // Update in index (O(1))
    const newIndex = new Map(wordIndex)
    newIndex.set(wordId, updatedWord)
    
    set({
      currentText: { ...currentText, words: updatedWords },
      wordIndex: newIndex,
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
        wordIndex: buildWordIndex(savedText.words),
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

