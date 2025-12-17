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

interface ReaderPageProps {
  onBack: () => void
}

export function ReaderPage({ onBack }: ReaderPageProps) {
  const { currentText, getTranslation, updateTranslation, updateFontSize: storeFontSize, updateDisplayMode: storeDisplayMode } = useTextStore()
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
  
  // Initialize display mode from saved text on EVERY mount (not just per text ID)
  const hasInitializedDisplayModeRef = useRef(false)
  useEffect(() => {
    if (!currentText?.id) return
    
    // Only initialize once per mount
    if (hasInitializedDisplayModeRef.current) return
    hasInitializedDisplayModeRef.current = true
    
    // Use saved mode, or default to 'scroll' for new texts
    const modeToUse = currentText.displayMode || 'scroll'
    console.log(`[INIT] Restoring displayMode: saved="${currentText.displayMode}", using="${modeToUse}"`)
    setDisplayMode(modeToUse)
  }, [currentText?.id, currentText?.displayMode, setDisplayMode])
  
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
  
  // Handle font size change - update both local state and store
  const handleFontSizeChange = useCallback((newSize: number) => {
    setFontSize(newSize)
    storeFontSize(newSize)  // Updates store AND IndexedDB
  }, [storeFontSize])
  
  // Pagination hook
  const pagination = usePagination({
    tokens: currentText?.tokens || [],
    containerHeight,
    containerWidth,
    containerElement: textElement,
    fontSizePx: fontSize,
  })
  
  // ============================================
  // POSITION SAVING
  // ============================================
  
  const { updateReadingPosition, setSavePositionCallback } = useTextStore()
  
  // Store current values in refs for stable callback
  const displayModeRef = useRef(displayMode)
  displayModeRef.current = displayMode
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination
  const updateReadingPositionRef = useRef(updateReadingPosition)
  updateReadingPositionRef.current = updateReadingPosition
  
  // Ref to access tokens for debug logging
  const tokensRef = useRef(currentText?.tokens || [])
  tokensRef.current = currentText?.tokens || []
  
  // Stable save function - never changes, always reads current values from refs
  const savePosition = useCallback((): number => {
    let position = 0
    const mode = displayModeRef.current
    const tokens = tokensRef.current
    
    if (mode === 'page') {
      const page = paginationRef.current.currentPage
      position = paginationRef.current.pageStartIndex
      const word = tokens[position]?.value || '???'
      console.log(`[SAVE] Page mode - page ${page}, index: ${position}, word: "${word}"`)
    } else {
      const container = scrollContainerRef.current
      if (container) {
        // Use data-token-index so whitespace/punctuation can be saved too
        const tokensEls = container.querySelectorAll('[data-token-index]')
        const containerRect = container.getBoundingClientRect()
        
        for (const el of tokensEls) {
          const rect = (el as HTMLElement).getBoundingClientRect()
          if (rect.top >= containerRect.top - 5) {
            position = parseInt((el as HTMLElement).dataset.tokenIndex || '0', 10)
            const word = tokens[position]?.value || '???'
            console.log(`[SAVE] Scroll mode - index: ${position}, word: "${word}"`)
            break
          }
        }
      }
    }
    
    console.log(`[SAVE] Saving position: ${position}`)
    updateReadingPositionRef.current(position)
    return position
  }, []) // Empty deps - stable function
  
  // Register save callback with store ONCE on mount
  useEffect(() => {
    console.log(`[READER] Registering savePosition callback`)
    setSavePositionCallback(savePosition)
  }, [setSavePositionCallback, savePosition])
  
  // Wrapped back - saves position before going back
  const handleBack = useCallback(() => {
    savePosition()
    onBack()
  }, [savePosition, onBack]) // savePosition is stable (empty deps)
  
  // ============================================
  // POSITION RESTORING (mount only for now)
  // ============================================
  
  const restorePosition = useCallback((tokenIndex: number, targetMode: 'scroll' | 'page') => {
    const tokens = tokensRef.current
    const word = tokens[tokenIndex]?.value || '???'
    console.log(`[RESTORE] index: ${tokenIndex}, word: "${word}", mode: ${targetMode}`)
    
    if (targetMode === 'page') {
      paginationRef.current.goToTokenIndex(tokenIndex)
    } else {
      const container = scrollContainerRef.current
      if (container) {
        const tokenElement = container.querySelector(`[data-token-index="${tokenIndex}"]`) as HTMLElement
        if (tokenElement) {
          // scrollTop is more reliable than scrollIntoView when toggling hidden/display
          container.scrollTop = tokenElement.offsetTop
          console.log(`[RESTORE] Scrolled to token`)
        } else {
          console.log(`[RESTORE] Token element not found`)
        }
      } else {
        console.log(`[RESTORE] Scroll container not found`)
      }
    }
  }, [])
  
  // Restore position on mount (once per mount, after container is ready)
  const hasRestoredRef = useRef(false)
  useEffect(() => {
    if (!currentText?.id) return
    if (hasRestoredRef.current) return
    
    // Wait for container to have real dimensions (not defaults 500x800)
    if (containerHeight === 500 && containerWidth === 800) {
      console.log(`[RESTORE] Waiting for container dimensions...`)
      return // Will re-run when dimensions update
    }
    
    // Set flag IMMEDIATELY to prevent double execution
    hasRestoredRef.current = true
    
    const tokenIndex = currentText.lastReadTokenIndex ?? 0
    const mode = displayMode
    
    console.log(`[RESTORE] Mount - will restore to index ${tokenIndex} in ${mode} mode (container: ${containerWidth}x${containerHeight})`)
    
    // Wait for DOM to be ready
    requestAnimationFrame(() => {
      restorePosition(tokenIndex, mode)
    })
  }, [currentText?.id, currentText?.lastReadTokenIndex, displayMode, restorePosition, containerHeight, containerWidth])
  
  // ============================================
  // MODE SWITCHING (save only, no restore yet)
  // ============================================
  
  // Pending mode-switch restore (only used for scroll<->page switching)
  const pendingModeRestoreRef = useRef<{
    tokenIndex: number
    targetMode: 'scroll' | 'page'
  } | null>(null)
  
  // Apply pending restore after a mode switch.
  // This keeps the flow simple and explicit:
  // save -> switch -> restore (when ready)
  useEffect(() => {
    const pending = pendingModeRestoreRef.current
    if (!pending) return
    if (displayMode !== pending.targetMode) return
    if (!currentText?.id) return
    
    const tokenIndex = pending.tokenIndex
    
    if (displayMode === 'page') {
      // Page mode depends on page container height/width, which can differ from scroll mode.
      // Wait for real measured dimensions (avoid defaults).
      if (containerHeight === 500 && containerWidth === 800) return
      if (pagination.totalPages < 1) return
      
      // Don't clear pending until token is actually inside the current page range.
      // Pagination can recalc after first restore (e.g. page footer affects height).
      if (tokenIndex >= pagination.pageStartIndex && tokenIndex < pagination.pageEndIndex) {
        console.log(
          `[RESTORE] ModeSwitch -> page DONE (token ${tokenIndex} in ${pagination.pageStartIndex}-${pagination.pageEndIndex})`
        )
        pendingModeRestoreRef.current = null
        return
      }
      
      requestAnimationFrame(() => {
        console.log(`[RESTORE] ModeSwitch -> page retry, token ${tokenIndex}`)
        paginationRef.current.goToTokenIndex(tokenIndex)
      })
      return
    }
    
    // Scroll mode: scroll container exists and tokens are already rendered (hidden/shown via CSS).
    const container = scrollContainerRef.current
    if (!container) return
    
    // Token may be whitespace/punct/word; all tokens have data-token-index now.
    const el = container.querySelector(`[data-token-index="${tokenIndex}"]`) as HTMLElement | null
    if (!el) return
    
    requestAnimationFrame(() => {
      container.scrollTop = el.offsetTop
      console.log(`[RESTORE] ModeSwitch -> scroll, token ${tokenIndex}`)
      pendingModeRestoreRef.current = null
    })
  }, [
    displayMode,
    currentText?.id,
    containerHeight,
    containerWidth,
    pagination.totalPages,
    pagination.pageStartIndex,
    pagination.pageEndIndex,
  ])
  
  const handleModeSwitch = useCallback((mode: 'scroll' | 'page') => {
    if (mode === displayMode) return
    
    // 1) SAVE
    const tokenIndex = savePosition()
    
    // 2) SWITCH
    pendingModeRestoreRef.current = { tokenIndex, targetMode: mode }
    console.log(`[MODE SWITCH] ${displayMode} → ${mode}, token ${tokenIndex}`)
    setDisplayMode(mode)
    storeDisplayMode(mode)
  }, [displayMode, savePosition, setDisplayMode, storeDisplayMode])
  
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
          onClick={handleBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
        >
          ← Back
        </button>
        
        {/* Title + Language */}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentText.title}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({currentText.sourceLanguage.toUpperCase()} → {currentText.targetLanguage.toUpperCase()})
          </span>
        </div>
        
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
          onGoToPage={pagination.goToPage}
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

