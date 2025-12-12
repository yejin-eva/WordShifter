export { parseTxtFile, detectFileFormat, isSupported } from './txtParser'
export type { FileFormat } from './txtParser'
export { parseEpubFile, getEpubMetadata } from './epubParser'
export { parsePdfFile, getPdfMetadata } from './pdfParser'

/**
 * Parse any supported file format
 */
export async function parseFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'txt':
      const { parseTxtFile } = await import('./txtParser')
      return parseTxtFile(file)
    
    case 'epub':
      const { parseEpubFile } = await import('./epubParser')
      return parseEpubFile(file)
    
    case 'pdf':
      const { parsePdfFile } = await import('./pdfParser')
      return parsePdfFile(file)
    
    default:
      throw new Error(`Unsupported file format: .${extension}`)
  }
}

/**
 * Check if a file format is supported
 */
export function isSupportedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ['txt', 'epub', 'pdf'].includes(extension || '')
}

/**
 * Get list of supported file extensions
 */
export const SUPPORTED_EXTENSIONS = ['.txt', '.epub', '.pdf']

