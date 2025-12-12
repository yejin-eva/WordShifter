import { Token } from '@/types/text.types'

/**
 * Tokenize text into words, punctuation, and whitespace
 * Preserves original text structure for display
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  
  // Regex to match:
  // - Words (including Unicode: Cyrillic, Hangul, Latin, accented chars)
  // - Punctuation
  // - Whitespace
  const tokenRegex = /(\p{L}+(?:'\p{L}+)?)|([^\p{L}\s]+)|(\s+)/gu
  
  let match: RegExpExecArray | null
  let index = 0
  
  while ((match = tokenRegex.exec(text)) !== null) {
    const value = match[0]
    const charStart = match.index
    const charEnd = charStart + value.length
    
    let type: Token['type']
    
    if (match[1]) {
      // Word (including contractions like "don't")
      type = 'word'
    } else if (match[2]) {
      // Punctuation
      type = 'punctuation'
    } else {
      // Whitespace
      type = 'whitespace'
    }
    
    tokens.push({
      type,
      value,
      index,
      charStart,
      charEnd,
    })
    
    index++
  }
  
  return tokens
}

/**
 * Extract only word tokens from a token array
 */
export function extractWords(tokens: Token[]): Token[] {
  return tokens.filter(token => token.type === 'word')
}

/**
 * Get unique words (normalized to lowercase) from tokens
 */
export function getUniqueWords(tokens: Token[]): string[] {
  const words = extractWords(tokens)
  const uniqueSet = new Set(words.map(w => w.value.toLowerCase()))
  return Array.from(uniqueSet)
}

/**
 * Get context for a word (surrounding words for better translation)
 */
export function getWordContext(tokens: Token[], wordIndex: number, windowSize: number = 5): string {
  const words = extractWords(tokens)
  const wordPosition = words.findIndex(w => w.index === wordIndex)
  
  if (wordPosition === -1) return ''
  
  const start = Math.max(0, wordPosition - windowSize)
  const end = Math.min(words.length, wordPosition + windowSize + 1)
  
  return words
    .slice(start, end)
    .map(w => w.value)
    .join(' ')
}

/**
 * Reconstruct text from tokens (for verification)
 */
export function tokensToText(tokens: Token[]): string {
  return tokens.map(t => t.value).join('')
}

