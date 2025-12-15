import { memo } from 'react'

interface PageNavigatorProps {
  currentPage: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
  hasPrevPage: boolean
  hasNextPage: boolean
}

/**
 * Navigation controls for page-based reading mode
 * Shows prev/next buttons and page indicator
 */
export const PageNavigator = memo(function PageNavigator({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  hasPrevPage,
  hasNextPage,
}: PageNavigatorProps) {
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
      
      {/* Page indicator */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Page <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> of{' '}
        <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
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

