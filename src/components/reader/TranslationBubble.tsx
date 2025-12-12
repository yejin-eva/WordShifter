import { useEffect, useRef } from 'react'

interface TranslationBubbleProps {
  translation: string
  partOfSpeech?: string
  position: { x: number; y: number }
  placement: 'above' | 'below'
  onSave: () => void
  onClose: () => void
}

export function TranslationBubble({
  translation,
  partOfSpeech,
  position,
  placement,
  onSave,
  onClose,
}: TranslationBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        onClose()
      }
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
      ? { bottom: `calc(100vh - ${position.y}px + 8px)` }
      : { top: position.y + 8 }
    ),
  }
  
  return (
    <div
      ref={bubbleRef}
      className="translation-bubble flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-150"
      style={style}
    >
      {/* Translation text */}
      <span className="font-medium text-gray-900">
        {translation}
      </span>
      
      {/* Part of speech */}
      {partOfSpeech && partOfSpeech !== 'unknown' && (
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
        className="text-yellow-500 hover:text-yellow-600 transition-colors ml-1"
        title="Save to vocabulary"
      >
        ⭐
      </button>
      
      {/* Arrow pointing to word */}
      <div 
        className={cn(
          'absolute left-1/2 -translate-x-1/2 w-0 h-0',
          'border-l-[6px] border-l-transparent',
          'border-r-[6px] border-r-transparent',
          placement === 'above' 
            ? 'bottom-0 translate-y-full border-t-[6px] border-t-white'
            : 'top-0 -translate-y-full border-b-[6px] border-b-white'
        )}
      />
    </div>
  )
}

// Helper function to import cn if not using it
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

