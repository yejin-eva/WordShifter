import { useEffect, RefObject } from 'react'

/**
 * Hook that calls a handler when clicking outside the specified element
 * @param ref - Reference to the element to detect outside clicks for
 * @param handler - Function to call when clicking outside
 * @param excludeSelector - Optional CSS selector for elements that should NOT trigger the handler
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  excludeSelector?: string
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // If clicking inside the ref element, don't call handler
      if (ref.current && ref.current.contains(target)) {
        return
      }
      
      // If clicking on an excluded element, don't call handler
      if (excludeSelector && target.closest(excludeSelector)) {
        return
      }
      
      handler()
    }
    
    // Add listener on next tick to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [ref, handler, excludeSelector])
}

