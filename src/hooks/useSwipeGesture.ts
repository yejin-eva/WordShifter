import { useEffect, useRef, useCallback } from 'react'

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number  // Minimum distance to trigger swipe (px)
  enabled?: boolean
}

/**
 * Hook to detect swipe gestures on touch devices
 * 
 * Usage:
 * ```tsx
 * const swipeRef = useSwipeGesture({
 *   onSwipeLeft: () => goToNextPage(),
 *   onSwipeRight: () => goToPrevPage(),
 * })
 * 
 * return <div ref={swipeRef}>...</div>
 * ```
 */
export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  enabled = true,
}: UseSwipeGestureOptions) {
  const elementRef = useRef<T>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  
  // Store callbacks in refs to avoid re-attaching listeners
  const onSwipeLeftRef = useRef(onSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  
  useEffect(() => {
    onSwipeLeftRef.current = onSwipeLeft
    onSwipeRightRef.current = onSwipeRight
  }, [onSwipeLeft, onSwipeRight])
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current
    
    // Only trigger if horizontal movement is greater than vertical
    // (to avoid triggering on scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe right → previous
        onSwipeRightRef.current?.()
      } else {
        // Swipe left → next
        onSwipeLeftRef.current?.()
      }
    }
    
    touchStartX.current = null
    touchStartY.current = null
  }, [threshold])
  
  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])
  
  return elementRef
}

