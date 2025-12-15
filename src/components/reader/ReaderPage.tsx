import { useCallback, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Token } from '@/types/text.types'
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
  const { currentText, getTranslation, updateTranslation } = useTextStore()
  const { 
    selectedWord,
    bubblePosition, 
    bubblePlacement,
    selectWord, 
    clearSelection,
    clearPhraseSelection,
  } = useUIStore()
  
  // Get translation service instance
  const translationService = useMemo(() => getTranslationService(), [])
  
  // Retry state
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Phrase translation state
  const [phraseTranslation, setPhraseTranslation] = useState<{
    text: string
    translation: string
    position: { x: number; y: number }
    placement: 'above' | 'below'
  } | null>(null)
  const [, setIsTranslatingPhrase] = useState(false)
  
  // Get translation for selected word
  const selectedTranslation = selectedWord ? getTranslation(selectedWord) : undefined
  
  // Handle word click - show translation bubble
  const handleWordClick = useCallback((token: Token, element: HTMLSpanElement) => {
    setPhraseTranslation(null)
    
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    selectWord(token.index, token.value, position, placement)
  }, [selectWord])
  
  // Handle phrase click - translate the phrase
  const handlePhraseClick = useCallback(async (tokens: Token[], element: HTMLSpanElement) => {
    if (!currentText || tokens.length < 2) return
    
    const phraseText = tokens.map(t => t.value).join(' ')
    
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    setIsTranslatingPhrase(true)
    setPhraseTranslation({
      text: phraseText,
      translation: 'Translating...',
      position,
      placement,
    })
    
    try {
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
  }, [currentText, translationService])
  
  const { saveWord } = useVocabularyStore()
  
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
      toast.success(`Saved "${original}"`, { description: `→ ${translation}` })
    } else {
      toast.info(`"${original}" already saved`)
    }
    
    return saved
  }, [currentText, saveWord])
  
  // Handle double-click - save to vocabulary
  const handleWordDoubleClick = useCallback(async (token: Token) => {
    const translation = getTranslation(token.value)
    if (translation) {
      await saveToVocabulary(
        token.value, 
        translation.translation, 
        translation.partOfSpeech || 'unknown'
      )
    }
  }, [getTranslation, saveToVocabulary])
  
  // Handle save from bubble
  const handleSaveWord = useCallback(async () => {
    if (selectedWord && selectedTranslation) {
      await saveToVocabulary(
        selectedWord, 
        selectedTranslation.translation, 
        selectedTranslation.partOfSpeech || 'unknown'
      )
    }
    clearSelection()
  }, [selectedWord, selectedTranslation, saveToVocabulary, clearSelection])
  
  // Handle save phrase
  const handleSavePhrase = useCallback(async () => {
    if (phraseTranslation) {
      await saveToVocabulary(phraseTranslation.text, phraseTranslation.translation, 'phrase', true)
    }
    setPhraseTranslation(null)
    clearPhraseSelection()
  }, [phraseTranslation, saveToVocabulary, clearPhraseSelection])
  
  const handleClosePhraseTranslation = useCallback(() => {
    setPhraseTranslation(null)
    clearPhraseSelection()
  }, [clearPhraseSelection])
  
  // Handle retry translation using LLM
  const handleRetryTranslation = useCallback(async () => {
    if (!selectedWord || !currentText) return
    
    setIsRetrying(true)
    
    try {
      const result = await translationService.translateWord(
        selectedWord,
        currentText.originalContent.substring(0, 200),
        { 
          source: currentText.sourceLanguage as LanguageCode, 
          target: currentText.targetLanguage as LanguageCode 
        }
      )
      
      // Update in wordDict (affects ALL occurrences of this word!)
      updateTranslation(selectedWord.toLowerCase(), result.translation, result.partOfSpeech)
      toast.success('Translation updated!')
    } catch (error) {
      console.error('Retry translation failed:', error)
      toast.error('Retry failed')
    } finally {
      setIsRetrying(false)
    }
  }, [selectedWord, currentText, translationService, updateTranslation])
  
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
      {selectedWord && selectedTranslation && bubblePosition && !phraseTranslation && (
        <TranslationBubble
          translation={selectedTranslation.translation}
          partOfSpeech={selectedTranslation.partOfSpeech}
          position={bubblePosition}
          placement={bubblePlacement}
          onSave={handleSaveWord}
          onRetry={handleRetryTranslation}
          onClose={clearSelection}
          isRetrying={isRetrying}
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
