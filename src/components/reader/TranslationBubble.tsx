import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

interface TranslationBubbleProps {
  translation: string
  partOfSpeech?: string
  position: { x: number; y: number }
  placement: 'above' | 'below'
  onSave: () => void
  onRetry?: () => void
  onClose: () => void
  isRetrying?: boolean
}

export function TranslationBubble({
  translation,
  partOfSpeech,
  position,
  placement,
  onSave,
  onRetry,
  onClose,
  isRetrying = false,
}: TranslationBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  
  // Close on click outside (but not when clicking another word)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // If clicking inside the bubble, don't close
      if (bubbleRef.current && bubbleRef.current.contains(target)) {
        return
      }
      
      // If clicking on another word, let the word handler deal with it
      if (target.closest('.word-clickable')) {
        return
      }
      
      // Otherwise, close the bubble
      onClose()
    }
    
    // Add listener on next tick to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onClose])
  
  // Calculate position to center bubble above/below word
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    transform: 'translateX(-50%)',
    ...(placement === 'above' 
      ? { bottom: `calc(100vh - ${position.y}px + 12px)` }
      : { top: position.y + 12 }
    ),
  }
  
  return (
    <div
      ref={bubbleRef}
      className="translation-bubble flex items-center gap-2"
      style={style}
    >
      {/* Translation text */}
      <span className={cn('font-medium text-gray-900', isRetrying && 'opacity-50')}>
        {isRetrying ? 'Retrying...' : translation}
      </span>
      
      {/* Part of speech */}
      {partOfSpeech && partOfSpeech !== 'unknown' && !isRetrying && (
        <span className="text-gray-500 text-sm">
          ({partOfSpeech})
        </span>
      )}
      
      {/* Save button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSave()
        }}
        disabled={isRetrying}
        className={cn(
          'text-blue-500 hover:text-blue-600 hover:scale-110 transition-all',
          isRetrying && 'opacity-50 cursor-not-allowed'
        )}
        title="Save to vocabulary"
      >
        💾
      </button>
      
      {/* Retry button */}
      {onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetry()
          }}
          disabled={isRetrying}
          className={cn(
            'hover:scale-110 transition-all',
            isRetrying ? 'opacity-50 cursor-not-allowed animate-spin' : 'hover:text-orange-600'
          )}
          title="Retry translation"
        >
          🔄
        </button>
      )}
      
      {/* Arrow pointing to word */}
      <div 
        className={cn(
          'absolute left-1/2 -translate-x-1/2 w-0 h-0',
          'border-l-[8px] border-l-transparent',
          'border-r-[8px] border-r-transparent',
          placement === 'above' 
            ? '-bottom-2 border-t-[8px] border-t-white'
            : '-top-2 border-b-[8px] border-b-white'
        )}
      />
    </div>
  )
}

