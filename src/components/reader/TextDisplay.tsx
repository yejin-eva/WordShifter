import { useCallback, useRef, useState, memo, useMemo } from 'react'
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
  // Only subscribe to phrase selection, NOT word selection!
  // Word selection is handled via CSS class manipulation (no re-render)
  const { phraseSelection, selectPhrase, clearPhraseSelection } = useUIStore()
  
  // Drag selection state (local, doesn't affect other components)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Check if a word index is in the phrase selection
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
  
  const handlePhraseClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const wordElement = target.closest('.word-clickable') as HTMLSpanElement
    
    if (wordElement && phraseSelection) {
      const wordIndex = parseInt(wordElement.dataset.wordIndex || '0', 10)
      
      if (wordIndex >= phraseSelection.startIndex && wordIndex <= phraseSelection.endIndex) {
        const phraseTokens: Token[] = processedText.tokens.filter(
          t => t.type === 'word' && 
               t.index >= phraseSelection.startIndex && 
               t.index <= phraseSelection.endIndex
        )
        
        if (phraseTokens.length > 1) {
          onPhraseClick(phraseTokens, wordElement)
          event.stopPropagation()
        }
      }
    }
  }, [phraseSelection, processedText.tokens, onPhraseClick])
  
  // Memoize the rendered tokens - only re-render when tokens or phrase selection changes
  // Word selection does NOT cause re-render (handled via CSS)
  const renderedTokens = useMemo(() => {
    return processedText.tokens.map((token) => {
      if (token.type === 'word') {
        return (
          <WordSpan
            key={token.index}
            token={token}
            isInPhraseSelection={isInPhraseSelection(token.index)}
            onClick={onWordClick}
            onDoubleClick={onWordDoubleClick}
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
  }, [processedText.tokens, isInPhraseSelection, onWordClick, onWordDoubleClick, handleMouseDown, handleMouseEnter])
  
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
