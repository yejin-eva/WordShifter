import { memo, useState, useRef, useEffect } from 'react'

interface PageNavigatorProps {
  currentPage: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
  hasPrevPage: boolean
  hasNextPage: boolean
}

/**
 * Navigation controls for page-based reading mode
 * Shows prev/next buttons and page indicator
 * Click on page number to jump to a specific page
 */
export const PageNavigator = memo(function PageNavigator({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onGoToPage,
  hasPrevPage,
  hasNextPage,
}: PageNavigatorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
  const handlePageClick = () => {
    setInputValue(String(currentPage))
    setIsEditing(true)
  }
  
  const handleSubmit = () => {
    const page = parseInt(inputValue, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage(page)
    }
    setIsEditing(false)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }
  
  return (
    <div className="flex items-center justify-between px-4 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-4 rounded-t-lg">
      {/* Previous button */}
      <button
        onClick={onPrevPage}
        disabled={!hasPrevPage}
        className={`
          flex items-center gap-1 px-4 py-2 rounded-lg transition-colors
          ${hasPrevPage 
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600' 
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }
        `}
        aria-label="Previous page"
      >
        <span className="text-lg">←</span>
        <span className="hidden sm:inline">Previous</span>
      </button>
      
      {/* Page indicator - clickable to jump to page */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {isEditing ? (
          <span className="flex items-center gap-1">
            Page{' '}
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={totalPages}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSubmit}
              className="w-16 px-2 py-0.5 text-center font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {' '}of <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
          </span>
        ) : (
          <span>
            Page{' '}
            <button
              onClick={handlePageClick}
              className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
              title="Click to jump to page"
            >
              {currentPage}
            </button>
            {' '}of <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
          </span>
        )}
      </div>
      
      {/* Next button */}
      <button
        onClick={onNextPage}
        disabled={!hasNextPage}
        className={`
          flex items-center gap-1 px-4 py-2 rounded-lg transition-colors
          ${hasNextPage 
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600' 
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }
        `}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <span className="text-lg">→</span>
      </button>
    </div>
  )
})

