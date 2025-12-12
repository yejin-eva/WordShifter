import { useCallback, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { ProcessedWord } from '@/types/text.types'
import { TextDisplay } from './TextDisplay'
import { TranslationBubble } from './TranslationBubble'
import { useTextStore } from '@/stores/useTextStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import { getTranslationService } from '@/services/translation/translationService'
import { LanguageCode } from '@/constants/languages'

interface ReaderPageProps {
  onBack: () => void
}

export function ReaderPage({ onBack }: ReaderPageProps) {
  const { currentText, getWordById } = useTextStore()
  const { 
    selectedWordId, 
    bubblePosition, 
    bubblePlacement,
    selectWord, 
    clearSelection,
    clearPhraseSelection,
  } = useUIStore()
  
  // Get translation service instance
  const translationService = useMemo(() => getTranslationService(), [])
  
  // Phrase translation state
  const [phraseTranslation, setPhraseTranslation] = useState<{
    text: string
    translation: string
    position: { x: number; y: number }
    placement: 'above' | 'below'
  } | null>(null)
  const [, setIsTranslatingPhrase] = useState(false)
  
  // Get the selected word for the bubble
  const selectedWord = selectedWordId ? getWordById(selectedWordId) : undefined
  
  // Handle word click - show translation bubble
  const handleWordClick = useCallback((word: ProcessedWord, element: HTMLSpanElement) => {
    // Clear phrase translation when clicking a single word
    setPhraseTranslation(null)
    
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    
    // Determine placement: above if word is in lower half, below if in upper half
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    
    // Position at center of word
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    selectWord(word.id, position, placement)
  }, [selectWord])
  
  // Handle phrase click - translate the phrase
  const handlePhraseClick = useCallback(async (words: ProcessedWord[], element: HTMLSpanElement) => {
    if (!currentText || words.length < 2) return
    
    // Build phrase text
    const phraseText = words.map(w => w.original).join(' ')
    
    // Calculate position
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    // Show loading state
    setIsTranslatingPhrase(true)
    setPhraseTranslation({
      text: phraseText,
      translation: 'Translating...',
      position,
      placement,
    })
    
    try {
      // Translate the phrase
      const result = await translationService.translatePhrase(
        phraseText,
        { source: currentText.sourceLanguage, target: currentText.targetLanguage }
      )
      
      setPhraseTranslation({
        text: phraseText,
        translation: result.translation,
        position,
        placement,
      })
    } catch (error) {
      console.error('Phrase translation failed:', error)
      setPhraseTranslation({
        text: phraseText,
        translation: '(translation failed)',
        position,
        placement,
      })
    } finally {
      setIsTranslatingPhrase(false)
    }
  }, [currentText])
  
  // Get vocabulary store
  const { saveWord } = useVocabularyStore()
  
  // Helper to save word to vocabulary
  const saveToVocabulary = useCallback(async (
    original: string,
    translation: string,
    partOfSpeech: string,
    isPhrase: boolean = false
  ) => {
    if (!currentText) return false
    
    const saved = await saveWord({
      original,
      translation,
      partOfSpeech,
      sourceLanguage: currentText.sourceLanguage as LanguageCode,
      targetLanguage: currentText.targetLanguage as LanguageCode,
      textId: currentText.id,
      textTitle: currentText.title,
      isPhrase,
    })
    
    if (saved) {
      toast.success(`Saved "${original}"`, {
        description: `→ ${translation}`,
      })
    } else {
      toast.info(`"${original}" already saved`)
    }
    
    return saved
  }, [currentText, saveWord])
  
  // Handle double-click - save to vocabulary
  const handleWordDoubleClick = useCallback(async (word: ProcessedWord) => {
    await saveToVocabulary(word.original, word.translation, word.partOfSpeech)
  }, [saveToVocabulary])
  
  // Handle save from bubble
  const handleSaveWord = useCallback(async () => {
    if (selectedWord) {
      await saveToVocabulary(selectedWord.original, selectedWord.translation, selectedWord.partOfSpeech)
    }
    clearSelection()
  }, [selectedWord, saveToVocabulary, clearSelection])
  
  // Handle save phrase
  const handleSavePhrase = useCallback(async () => {
    if (phraseTranslation) {
      await saveToVocabulary(phraseTranslation.text, phraseTranslation.translation, 'phrase', true)
    }
    setPhraseTranslation(null)
    clearPhraseSelection()
  }, [phraseTranslation, saveToVocabulary, clearPhraseSelection])
  
  // Close phrase bubble
  const handleClosePhraseTranslation = useCallback(() => {
    setPhraseTranslation(null)
    clearPhraseSelection()
  }, [clearPhraseSelection])
  
  if (!currentText) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No text loaded</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:underline"
        >
          ← Go back to upload
        </button>
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>
        
        <h2 className="text-lg font-medium text-gray-900">
          {currentText.title}
        </h2>
        
        <div className="text-sm text-gray-500">
          {currentText.sourceLanguage.toUpperCase()} → {currentText.targetLanguage.toUpperCase()}
        </div>
      </div>
      
      {/* Text content */}
      <TextDisplay
        processedText={currentText}
        onWordClick={handleWordClick}
        onWordDoubleClick={handleWordDoubleClick}
        onPhraseClick={handlePhraseClick}
      />
      
      {/* Single word translation bubble */}
      {selectedWord && bubblePosition && !phraseTranslation && (
        <TranslationBubble
          translation={selectedWord.translation}
          partOfSpeech={selectedWord.partOfSpeech}
          position={bubblePosition}
          placement={bubblePlacement}
          onSave={handleSaveWord}
          onClose={clearSelection}
        />
      )}
      
      {/* Phrase translation bubble */}
      {phraseTranslation && (
        <TranslationBubble
          translation={phraseTranslation.translation}
          partOfSpeech="phrase"
          position={phraseTranslation.position}
          placement={phraseTranslation.placement}
          onSave={handleSavePhrase}
          onClose={handleClosePhraseTranslation}
        />
      )}
    </div>
  )
}

