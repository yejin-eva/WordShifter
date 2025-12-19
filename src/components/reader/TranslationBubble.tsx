import { useEffect, useMemo, useRef, useState } from 'react'
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
  providerLabel?: string
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
  providerLabel,
}: TranslationBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [bubbleRect, setBubbleRect] = useState<DOMRect | null>(null)
  
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

  // Measure the bubble so we can keep it within the viewport on small screens.
  useEffect(() => {
    const el = bubbleRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      setBubbleRect(rect)
    }

    // Measure after paint so layout is stable.
    const raf = requestAnimationFrame(measure)

    // Re-measure on resize/orientation changes.
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [translation, partOfSpeech, isRetrying, providerLabel, placement, position.x, position.y])

  const layout = useMemo(() => {
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0
    const padding = 10 // keep away from edges

    // Fallback: if we haven't measured yet, keep legacy behavior.
    if (!bubbleRect || viewportW === 0 || viewportH === 0) {
      return {
        left: position.x,
        arrowLeft: undefined as number | undefined,
      }
    }

    // Bubble center is at `left` (because we keep translateX(-50%)). Clamp it so the bubble stays visible.
    const halfW = bubbleRect.width / 2
    const minCenter = padding + halfW
    const maxCenter = viewportW - padding - halfW
    const clampedCenter = Math.min(Math.max(position.x, minCenter), maxCenter)

    // Arrow should still point toward the tapped word. Clamp inside bubble padding too.
    // Compute arrow x relative to bubble left edge.
    const bubbleLeft = clampedCenter - halfW
    const arrowPadding = 14 // keep arrow away from rounded corners
    const desiredArrow = position.x - bubbleLeft
    const arrowLeft = Math.min(Math.max(desiredArrow, arrowPadding), bubbleRect.width - arrowPadding)

    // If bubble is fully clamped, arrow will shift; that's expected on small screens.
    return {
      left: clampedCenter,
      arrowLeft,
      viewportH,
    }
  }, [bubbleRect, position.x])
  
  // Calculate position to center bubble above/below word
  const style: React.CSSProperties = {
    position: 'fixed',
    left: layout.left,
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
      <span className={cn('font-medium text-gray-900 dark:text-white', isRetrying && 'opacity-50')}>
        {isRetrying ? 'Retrying...' : translation}
      </span>
      
      {/* Part of speech */}
      {partOfSpeech && partOfSpeech !== 'unknown' && !isRetrying && (
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          ({partOfSpeech})
        </span>
      )}

      {/* Provider indicator (useful for debugging which backend is actually being used) */}
      {providerLabel && !isRetrying && (
        <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
          via {providerLabel}
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
          title={providerLabel ? `Retry translation (using ${providerLabel})` : 'Retry translation'}
        >
          🔄
        </button>
      )}
      
      {/* Arrow pointing to word */}
      <div 
        className={cn(
          'absolute w-0 h-0',
          'border-l-[8px] border-l-transparent',
          'border-r-[8px] border-r-transparent',
          placement === 'above' 
            ? '-bottom-2 border-t-[8px] border-t-white dark:border-t-gray-700'
            : '-top-2 border-b-[8px] border-b-white dark:border-b-gray-700'
        )}
        style={layout.arrowLeft !== undefined ? { left: layout.arrowLeft, transform: 'translateX(-50%)' } : undefined}
      />
    </div>
  )
}

