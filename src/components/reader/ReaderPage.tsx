import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Token } from '@/types/text.types'
import { TextDisplay } from './TextDisplay'
import { TranslationBubble } from './TranslationBubble'
import { PageNavigator } from './PageNavigator'
import { useTextStore } from '@/stores/useTextStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import { getTranslationService } from '@/services/translation/translationService'
import { LanguageCode } from '@/constants/languages'
import { usePagination } from '@/hooks/usePagination'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

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
    displayMode,
    setDisplayMode,
  } = useUIStore()
  
  // Ref to track currently highlighted element
  const selectedElementRef = useRef<HTMLSpanElement | null>(null)
  
  // Container ref for measuring height (pagination)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(500)
  
  // Measure container height for pagination
  useEffect(() => {
    const updateHeight = () => {
      if (textContainerRef.current) {
        setContainerHeight(textContainerRef.current.clientHeight)
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])
  
  // Pagination hook
  const pagination = usePagination({
    tokens: currentText?.tokens || [],
    containerHeight,
  })
  
  // Swipe gesture for page navigation on touch devices
  const swipeRef = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: pagination.nextPage,
    onSwipeRight: pagination.prevPage,
    enabled: displayMode === 'page',
  })
  
  // Get translation service instance (stable)
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
  
  // ============================================
  // STABLE CALLBACKS using refs pattern
  // These don't change identity on re-render!
  // ============================================
  
  // Store the latest selectWord in a ref so callback doesn't need it as dependency
  const selectWordRef = useRef(selectWord)
  useEffect(() => { selectWordRef.current = selectWord }, [selectWord])
  
  const setPhraseTranslationRef = useRef(setPhraseTranslation)
  useEffect(() => { setPhraseTranslationRef.current = setPhraseTranslation }, [])
  
  // STABLE word click handler - never changes identity!
  const handleWordClick = useCallback((token: Token, element: HTMLSpanElement) => {
    setPhraseTranslationRef.current(null)
    
    // Remove highlight from previous element (O(1))
    if (selectedElementRef.current) {
      selectedElementRef.current.classList.remove('word-selected')
    }
    
    // Add highlight to new element (O(1))
    element.classList.add('word-selected')
    selectedElementRef.current = element
    
    // Calculate bubble position
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    // Update store for bubble
    selectWordRef.current(token.index, token.value, position, placement)
  }, []) // Empty deps = stable identity!
  
  // Store refs for double-click handler dependencies
  const getTranslationRef = useRef(getTranslation)
  useEffect(() => { getTranslationRef.current = getTranslation }, [getTranslation])
  
  const currentTextRef = useRef(currentText)
  useEffect(() => { currentTextRef.current = currentText }, [currentText])
  
  const saveWordRef = useRef(useVocabularyStore.getState().saveWord)
  useEffect(() => {
    saveWordRef.current = useVocabularyStore.getState().saveWord
  }, [])
  
  // STABLE double-click handler
  const handleWordDoubleClick = useCallback(async (token: Token) => {
    const translation = getTranslationRef.current(token.value)
    const text = currentTextRef.current
    if (translation && text) {
      const saved = await saveWordRef.current({
        original: token.value,
        translation: translation.translation,
        partOfSpeech: translation.partOfSpeech || 'unknown',
        sourceLanguage: text.sourceLanguage as LanguageCode,
        targetLanguage: text.targetLanguage as LanguageCode,
        textId: text.id,
        textTitle: text.title,
        isPhrase: false,
      })
      if (saved) {
        toast.success(`Saved "${token.value}"`, { description: `→ ${translation.translation}` })
      } else {
        toast.info(`"${token.value}" already saved`)
      }
    }
  }, []) // Empty deps = stable identity!
  
  // Store ref for phrase translation dependencies
  const translationServiceRef = useRef(translationService)
  useEffect(() => { translationServiceRef.current = translationService }, [translationService])
  
  // STABLE phrase click handler
  const handlePhraseClick = useCallback(async (tokens: Token[], element: HTMLSpanElement) => {
    const text = currentTextRef.current
    if (!text || tokens.length < 2) return
    
    // Clear word selection
    if (selectedElementRef.current) {
      selectedElementRef.current.classList.remove('word-selected')
      selectedElementRef.current = null
    }
    
    const phraseText = tokens.map(t => t.value).join(' ')
    
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    setIsTranslatingPhrase(true)
    setPhraseTranslationRef.current({
      text: phraseText,
      translation: 'Translating...',
      position,
      placement,
    })
    
    try {
      const result = await translationServiceRef.current.translatePhrase(
        phraseText,
        { source: text.sourceLanguage, target: text.targetLanguage }
      )
      
      setPhraseTranslationRef.current({
        text: phraseText,
        translation: result.translation,
        position,
        placement,
      })
    } catch (error) {
      console.error('Phrase translation failed:', error)
      setPhraseTranslationRef.current({
        text: phraseText,
        translation: '(translation failed)',
        position,
        placement,
      })
    } finally {
      setIsTranslatingPhrase(false)
    }
  }, []) // Empty deps = stable identity!
  
  // ============================================
  // Non-stable callbacks (these are fine, not passed to TextDisplay)
  // ============================================
  
  const handleClearSelection = useCallback(() => {
    if (selectedElementRef.current) {
      selectedElementRef.current.classList.remove('word-selected')
      selectedElementRef.current = null
    }
    clearSelection()
  }, [clearSelection])
  
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
  
  const handleSaveWord = useCallback(async () => {
    if (selectedWord && selectedTranslation) {
      await saveToVocabulary(
        selectedWord, 
        selectedTranslation.translation, 
        selectedTranslation.partOfSpeech || 'unknown'
      )
    }
    handleClearSelection()
  }, [selectedWord, selectedTranslation, saveToVocabulary, handleClearSelection])
  
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
    <div className="relative flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>
        
        <h2 className="text-lg font-medium text-gray-900">
          {currentText.title}
        </h2>
        
        <div className="flex items-center gap-4">
          {/* Display mode toggle */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setDisplayMode('scroll')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'scroll' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📜 Scroll
            </button>
            <button
              onClick={() => setDisplayMode('page')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'page' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📖 Page
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            {currentText.sourceLanguage.toUpperCase()} → {currentText.targetLanguage.toUpperCase()}
          </div>
        </div>
      </div>
      
      {/* Text content */}
      <div 
        ref={(el) => {
          // Combine refs
          textContainerRef.current = el
          ;(swipeRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        className={`flex-1 relative ${displayMode === 'page' ? 'overflow-hidden pb-6' : 'overflow-auto'}`}
      >
        <TextDisplay
          processedText={currentText}
          tokens={displayMode === 'page' ? pagination.pageTokens : undefined}
          onWordClick={handleWordClick}
          onWordDoubleClick={handleWordDoubleClick}
          onPhraseClick={handlePhraseClick}
        />
        
        {/* Tap zones for page navigation (only in page mode) */}
        {displayMode === 'page' && (
          <>
            {/* Left tap zone - previous page */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-16 cursor-pointer opacity-0 hover:opacity-10 hover:bg-gray-500 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                pagination.prevPage()
              }}
              title="Previous page"
            />
            {/* Right tap zone - next page */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-16 cursor-pointer opacity-0 hover:opacity-10 hover:bg-gray-500 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                pagination.nextPage()
              }}
              title="Next page"
            />
          </>
        )}
      </div>
      
      {/* Page navigation (only in page mode) */}
      {displayMode === 'page' && (
        <PageNavigator
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrevPage={pagination.prevPage}
          onNextPage={pagination.nextPage}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
        />
      )}
      
      {/* Single word translation bubble */}
      {selectedWord && selectedTranslation && bubblePosition && !phraseTranslation && (
        <TranslationBubble
          translation={selectedTranslation.translation}
          partOfSpeech={selectedTranslation.partOfSpeech}
          position={bubblePosition}
          placement={bubblePlacement}
          onSave={handleSaveWord}
          onRetry={handleRetryTranslation}
          onClose={handleClearSelection}
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
