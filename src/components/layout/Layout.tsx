import { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface LayoutProps {
  children: ReactNode
  onNavigate?: (page: 'home' | 'vocabulary' | 'saved') => void
  currentPage?: 'home' | 'vocabulary' | 'reader' | 'saved'
}

export function Layout({ children, onNavigate, currentPage = 'home' }: LayoutProps) {
  const { isDark, toggle } = useTheme()
  
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate?.('home')}
            className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            WordShift
          </button>
          
          {/* Navigation */}
          <nav className="flex items-center gap-4">
            <button
              onClick={() => onNavigate?.('saved')}
              className={`text-sm transition-colors ${
                currentPage === 'saved' 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📖 Saved Texts
            </button>
            <button
              onClick={() => onNavigate?.('vocabulary')}
              className={`text-sm transition-colors ${
                currentPage === 'vocabulary' 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📚 Vocabulary
            </button>
            
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content - flex-1 to fill remaining height */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-8 h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}

