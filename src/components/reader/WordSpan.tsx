import { useCallback, useRef, memo } from 'react'
import { cn } from '@/utils/cn'
import { Token } from '@/types/text.types'

interface WordSpanProps {
  token: Token
  isSelected: boolean
  isInPhraseSelection: boolean
  onClick: (token: Token, element: HTMLSpanElement) => void
  onDoubleClick: (token: Token) => void
  onMouseDown: (wordIndex: number) => void
  onMouseEnter: (wordIndex: number) => void
}

export const WordSpan = memo(function WordSpan({
  token,
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
      onClick(token, spanRef.current)
    }
  }, [token, onClick])
  
  const handleDoubleClick = useCallback(() => {
    onDoubleClick(token)
  }, [token, onDoubleClick])
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onMouseDown(token.index)
  }, [token.index, onMouseDown])
  
  const handleMouseEnter = useCallback(() => {
    onMouseEnter(token.index)
  }, [token.index, onMouseEnter])
  
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
      data-word-index={token.index}
    >
      {token.value}
    </span>
  )
})
