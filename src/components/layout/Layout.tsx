import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  onNavigate?: (page: 'home' | 'vocabulary' | 'saved') => void
  currentPage?: 'home' | 'vocabulary' | 'reader' | 'saved'
}

export function Layout({ children, onNavigate, currentPage = 'home' }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate?.('home')}
            className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            WordShift
          </button>
          
          {/* Navigation */}
          <nav className="flex gap-4">
            <button
              onClick={() => onNavigate?.('saved')}
              className={`text-sm transition-colors ${
                currentPage === 'saved' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📖 Saved Texts
            </button>
            <button
              onClick={() => onNavigate?.('vocabulary')}
              className={`text-sm transition-colors ${
                currentPage === 'vocabulary' 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📚 Vocabulary
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

