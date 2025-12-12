import { useCallback, useRef, useState } from 'react'
import { ProcessedText, ProcessedWord, Token } from '@/types/text.types'
import { WordSpan } from './WordSpan'
import { useUIStore } from '@/stores/useUIStore'

interface TextDisplayProps {
  processedText: ProcessedText
  onWordClick: (word: ProcessedWord, element: HTMLSpanElement) => void
  onWordDoubleClick: (word: ProcessedWord) => void
  onPhraseClick: (words: ProcessedWord[], element: HTMLSpanElement) => void
}

export function TextDisplay({
  processedText,
  onWordClick,
  onWordDoubleClick,
  onPhraseClick,
}: TextDisplayProps) {
  const { selectedWordId, phraseSelection, selectPhrase, clearPhraseSelection } = useUIStore()
  
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Build a map of word index to ProcessedWord for quick lookup
  const wordMap = new Map<number, ProcessedWord>()
  processedText.words.forEach(word => {
    wordMap.set(word.index, word)
  })
  
  // Check if a word index is in the phrase selection (either committed or during drag)
  const isInPhraseSelection = useCallback((index: number) => {
    // During drag, use temporary selection
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)
      return index >= start && index <= end
    }
    // Otherwise use committed selection
    if (!phraseSelection) return false
    return index >= phraseSelection.startIndex && index <= phraseSelection.endIndex
  }, [phraseSelection, isDragging, dragStart, dragEnd])
  
  // Handle mouse down on word - start potential drag
  const handleMouseDown = useCallback((wordIndex: number) => {
    setIsDragging(true)
    setDragStart(wordIndex)
    setDragEnd(wordIndex)
    clearPhraseSelection()
  }, [clearPhraseSelection])
  
  // Handle mouse enter on word during drag
  const handleMouseEnter = useCallback((wordIndex: number) => {
    if (isDragging) {
      setDragEnd(wordIndex)
    }
  }, [isDragging])
  
  // Handle mouse up - finalize selection
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)
      
      // Only create phrase selection if more than one word
      if (start !== end) {
        selectPhrase(start, end)
      }
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, selectPhrase])
  
  // Handle click on phrase selection
  const handlePhraseClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const wordElement = target.closest('.word-clickable') as HTMLSpanElement
    
    if (wordElement && phraseSelection) {
      const wordIndex = parseInt(wordElement.dataset.wordIndex || '0', 10)
      
      // Check if clicking on a selected phrase word
      if (wordIndex >= phraseSelection.startIndex && wordIndex <= phraseSelection.endIndex) {
        // Gather all words in the phrase
        const phraseWords: ProcessedWord[] = []
        for (let i = phraseSelection.startIndex; i <= phraseSelection.endIndex; i++) {
          const word = wordMap.get(i)
          if (word) phraseWords.push(word)
        }
        
        if (phraseWords.length > 1) {
          onPhraseClick(phraseWords, wordElement)
          event.stopPropagation()
        }
      }
    }
  }, [phraseSelection, wordMap, onPhraseClick])
  
  // Render tokens
  const renderToken = (token: Token) => {
    if (token.type === 'word') {
      const word = wordMap.get(token.index)
      if (!word) {
        // Fallback if word not found (shouldn't happen)
        return <span key={token.index}>{token.value}</span>
      }
      
      return (
        <WordSpan
          key={token.index}
          word={word}
          isSelected={selectedWordId === word.id}
          isInPhraseSelection={isInPhraseSelection(token.index)}
          onClick={onWordClick}
          onDoubleClick={onWordDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
        />
      )
    }
    
    // Punctuation and whitespace - render as-is
    if (token.type === 'whitespace') {
      // Preserve whitespace including newlines
      return (
        <span key={token.index} className="whitespace-pre">
          {token.value}
        </span>
      )
    }
    
    // Punctuation
    return <span key={token.index}>{token.value}</span>
  }
  
  return (
    <div 
      ref={containerRef}
      className="reader-text select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handlePhraseClick}
    >
      {processedText.tokens.map(renderToken)}
    </div>
  )
}

