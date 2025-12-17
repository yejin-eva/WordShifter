import { useRef, memo } from 'react'
import { Token } from '@/types/text.types'

interface WordSpanProps {
  token: Token
  onClick: (token: Token, element: HTMLSpanElement) => void
  onDoubleClick: (token: Token) => void
  onMouseDown: (wordIndex: number) => void
  onMouseEnter: (wordIndex: number) => void
}

// Heavily memoized with custom comparison - only re-renders if token.index changes
// Since callbacks are stable (from refs), we can ignore them in comparison
export const WordSpan = memo(function WordSpan({
  token,
  onClick,
  onDoubleClick,
  onMouseDown,
  onMouseEnter,
}: WordSpanProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  
  // Store callbacks in refs to avoid creating new functions
  const onClickRef = useRef(onClick)
  const onDoubleClickRef = useRef(onDoubleClick)
  const onMouseDownRef = useRef(onMouseDown)
  const onMouseEnterRef = useRef(onMouseEnter)
  
  // Update refs (they're stable, so this rarely runs)
  onClickRef.current = onClick
  onDoubleClickRef.current = onDoubleClick
  onMouseDownRef.current = onMouseDown
  onMouseEnterRef.current = onMouseEnter
  
  // Event handlers - inline since they just call refs
  const handleClick = () => {
    if (spanRef.current) {
      onClickRef.current(token, spanRef.current)
    }
  }
  
  const handleDoubleClick = () => {
    onDoubleClickRef.current(token)
  }
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    onMouseDownRef.current(token.index)
  }
  
  const handleMouseEnter = () => {
    onMouseEnterRef.current(token.index)
  }
  
  return (
    <span
      ref={spanRef}
      className="word-clickable"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      data-word-index={token.index}
      data-token-index={token.index}
    >
      {token.value}
    </span>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if the token itself changes
  // Callbacks are stable (from refs in parent), so ignore them
  return prevProps.token.index === nextProps.token.index &&
         prevProps.token.value === nextProps.token.value
})
