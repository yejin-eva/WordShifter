import { useCallback, useRef } from 'react'
import { cn } from '@/utils/cn'
import { ProcessedWord } from '@/types/text.types'

interface WordSpanProps {
  word: ProcessedWord
  isSelected: boolean
  isInPhraseSelection: boolean
  onClick: (word: ProcessedWord, element: HTMLSpanElement) => void
  onDoubleClick: (word: ProcessedWord) => void
}

export function WordSpan({
  word,
  isSelected,
  isInPhraseSelection,
  onClick,
  onDoubleClick,
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
  
  return (
    <span
      ref={spanRef}
      className={cn(
        'word-clickable',
        isSelected && 'word-selected',
        isInPhraseSelection && 'bg-blue-100'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-word-id={word.id}
      data-word-index={word.index}
    >
      {word.original}
    </span>
  )
}

