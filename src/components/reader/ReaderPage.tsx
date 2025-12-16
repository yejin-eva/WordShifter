import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Token } from '@/types/text.types'
import { TextDisplay } from './TextDisplay'
import { TranslationBubble } from './TranslationBubble'
import { PageNavigator } from './PageNavigator'
import { FontSizeDropdown } from './FontSizeDropdown'
import { useTextStore } from '@/stores/useTextStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import { getTranslationService } from '@/services/translation/translationService'
import { LanguageCode } from '@/constants/languages'
import { usePagination } from '@/hooks/usePagination'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { textStorage } from '@/services/storage/textStorage'

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
  
  // Ref for scroll container (needed for mode switch position tracking)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  
  // Ref to track currently highlighted element
  const selectedElementRef = useRef<HTMLSpanElement | null>(null)
  
  // Container ref for measuring dimensions (pagination)
  const textContainerRef = useRef<HTMLDivElement | null>(null)
  const measureContainerRef = useRef<HTMLDivElement | null>(null)
  const [containerHeight, setContainerHeight] = useState(500)
  const [containerWidth, setContainerWidth] = useState(800)
  
  // Measure container dimensions for pagination using ResizeObserver
  useEffect(() => {
    const updateDimensions = () => {
      // Use the measurement container (always visible) for accurate dimensions
      const container = measureContainerRef.current
      if (container) {
        const height = container.clientHeight
        const width = container.clientWidth
        if (height > 0 && width > 0) {
          setContainerHeight(height)
          setContainerWidth(width)
        }
      }
    }
    
    // Initial measurement
    updateDimensions()
    
    // Use ResizeObserver for accurate resize detection
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    
    if (measureContainerRef.current) {
      resizeObserver.observe(measureContainerRef.current)
    }
    
    // Also listen to window resize as backup
    window.addEventListener('resize', updateDimensions)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])
  
  // Re-measure when switching to page mode
  useEffect(() => {
    if (displayMode === 'page' && measureContainerRef.current) {
      const height = measureContainerRef.current.clientHeight
      const width = measureContainerRef.current.clientWidth
      if (height > 0 && width > 0) {
        setContainerHeight(height)
        setContainerWidth(width)
      }
    }
  }, [displayMode])
  
  // Ref for the page mode container (to find text element for CSS reading)
  const pageContainerRef = useRef<HTMLDivElement | null>(null)
  
  // Get the actual text element with reader-text styles
  const [textElement, setTextElement] = useState<HTMLElement | null>(null)
  
  useEffect(() => {
    if (pageContainerRef.current) {
      const el = pageContainerRef.current.querySelector('.reader-text') as HTMLElement
      if (el) setTextElement(el)
    }
  }, [currentText]) // Re-query when text changes
  
  // Font size state - default to text's saved size or 18px
  const DEFAULT_FONT_SIZE = 18
  const [fontSize, setFontSize] = useState(() => currentText?.fontSize ?? DEFAULT_FONT_SIZE)
  
  // Handle font size change
  const handleFontSizeChange = useCallback((newSize: number) => {
    setFontSize(newSize)
    if (currentText?.id) {
      textStorage.updateFontSize(currentText.id, newSize)
    }
  }, [currentText?.id])
  
  // Pagination hook
  const pagination = usePagination({
    tokens: currentText?.tokens || [],
    containerHeight,
    containerWidth,
    containerElement: textElement,
    fontSizePx: fontSize,
  })
  
  // Restore reading position when text loads
  const hasRestoredPosition = useRef(false)
  
  // Track current reading position (used for save on unmount)
  const currentTokenPositionRef = useRef(currentText?.lastReadTokenIndex || 0)
  
  useEffect(() => {
    if (currentText?.lastReadTokenIndex !== undefined && 
        pagination.totalPages > 1 && 
        !hasRestoredPosition.current) {
      pagination.goToTokenIndex(currentText.lastReadTokenIndex)
      hasRestoredPosition.current = true
    }
  }, [currentText?.lastReadTokenIndex, pagination.totalPages, pagination.goToTokenIndex])
  
  // Reset restoration flag when text changes OR component remounts
  useEffect(() => {
    hasRestoredPosition.current = false
  }, [currentText?.id])
  
  // Save position immediately when leaving the reader (component unmount)
  useEffect(() => {
    return () => {
      // Save current position on unmount
      if (currentText?.id && currentTokenPositionRef.current > 0) {
        textStorage.updateReadingPosition(currentText.id, currentTokenPositionRef.current)
      }
    }
  }, [currentText?.id])
  
  // Save reading position when page changes (debounced) - PAGE MODE
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  useEffect(() => {
    if (!currentText?.id || displayMode !== 'page') return
    
    // Debounce saves to avoid too many writes
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      textStorage.updateReadingPosition(currentText.id, pagination.pageStartIndex)
    }, 1000)  // Save 1 second after page change
    
    return () => clearTimeout(saveTimeoutRef.current)
  }, [currentText?.id, displayMode, pagination.currentPage, pagination.pageStartIndex])
  
  // Save reading position on scroll (debounced) - SCROLL MODE
  useEffect(() => {
    if (!currentText?.id || displayMode !== 'scroll') return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        // Find the first visible word by checking element positions
        const words = container.querySelectorAll('[data-word-index]')
        const containerTop = container.scrollTop
        
        for (const word of words) {
          const rect = (word as HTMLElement).offsetTop
          if (rect >= containerTop) {
            const tokenIndex = parseInt((word as HTMLElement).dataset.wordIndex || '0', 10)
            // Update ref and save to storage
            currentTokenPositionRef.current = tokenIndex
            textStorage.updateReadingPosition(currentText.id, tokenIndex)
            break
          }
        }
      }, 1000)
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(saveTimeoutRef.current)
    }
  }, [currentText?.id, displayMode])
  
  // Restore scroll position when loading in scroll mode
  useEffect(() => {
    if (!currentText?.lastReadTokenIndex || displayMode !== 'scroll' || hasRestoredPosition.current) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    // Wait for content to render, then scroll to saved position
    setTimeout(() => {
      const targetWord = container.querySelector(`[data-word-index="${currentText.lastReadTokenIndex}"]`) as HTMLElement
      if (targetWord) {
        container.scrollTop = targetWord.offsetTop - 50  // 50px offset from top
        hasRestoredPosition.current = true
      }
    }, 100)
  }, [currentText?.lastReadTokenIndex, displayMode])
  
  // Update position ref when page changes (page mode)
  useEffect(() => {
    if (displayMode === 'page') {
      currentTokenPositionRef.current = pagination.pageStartIndex
    }
  }, [displayMode, pagination.pageStartIndex])
  
  // Preserve position when page size changes (resize or font change)
  const lastTotalPagesRef = useRef(pagination.totalPages)
  const lastFontSizeRef = useRef(fontSize)
  
  useEffect(() => {
    const totalPagesChanged = pagination.totalPages !== lastTotalPagesRef.current
    const fontSizeChanged = fontSize !== lastFontSizeRef.current
    
    // Only restore if something actually changed
    if ((totalPagesChanged || fontSizeChanged) && displayMode === 'page') {
      const pos = currentTokenPositionRef.current
      if (pos > 0) {
        pagination.goToTokenIndex(pos)
      }
      lastTotalPagesRef.current = pagination.totalPages
      lastFontSizeRef.current = fontSize
    }
  }, [pagination.totalPages, fontSize, displayMode, pagination.goToTokenIndex])
  
  // Update position when scrolling
  useEffect(() => {
    if (displayMode !== 'scroll') return
    const container = scrollContainerRef.current
    if (!container) return
    
    const updateScrollPosition = () => {
      const words = container.querySelectorAll('[data-word-index]')
      const containerTop = container.scrollTop
      
      for (const word of words) {
        const wordTop = (word as HTMLElement).offsetTop
        if (wordTop >= containerTop) {
          const idx = parseInt((word as HTMLElement).dataset.wordIndex || '0', 10)
          currentTokenPositionRef.current = idx
          break
        }
      }
    }
    
    // Throttle scroll updates
    let timeout: NodeJS.Timeout
    const throttledUpdate = () => {
      clearTimeout(timeout)
      timeout = setTimeout(updateScrollPosition, 200)
    }
    
    container.addEventListener('scroll', throttledUpdate)
    return () => {
      container.removeEventListener('scroll', throttledUpdate)
      clearTimeout(timeout)
    }
  }, [displayMode])
  
  // Handle mode switch - use ref to avoid dependency on currentTokenPosition
  const handleModeSwitch = useCallback((mode: 'scroll' | 'page') => {
    if (mode === displayMode) return
    
    const positionToRestore = currentTokenPositionRef.current
    setDisplayMode(mode)
    
    // Restore position after mode switch
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (mode === 'page') {
          pagination.goToTokenIndex(positionToRestore)
        } else if (mode === 'scroll' && scrollContainerRef.current) {
          const targetWord = scrollContainerRef.current.querySelector(
            `[data-word-index="${positionToRestore}"]`
          ) as HTMLElement
          if (targetWord) {
            scrollContainerRef.current.scrollTop = targetWord.offsetTop - 20
          }
        }
      }, 50)
    })
  }, [displayMode, setDisplayMode, pagination.goToTokenIndex])
  
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
        <p className="text-gray-600 dark:text-gray-400">No text loaded</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Go back to upload
        </button>
      </div>
    )
  }
  
  return (
    <div className="relative flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
        >
          ← Back
        </button>
        
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {currentText.title}
        </h2>
        
        <div className="flex items-center gap-4">
          {/* Display mode toggle */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => handleModeSwitch('scroll')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'scroll' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📜 Scroll
            </button>
            <button
              onClick={() => handleModeSwitch('page')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'page' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📖 Page
            </button>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentText.sourceLanguage.toUpperCase()} → {currentText.targetLanguage.toUpperCase()}
          </div>
          
          {/* Font size control */}
          <FontSizeDropdown
            fontSize={fontSize}
            onChange={handleFontSizeChange}
          />
        </div>
      </div>
      
      {/* Container wrapper for dimension measurement - always visible */}
      <div ref={measureContainerRef} className="flex-1 flex flex-col min-h-0">
        {/* Text content - render BOTH views, toggle visibility with CSS */}
        {/* This prevents re-rendering 200K tokens when switching modes */}
        
        {/* Scroll mode view - always in DOM */}
        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-auto ${displayMode === 'scroll' ? '' : 'hidden'}`}
          style={{ '--reader-font-size': `${fontSize}px` } as React.CSSProperties}
        >
          <TextDisplay
            processedText={currentText}
            onWordClick={handleWordClick}
            onWordDoubleClick={handleWordDoubleClick}
            onPhraseClick={handlePhraseClick}
          />
        </div>
        
        {/* Page mode view */}
        <div 
          ref={(el) => {
            // Combine refs for swipe gestures
            textContainerRef.current = el
            ;(swipeRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          }}
          className={`flex-1 relative overflow-hidden pb-8 pt-2 ${displayMode === 'page' ? '' : 'hidden'}`}
          style={{ '--reader-font-size': `${fontSize}px` } as React.CSSProperties}
        >
        <div ref={pageContainerRef}>
          <TextDisplay
            processedText={currentText}
            tokens={pagination.pageTokens}
            onWordClick={handleWordClick}
            onWordDoubleClick={handleWordDoubleClick}
            onPhraseClick={handlePhraseClick}
          />
        </div>
        
        {/* Tap zones for page navigation */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-16 cursor-pointer opacity-0 hover:opacity-10 hover:bg-gray-500 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            pagination.prevPage()
          }}
          title="Previous page"
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-16 cursor-pointer opacity-0 hover:opacity-10 hover:bg-gray-500 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            pagination.nextPage()
          }}
          title="Next page"
        />
        </div>
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
