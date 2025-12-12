import { useCallback } from 'react'
import { ProcessedText, ProcessedWord, Token } from '@/types/text.types'
import { WordSpan } from './WordSpan'
import { useUIStore } from '@/stores/useUIStore'

interface TextDisplayProps {
  processedText: ProcessedText
  onWordClick: (word: ProcessedWord, element: HTMLSpanElement) => void
  onWordDoubleClick: (word: ProcessedWord) => void
}

export function TextDisplay({
  processedText,
  onWordClick,
  onWordDoubleClick,
}: TextDisplayProps) {
  const { selectedWordId, phraseSelection } = useUIStore()
  
  // Build a map of word index to ProcessedWord for quick lookup
  const wordMap = new Map<number, ProcessedWord>()
  processedText.words.forEach(word => {
    wordMap.set(word.index, word)
  })
  
  // Check if a word index is in the phrase selection
  const isInPhraseSelection = useCallback((index: number) => {
    if (!phraseSelection) return false
    return index >= phraseSelection.startIndex && index <= phraseSelection.endIndex
  }, [phraseSelection])
  
  // Render tokens
  const renderToken = (token: Token) => {
    if (token.type === 'word') {
      const word = wordMap.get(token.index)
      if (!word) {
        // Fallback if word not found (shouldn't happen)
        return <span key={token.index}>{token.value}</span>
      }
      
      return (
        <WordSpan
          key={token.index}
          word={word}
          isSelected={selectedWordId === word.id}
          isInPhraseSelection={isInPhraseSelection(token.index)}
          onClick={onWordClick}
          onDoubleClick={onWordDoubleClick}
        />
      )
    }
    
    // Punctuation and whitespace - render as-is
    if (token.type === 'whitespace') {
      // Preserve whitespace including newlines
      return (
        <span key={token.index} className="whitespace-pre">
          {token.value}
        </span>
      )
    }
    
    // Punctuation
    return <span key={token.index}>{token.value}</span>
  }
  
  return (
    <div className="reader-text">
      {processedText.tokens.map(renderToken)}
    </div>
  )
}

