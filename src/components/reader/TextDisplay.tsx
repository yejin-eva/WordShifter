import { useCallback, useRef, useState, memo, useMemo, useEffect } from 'react'
import { ProcessedText, Token } from '@/types/text.types'
import { WordSpan } from './WordSpan'
import { useUIStore } from '@/stores/useUIStore'

interface TextDisplayProps {
  processedText: ProcessedText
  tokens?: Token[]  // Optional: if provided, renders these tokens instead of all
  onWordClick: (token: Token, element: HTMLSpanElement) => void
  onWordDoubleClick: (token: Token) => void
  onPhraseClick: (tokens: Token[], element: HTMLSpanElement) => void
}

export const TextDisplay = memo(function TextDisplay({
  processedText,
  tokens: tokensProp,
  onWordClick,
  onWordDoubleClick,
  onPhraseClick,
}: TextDisplayProps) {
  // Use provided tokens (for pagination) or all tokens
  const tokensToRender = tokensProp || processedText.tokens
  // Only subscribe to phrase selection
  const phraseSelection = useUIStore(state => state.phraseSelection)
  const selectPhrase = useUIStore(state => state.selectPhrase)
  const clearPhraseSelection = useUIStore(state => state.clearPhraseSelection)
  
  // Drag selection state - stored in refs to avoid re-renders
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<number | null>(null)
  const dragEndRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // For phrase selection UI update during drag
  const [, forceUpdate] = useState(0)
  
  // Store all callbacks in refs for stable handlers
  const onWordClickRef = useRef(onWordClick)
  const onWordDoubleClickRef = useRef(onWordDoubleClick)
  const onPhraseClickRef = useRef(onPhraseClick)
  const selectPhraseRef = useRef(selectPhrase)
  const clearPhraseSelectionRef = useRef(clearPhraseSelection)
  
  useEffect(() => { onWordClickRef.current = onWordClick }, [onWordClick])
  useEffect(() => { onWordDoubleClickRef.current = onWordDoubleClick }, [onWordDoubleClick])
  useEffect(() => { onPhraseClickRef.current = onPhraseClick }, [onPhraseClick])
  useEffect(() => { selectPhraseRef.current = selectPhrase }, [selectPhrase])
  useEffect(() => { clearPhraseSelectionRef.current = clearPhraseSelection }, [clearPhraseSelection])
  
  // ALL handlers use refs - completely stable!
  const stableOnWordClick = useCallback((token: Token, element: HTMLSpanElement) => {
    onWordClickRef.current(token, element)
  }, [])
  
  const stableOnWordDoubleClick = useCallback((token: Token) => {
    onWordDoubleClickRef.current(token)
  }, [])
  
  const stableOnMouseDown = useCallback((wordIndex: number) => {
    isDraggingRef.current = true
    dragStartRef.current = wordIndex
    dragEndRef.current = wordIndex
    clearPhraseSelectionRef.current()
  }, [])
  
  const stableOnMouseEnter = useCallback((wordIndex: number) => {
    if (isDraggingRef.current) {
      dragEndRef.current = wordIndex
      // Update phrase highlight during drag
      if (containerRef.current && dragStartRef.current !== null) {
        // Remove old drag selection
        containerRef.current.querySelectorAll('.phrase-selected').forEach(el => {
          el.classList.remove('phrase-selected')
        })
        // Add new drag selection
        const start = Math.min(dragStartRef.current, wordIndex)
        const end = Math.max(dragStartRef.current, wordIndex)
        for (let i = start; i <= end; i++) {
          const el = containerRef.current.querySelector(`[data-word-index="${i}"]`)
          if (el) el.classList.add('phrase-selected')
        }
      }
    }
  }, [])
  
  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current && dragStartRef.current !== null && dragEndRef.current !== null) {
      const start = Math.min(dragStartRef.current, dragEndRef.current)
      const end = Math.max(dragStartRef.current, dragEndRef.current)
      
      if (start !== end) {
        selectPhraseRef.current(start, end)
      }
    }
    isDraggingRef.current = false
    dragStartRef.current = null
    dragEndRef.current = null
  }, [])
  
  // Store processedText in ref for phrase click handler
  const processedTextRef = useRef(processedText)
  useEffect(() => { processedTextRef.current = processedText }, [processedText])
  
  const phraseSelectionRef = useRef(phraseSelection)
  useEffect(() => { phraseSelectionRef.current = phraseSelection }, [phraseSelection])
  
  const handlePhraseClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const wordElement = target.closest('.word-clickable') as HTMLSpanElement
    const ps = phraseSelectionRef.current
    
    if (wordElement && ps) {
      const wordIndex = parseInt(wordElement.dataset.wordIndex || '0', 10)
      
      if (wordIndex >= ps.startIndex && wordIndex <= ps.endIndex) {
        const phraseTokens: Token[] = processedTextRef.current.tokens.filter(
          t => t.type === 'word' && t.index >= ps.startIndex && t.index <= ps.endIndex
        )
        
        if (phraseTokens.length > 1) {
          onPhraseClickRef.current(phraseTokens, wordElement)
          event.stopPropagation()
        }
      }
    }
  }, [])
  
  // Render tokens ONCE - only recalculate when tokens change!
  // All callbacks are stable (empty deps), so this won't recalculate on click
  const renderedTokens = useMemo(() => {
    console.time('renderTokens')
    const result = tokensToRender.map((token) => {
      if (token.type === 'word') {
        return (
          <WordSpan
            key={token.index}
            token={token}
            onClick={stableOnWordClick}
            onDoubleClick={stableOnWordDoubleClick}
            onMouseDown={stableOnMouseDown}
            onMouseEnter={stableOnMouseEnter}
          />
        )
      }
      
      if (token.type === 'whitespace') {
        return (
          <span key={token.index} className="whitespace-pre" data-token-index={token.index}>
            {token.value}
          </span>
        )
      }
      
      return (
        <span key={token.index} data-token-index={token.index}>
          {token.value}
        </span>
      )
    })
    console.timeEnd('renderTokens')
    return result
  }, [tokensToRender]) // ONLY depends on tokens! Callbacks are stable.
  
  // Apply phrase selection via CSS classes (avoid re-render)
  useEffect(() => {
    if (!containerRef.current) return
    
    // Remove old phrase selection
    containerRef.current.querySelectorAll('.phrase-selected').forEach(el => {
      el.classList.remove('phrase-selected')
    })
    
    // Add new phrase selection
    if (phraseSelection) {
      for (let i = phraseSelection.startIndex; i <= phraseSelection.endIndex; i++) {
        const el = containerRef.current.querySelector(`[data-word-index="${i}"]`)
        if (el) el.classList.add('phrase-selected')
      }
    }
  }, [phraseSelection])
  
  return (
    <div 
      ref={containerRef}
      className="reader-text select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handlePhraseClick}
    >
      {renderedTokens}
    </div>
  )
})
