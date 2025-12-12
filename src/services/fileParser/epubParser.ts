import ePub, { Book } from 'epubjs'

/**
 * Parse an EPUB file and extract plain text content
 */
export async function parseEpubFile(file: File): Promise<string> {
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  
  // Create ePub book instance
  const book: Book = ePub(arrayBuffer)
  
  // Wait for book to be ready
  await book.ready
  
  // Get all spine items (chapters/sections in reading order)
  const spine = book.spine as unknown as { items: Array<{ href: string }> }
  
  const textParts: string[] = []
  
  // Extract text from each section
  for (const item of spine.items) {
    try {
      const section = await book.load(item.href)
      
      // section is an HTML document, extract text content
      if (section instanceof Document) {
        const text = extractTextFromDocument(section)
        if (text.trim()) {
          textParts.push(text)
        }
      }
    } catch (error) {
      console.warn(`Failed to load section ${item.href}:`, error)
    }
  }
  
  // Clean up
  book.destroy()
  
  if (textParts.length === 0) {
    throw new Error('Could not extract text from EPUB file')
  }
  
  return textParts.join('\n\n')
}

/**
 * Extract readable text from an HTML document
 */
function extractTextFromDocument(doc: Document): string {
  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style, noscript')
  scripts.forEach(el => el.remove())
  
  // Get body content or full document
  const body = doc.body || doc.documentElement
  
  // Get text content
  let text = body.textContent || ''
  
  // Clean up whitespace
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')  // Collapse multiple newlines
    .replace(/[ \t]+/g, ' ')     // Collapse multiple spaces
    .trim()
  
  return text
}

/**
 * Get metadata from an EPUB file
 */
export async function getEpubMetadata(file: File): Promise<{
  title: string
  author: string
}> {
  const arrayBuffer = await file.arrayBuffer()
  const book: Book = ePub(arrayBuffer)
  
  await book.ready
  
  const metadata = await book.loaded.metadata
  
  const result = {
    title: metadata.title || file.name.replace(/\.epub$/i, ''),
    author: metadata.creator || 'Unknown',
  }
  
  book.destroy()
  
  return result
}

