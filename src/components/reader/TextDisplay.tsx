import { useCallback, useRef, useState, memo, useMemo, useEffect } from 'react'
import { ProcessedText, Token } from '@/types/text.types'
import { WordSpan } from './WordSpan'
import { useUIStore } from '@/stores/useUIStore'

interface TextDisplayProps {
  processedText: ProcessedText
  onWordClick: (token: Token, element: HTMLSpanElement) => void
  onWordDoubleClick: (token: Token) => void
  onPhraseClick: (tokens: Token[], element: HTMLSpanElement) => void
}

export const TextDisplay = memo(function TextDisplay({
  processedText,
  onWordClick,
  onWordDoubleClick,
  onPhraseClick,
}: TextDisplayProps) {
  // Only subscribe to phrase selection
  const phraseSelection = useUIStore(state => state.phraseSelection)
  const selectPhrase = useUIStore(state => state.selectPhrase)
  const clearPhraseSelection = useUIStore(state => state.clearPhraseSelection)
  
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Store callbacks in refs for stable handlers
  const onWordClickRef = useRef(onWordClick)
  const onWordDoubleClickRef = useRef(onWordDoubleClick)
  const onPhraseClickRef = useRef(onPhraseClick)
  
  useEffect(() => { onWordClickRef.current = onWordClick }, [onWordClick])
  useEffect(() => { onWordDoubleClickRef.current = onWordDoubleClick }, [onWordDoubleClick])
  useEffect(() => { onPhraseClickRef.current = onPhraseClick }, [onPhraseClick])
  
  // STABLE click handler - uses refs
  const stableOnWordClick = useCallback((token: Token, element: HTMLSpanElement) => {
    onWordClickRef.current(token, element)
  }, [])
  
  const stableOnWordDoubleClick = useCallback((token: Token) => {
    onWordDoubleClickRef.current(token)
  }, [])
  
  // Phrase selection check - only depends on phrase state
  const isInPhraseSelection = useCallback((index: number) => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)
      return index >= start && index <= end
    }
    if (!phraseSelection) return false
    return index >= phraseSelection.startIndex && index <= phraseSelection.endIndex
  }, [phraseSelection, isDragging, dragStart, dragEnd])
  
  const handleMouseDown = useCallback((wordIndex: number) => {
    setIsDragging(true)
    setDragStart(wordIndex)
    setDragEnd(wordIndex)
    clearPhraseSelection()
  }, [clearPhraseSelection])
  
  const handleMouseEnter = useCallback((wordIndex: number) => {
    if (isDragging) {
      setDragEnd(wordIndex)
    }
  }, [isDragging])
  
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)
      
      if (start !== end) {
        selectPhrase(start, end)
      }
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, selectPhrase])
  
  // Store processedText in ref for phrase click handler
  const processedTextRef = useRef(processedText)
  useEffect(() => { processedTextRef.current = processedText }, [processedText])
  
  const handlePhraseClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const wordElement = target.closest('.word-clickable') as HTMLSpanElement
    
    if (wordElement && phraseSelection) {
      const wordIndex = parseInt(wordElement.dataset.wordIndex || '0', 10)
      
      if (wordIndex >= phraseSelection.startIndex && wordIndex <= phraseSelection.endIndex) {
        const phraseTokens: Token[] = processedTextRef.current.tokens.filter(
          t => t.type === 'word' && 
               t.index >= phraseSelection.startIndex && 
               t.index <= phraseSelection.endIndex
        )
        
        if (phraseTokens.length > 1) {
          onPhraseClickRef.current(phraseTokens, wordElement)
          event.stopPropagation()
        }
      }
    }
  }, [phraseSelection])
  
  // Render tokens ONCE - only recalculate when tokens actually change
  // The callbacks are stable, so they won't cause recalculation
  const renderedTokens = useMemo(() => {
    console.time('renderTokens')
    const result = processedText.tokens.map((token) => {
      if (token.type === 'word') {
        return (
          <WordSpan
            key={token.index}
            token={token}
            isInPhraseSelection={false} // Will be updated via CSS for phrase selection
            onClick={stableOnWordClick}
            onDoubleClick={stableOnWordDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
          />
        )
      }
      
      if (token.type === 'whitespace') {
        return (
          <span key={token.index} className="whitespace-pre">
            {token.value}
          </span>
        )
      }
      
      return <span key={token.index}>{token.value}</span>
    })
    console.timeEnd('renderTokens')
    return result
  }, [processedText.tokens, stableOnWordClick, stableOnWordDoubleClick, handleMouseDown, handleMouseEnter])
  
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
