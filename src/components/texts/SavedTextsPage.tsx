import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { StoredText } from '@/services/storage/database'
import { textStorage } from '@/services/storage/textStorage'
import { getLanguageName } from '@/constants/languages'

interface SavedTextsPageProps {
  onBack: () => void
  onOpenText: (textId: string) => void
}

export function SavedTextsPage({ onBack, onOpenText }: SavedTextsPageProps) {
  const [texts, setTexts] = useState<StoredText[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Load saved texts on mount
  useEffect(() => {
    loadTexts()
  }, [])
  
  const loadTexts = async () => {
    setIsLoading(true)
    try {
      const savedTexts = await textStorage.getAll()
      setTexts(savedTexts)
    } catch (error) {
      console.error('Failed to load saved texts:', error)
      toast.error('Failed to load saved texts')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    
    try {
      await textStorage.delete(id)
      setTexts(texts.filter(t => t.id !== id))
      toast.success(`Deleted "${title}"`)
    } catch (error) {
      console.error('Failed to delete text:', error)
      toast.error('Failed to delete')
    }
  }
  
  const handleDeleteAll = async () => {
    if (texts.length === 0) return
    
    // First confirmation
    if (!confirm(`Delete ALL ${texts.length} saved texts? This cannot be undone.`)) return
    
    // Second confirmation for safety
    if (!confirm(`Are you REALLY sure? All ${texts.length} texts will be permanently deleted.`)) return
    
    try {
      // Delete all texts one by one
      for (const text of texts) {
        await textStorage.delete(text.id)
      }
      setTexts([])
      toast.success(`Deleted all ${texts.length} texts`)
    } catch (error) {
      console.error('Failed to delete all texts:', error)
      toast.error('Failed to delete all texts')
      // Reload to show what's left
      loadTexts()
    }
  }
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900">Saved Texts</h1>
        
        {texts.length > 0 ? (
          <button
            onClick={handleDeleteAll}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            title="Delete all saved texts"
          >
            🗑️ Delete All
          </button>
        ) : (
          <div className="w-24" /> /* Spacer */
        )}
      </div>
      
      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : texts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No saved texts yet</p>
          <p className="text-sm text-gray-400">
            Process a text file to save it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {texts.map((text) => (
            <div
              key={text.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onOpenText(text.id)}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {text.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span>
                    {getLanguageName(text.sourceLanguage as 'en' | 'ru' | 'ko')} → {getLanguageName(text.targetLanguage as 'en' | 'ru' | 'ko')}
                  </span>
                  <span>•</span>
                  <span>{text.wordCount.toLocaleString()} words</span>
                  <span>•</span>
                  <span>{formatDate(text.updatedAt)}</span>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(text.id, text.title)
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-4"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

