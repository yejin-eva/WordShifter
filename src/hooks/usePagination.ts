import { useState, useEffect, useCallback, useMemo } from 'react'
import { Token } from '@/types/text.types'

interface UsePaginationOptions {
  tokens: Token[]
  containerHeight: number
  lineHeight?: number
  fontSize?: number
  padding?: number
}

interface UsePaginationReturn {
  // Current page data
  currentPage: number
  totalPages: number
  pageTokens: Token[]  // Tokens for current page only
  
  // Navigation
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  
  // Status
  hasNextPage: boolean
  hasPrevPage: boolean
  
  // Page info
  pageStartIndex: number
  pageEndIndex: number
}

/**
 * Hook to handle pagination of tokens for page-based reading mode
 * 
 * Calculates how many tokens fit per page based on container height
 * and provides navigation functions.
 */
export function usePagination({
  tokens,
  containerHeight,
  lineHeight = 32,  // 2rem default
  fontSize = 18,
  padding = 48,     // Top + bottom padding
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1)
  
  // Calculate available height for text
  const availableHeight = containerHeight - padding
  
  // Estimate characters per line based on average container width
  // This is approximate - actual rendering may vary
  const charsPerLine = 80  // Reasonable default for readable text
  
  // Calculate lines per page
  const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight))
  
  // Build page boundaries based on token positions
  // We'll group tokens into pages based on estimated line usage
  const pageBreaks = useMemo(() => {
    if (tokens.length === 0) return [0]
    
    const breaks: number[] = [0]
    let currentLineLength = 0
    let linesUsed = 0
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const tokenLength = token.value.length
      
      // Check if token is a newline (whitespace with newline)
      const isNewline = token.type === 'whitespace' && token.value.includes('\n')
      
      if (isNewline) {
        // Count actual newlines
        const newlineCount = (token.value.match(/\n/g) || []).length
        linesUsed += newlineCount
        currentLineLength = 0
      } else {
        // Would this token cause a line wrap?
        if (currentLineLength + tokenLength > charsPerLine) {
          linesUsed++
          currentLineLength = tokenLength
        } else {
          currentLineLength += tokenLength
        }
      }
      
      // Check if we've exceeded lines per page
      if (linesUsed >= linesPerPage) {
        // Find a good break point (prefer after punctuation or whitespace)
        let breakIndex = i + 1
        
        // Try to break at end of sentence or paragraph
        for (let j = i; j >= Math.max(0, i - 20); j--) {
          const t = tokens[j]
          if (t.type === 'whitespace' && t.value.includes('\n')) {
            breakIndex = j + 1
            break
          }
          if (t.type === 'punctuation' && ['.', '!', '?'].includes(t.value)) {
            breakIndex = j + 1
            break
          }
        }
        
        breaks.push(breakIndex)
        linesUsed = 0
        currentLineLength = 0
      }
    }
    
    return breaks
  }, [tokens, linesPerPage, charsPerLine])
  
  // Calculate total pages
  const totalPages = Math.max(1, pageBreaks.length)
  
  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])
  
  // Get token indices for current page
  const pageStartIndex = pageBreaks[currentPage - 1] || 0
  const pageEndIndex = pageBreaks[currentPage] || tokens.length
  
  // Get tokens for current page
  const pageTokens = useMemo(() => {
    return tokens.slice(pageStartIndex, pageEndIndex)
  }, [tokens, pageStartIndex, pageEndIndex])
  
  // Navigation functions
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }, [totalPages])
  
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1)
    }
  }, [currentPage, totalPages])
  
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1)
    }
  }, [currentPage])
  
  return {
    currentPage,
    totalPages,
    pageTokens,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    pageStartIndex,
    pageEndIndex,
  }
}

