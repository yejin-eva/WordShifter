import { useCallback, useRef } from 'react'
import { cn } from '@/utils/cn'
import { ProcessedWord } from '@/types/text.types'

interface WordSpanProps {
  word: ProcessedWord
  isSelected: boolean
  isInPhraseSelection: boolean
  onClick: (word: ProcessedWord, element: HTMLSpanElement) => void
  onDoubleClick: (word: ProcessedWord) => void
  onMouseDown: (wordIndex: number) => void
  onMouseEnter: (wordIndex: number) => void
}

export function WordSpan({
  word,
  isSelected,
  isInPhraseSelection,
  onClick,
  onDoubleClick,
  onMouseDown,
  onMouseEnter,
}: WordSpanProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  
  const handleClick = useCallback(() => {
    if (spanRef.current) {
      onClick(word, spanRef.current)
    }
  }, [word, onClick])
  
  const handleDoubleClick = useCallback(() => {
    onDoubleClick(word)
  }, [word, onDoubleClick])
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault() // Prevent text selection
    onMouseDown(word.index)
  }, [word.index, onMouseDown])
  
  const handleMouseEnter = useCallback(() => {
    onMouseEnter(word.index)
  }, [word.index, onMouseEnter])
  
  return (
    <span
      ref={spanRef}
      className={cn(
        'word-clickable',
        isSelected && 'word-selected',
        isInPhraseSelection && 'phrase-selected'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      data-word-id={word.id}
      data-word-index={word.index}
    >
      {word.original}
    </span>
  )
}

