/**
 * Parse a TXT file and return its text content
 */
export async function parseTxtFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const text = event.target?.result
      if (typeof text === 'string') {
        resolve(text)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * Detect the file format from file extension
 */
export type FileFormat = 'txt' | 'pdf' | 'epub' | 'unknown'

export function detectFileFormat(file: File): FileFormat {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'txt':
      return 'txt'
    case 'pdf':
      return 'pdf'
    case 'epub':
      return 'epub'
    default:
      return 'unknown'
  }
}

/**
 * Validate that a file is a supported format
 */
export function isSupported(file: File): boolean {
  const format = detectFileFormat(file)
  // For now, only TXT is supported
  return format === 'txt'
}

