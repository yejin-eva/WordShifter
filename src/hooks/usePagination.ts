import { useState, useEffect, useCallback, useMemo } from 'react'
import { Token } from '@/types/text.types'

interface UsePaginationOptions {
  tokens: Token[]
  containerHeight: number
  containerWidth: number
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
  containerWidth,
  lineHeight = 32,  // Generous line height estimate
  fontSize = 18,
  padding = 120,    // Large padding for safety (header, footer, margins)
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1)
  
  // Calculate available height for text (be very conservative)
  const availableHeight = Math.max(100, containerHeight - padding)
  
  // Calculate characters per line based on container width and font size
  // Use conservative estimate: wider characters (like Cyrillic) need more space
  const avgCharWidth = fontSize * 0.65  // More conservative for non-Latin text
  const availableWidth = Math.max(200, containerWidth - 64) // More horizontal padding
  const charsPerLine = Math.max(30, Math.floor(availableWidth / avgCharWidth))
  
  // Calculate lines per page (use 75% of calculated lines for safety)
  const rawLinesPerPage = Math.floor(availableHeight / lineHeight)
  const linesPerPage = Math.max(1, Math.floor(rawLinesPerPage * 0.75))
  
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

