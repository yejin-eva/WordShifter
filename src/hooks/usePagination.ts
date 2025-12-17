import { useState, useEffect, useCallback, useMemo } from 'react'
import { Token } from '@/types/text.types'

interface UsePaginationOptions {
  tokens: Token[]
  containerHeight: number
  containerWidth: number
  containerElement?: HTMLElement | null  // For reading actual CSS values
  fontSizePx?: number  // Optional: explicit font size to trigger recalculation
}

interface UsePaginationReturn {
  // Current page data
  currentPage: number
  totalPages: number
  pageTokens: Token[]  // Tokens for current page only
  
  // Navigation
  goToPage: (page: number) => void
  goToTokenIndex: (tokenIndex: number) => void  // Navigate to page containing this token
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
  containerElement,
  fontSizePx,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1)
  
  // Read actual CSS values from the container or use sensible defaults
  const { lineHeight, fontSize, maxWidth, verticalPadding, horizontalPadding } = useMemo(() => {
    if (containerElement) {
      const style = window.getComputedStyle(containerElement)
      // Use explicit fontSizePx if provided (triggers recalc), otherwise read from CSS
      const fs = fontSizePx || parseFloat(style.fontSize) || 18
      const lh = parseFloat(style.lineHeight) || fs * 1.75
      const mw = style.maxWidth
      
      // Read padding values
      const pt = parseFloat(style.paddingTop) || 0
      const pb = parseFloat(style.paddingBottom) || 0
      const pl = parseFloat(style.paddingLeft) || 0
      const pr = parseFloat(style.paddingRight) || 0
      
      // Parse maxWidth (could be "65ch", "800px", or "none")
      let maxChars = 80
      if (mw && mw.endsWith('ch')) {
        maxChars = parseInt(mw, 10)
      } else if (mw && mw.endsWith('px')) {
        maxChars = Math.floor(parseInt(mw, 10) / (fs * 0.55))
      }
      
      return { 
        lineHeight: lh, 
        fontSize: fs, 
        maxWidth: maxChars,
        verticalPadding: pt + pb,
        horizontalPadding: pl + pr,
      }
    }
    
    // Defaults if no element
    return { lineHeight: fontSizePx ? fontSizePx * 1.75 : 32, fontSize: fontSizePx || 18, maxWidth: 65, verticalPadding: 32, horizontalPadding: 32 }
  }, [containerElement, fontSizePx])
  
  // Calculate available height for text (account for padding + 1 line safety margin)
  const availableHeight = Math.max(100, containerHeight - verticalPadding - lineHeight)
  
  // Calculate characters per line from container width and maxWidth
  const avgCharWidth = fontSize * 0.55
  const charsFromWidth = Math.floor((containerWidth - horizontalPadding) / avgCharWidth)
  const charsPerLine = Math.min(maxWidth, Math.max(30, charsFromWidth))
  
  // Calculate lines per page (subtract 1 for safety margin)
  const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight) - 1)
  
  // Build page boundaries based on token positions
  // We'll group tokens into pages based on estimated line usage
  const pageBreaks = useMemo(() => {
    console.log(`[PAGINATION] Calculating pageBreaks: containerHeight=${containerHeight}, containerWidth=${containerWidth}, fontSize=${fontSize}, linesPerPage=${linesPerPage}, charsPerLine=${charsPerLine}`)
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
  
  // Find which page contains a given token index and navigate there
  const goToTokenIndex = useCallback((tokenIndex: number) => {
    console.log(`[PAGINATION] goToTokenIndex(${tokenIndex}), pageBreaks: [${pageBreaks.slice(0, 10).join(', ')}${pageBreaks.length > 10 ? '...' : ''}]`)
    // Find the page that contains this token index
    for (let i = 0; i < pageBreaks.length; i++) {
      const pageStart = pageBreaks[i]
      const pageEnd = pageBreaks[i + 1] || tokens.length
      
      if (tokenIndex >= pageStart && tokenIndex < pageEnd) {
        console.log(`[PAGINATION] Token ${tokenIndex} is on page ${i + 1} (pageStart: ${pageStart}, pageEnd: ${pageEnd})`)
        setCurrentPage(i + 1)  // Pages are 1-indexed
        return
      }
    }
    // If not found, go to last page
    console.log(`[PAGINATION] Token ${tokenIndex} not found, going to last page ${totalPages}`)
    setCurrentPage(totalPages)
  }, [pageBreaks, tokens.length, totalPages])
  
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
    goToTokenIndex,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    pageStartIndex,
    pageEndIndex,
  }
}

