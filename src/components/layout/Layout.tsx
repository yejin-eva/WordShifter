import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  onNavigate?: (page: 'home' | 'vocabulary') => void
  currentPage?: 'home' | 'vocabulary' | 'reader'
}

export function Layout({ children, onNavigate, currentPage = 'home' }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

