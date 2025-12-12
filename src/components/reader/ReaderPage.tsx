import { useCallback } from 'react'
import { ProcessedWord } from '@/types/text.types'
import { TextDisplay } from './TextDisplay'
import { TranslationBubble } from './TranslationBubble'
import { useTextStore } from '@/stores/useTextStore'
import { useUIStore } from '@/stores/useUIStore'

interface ReaderPageProps {
  onBack: () => void
}

export function ReaderPage({ onBack }: ReaderPageProps) {
  const { currentText, getWordById } = useTextStore()
  const { 
    selectedWordId, 
    bubblePosition, 
    bubblePlacement,
    selectWord, 
    clearSelection 
  } = useUIStore()
  
  // Get the selected word for the bubble
  const selectedWord = selectedWordId ? getWordById(selectedWordId) : undefined
  
  // Handle word click - show translation bubble
  const handleWordClick = useCallback((word: ProcessedWord, element: HTMLSpanElement) => {
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    
    // Determine placement: above if word is in lower half, below if in upper half
    const placement = rect.top > viewportHeight / 2 ? 'above' : 'below'
    
    // Position at center of word
    const position = {
      x: rect.left + rect.width / 2,
      y: placement === 'above' ? rect.top : rect.bottom,
    }
    
    selectWord(word.id, position, placement)
  }, [selectWord])
  
  // Handle double-click - save to vocabulary
  const handleWordDoubleClick = useCallback((word: ProcessedWord) => {
    // TODO: Implement vocabulary saving in Milestone 4
    console.log('Save to vocabulary:', word)
    alert(`Saved "${word.original}" → "${word.translation}" to vocabulary!`)
  }, [])
  
  // Handle save from bubble
  const handleSaveWord = useCallback(() => {
    if (selectedWord) {
      console.log('Save to vocabulary:', selectedWord)
      alert(`Saved "${selectedWord.original}" → "${selectedWord.translation}" to vocabulary!`)
    }
    clearSelection()
  }, [selectedWord, clearSelection])
  
  if (!currentText) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No text loaded</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:underline"
        >
          ← Go back to upload
        </button>
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>
        
        <h2 className="text-lg font-medium text-gray-900">
          {currentText.title}
        </h2>
        
        <div className="text-sm text-gray-500">
          {currentText.sourceLanguage.toUpperCase()} → {currentText.targetLanguage.toUpperCase()}
        </div>
      </div>
      
      {/* Text content */}
      <TextDisplay
        processedText={currentText}
        onWordClick={handleWordClick}
        onWordDoubleClick={handleWordDoubleClick}
      />
      
      {/* Translation bubble */}
      {selectedWord && bubblePosition && (
        <TranslationBubble
          translation={selectedWord.translation}
          partOfSpeech={selectedWord.partOfSpeech}
          position={bubblePosition}
          placement={bubblePlacement}
          onSave={handleSaveWord}
          onClose={clearSelection}
        />
      )}
    </div>
  )
}

