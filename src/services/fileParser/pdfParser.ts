import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker - use CDN for simplicity
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Parse a PDF file and extract plain text content
 */
export async function parsePdfFile(file: File): Promise<string> {
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  
  // Load the PDF document
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const textParts: string[] = []
  
  // Extract text from each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    
    // Extract text items and join them
    const pageText = textContent.items
      .map(item => {
        // Type guard for TextItem
        if ('str' in item) {
          return item.str
        }
        return ''
      })
      .join(' ')
    
    if (pageText.trim()) {
      textParts.push(pageText)
    }
  }
  
  if (textParts.length === 0) {
    throw new Error('Could not extract text from PDF file. The PDF may be image-based.')
  }
  
  // Join pages with double newlines
  let text = textParts.join('\n\n')
  
  // Clean up common PDF artifacts
  text = cleanPdfText(text)
  
  return text
}

/**
 * Clean up common PDF text extraction artifacts
 */
function cleanPdfText(text: string): string {
  return text
    // Fix hyphenated words at line breaks
    .replace(/(\w)-\s+(\w)/g, '$1$2')
    // Collapse multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Fix spaces before punctuation
    .replace(/\s+([.,;:!?])/g, '$1')
    // Trim
    .trim()
}

/**
 * Get basic PDF metadata
 */
export async function getPdfMetadata(file: File): Promise<{
  title: string
  author: string
  numPages: number
}> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const metadata = await pdf.getMetadata()
  
  return {
    title: (metadata.info as Record<string, string>)?.Title || file.name.replace(/\.pdf$/i, ''),
    author: (metadata.info as Record<string, string>)?.Author || 'Unknown',
    numPages: pdf.numPages,
  }
}

