import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import { VocabularyFilter, formatVocabularyList } from '@/types/vocabulary.types'
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/constants/languages'
import { cn } from '@/utils/cn'

interface VocabularyPageProps {
  onBack: () => void
}

export function VocabularyPage({ onBack }: VocabularyPageProps) {
  const { entries, filter, isLoading, loadEntries, setFilter, deleteEntry } = useVocabularyStore()
  
  // Filter state for language pair
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode | ''>('')
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode | ''>('')
  
  // Load entries on mount
  useEffect(() => {
    loadEntries()
  }, [loadEntries])
  
  // Handle filter change
  const handleFilterChange = (type: 'all' | 'byLanguage') => {
    if (type === 'all') {
      setFilter({ type: 'all' })
    } else if (sourceLanguage && targetLanguage) {
      setFilter({ type: 'byLanguage', sourceLanguage, targetLanguage })
    }
  }
  
  // Apply language filter when languages change
  useEffect(() => {
    if (sourceLanguage && targetLanguage) {
      setFilter({ type: 'byLanguage', sourceLanguage, targetLanguage })
    }
  }, [sourceLanguage, targetLanguage, setFilter])
  
  // Copy all to clipboard
  const handleCopyAll = async () => {
    if (entries.length === 0) {
      toast.error('No entries to copy')
      return
    }
    
    const text = formatVocabularyList(entries)
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${entries.length} entries to clipboard`)
  }
  
  // Delete entry
  const handleDelete = async (id: string, original: string) => {
    await deleteEntry(id)
    toast.success(`Deleted "${original}"`)
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 w-24"
        >
          ← Back
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white whitespace-nowrap">Vocabulary</h1>
        
        <button
          onClick={handleCopyAll}
          disabled={entries.length === 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Copy All
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Filter type buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter.type === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              )}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('byLanguage')}
              disabled={!sourceLanguage || !targetLanguage}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter.type === 'byLanguage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50'
              )}
            >
              By Language
            </button>
          </div>
          
          {/* Language selectors */}
          <div className="flex gap-2 items-center">
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value as LanguageCode)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
            >
              <option value="">Source...</option>
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
            
            <span className="text-gray-400 dark:text-gray-500">→</span>
            
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as LanguageCode)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
            >
              <option value="">Target...</option>
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          
          {/* Entry count */}
          <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>
      
      {/* Entries list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No vocabulary saved yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Double-click words or click 💾 while reading to save them
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{entry.original}</span>
                  {entry.partOfSpeech !== 'unknown' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">({entry.partOfSpeech})</span>
                  )}
                  {entry.isPhrase && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">phrase</span>
                  )}
                </div>
                <div className="text-gray-600 dark:text-gray-300">{entry.translation}</div>
                {entry.textTitle && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">from: {entry.textTitle}</div>
                )}
              </div>
              
              <button
                onClick={() => handleDelete(entry.id, entry.original)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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

