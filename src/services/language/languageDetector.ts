import { LanguageCode } from '@/constants/languages'

/**
 * Detects the language of a given text based on character ranges.
 * 
 * Detection logic:
 * - Cyrillic characters (U+0400-U+04FF) → Russian
 * - Hangul characters (U+AC00-U+D7AF, U+1100-U+11FF) → Korean
 * - Latin characters → English (default)
 */
export function detectLanguage(text: string): LanguageCode {
  // Count characters by script
  let cyrillicCount = 0
  let hangulCount = 0
  let latinCount = 0
  let totalLetters = 0

  for (const char of text) {
    const code = char.charCodeAt(0)
    
    // Cyrillic: U+0400 to U+04FF
    if (code >= 0x0400 && code <= 0x04FF) {
      cyrillicCount++
      totalLetters++
    }
    // Hangul Syllables: U+AC00 to U+D7AF
    // Hangul Jamo: U+1100 to U+11FF
    else if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF)) {
      hangulCount++
      totalLetters++
    }
    // Basic Latin letters: A-Z, a-z
    else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      latinCount++
      totalLetters++
    }
  }

  // If no letters found, default to English
  if (totalLetters === 0) {
    return 'en'
  }

  // Determine dominant script (>50% of letters)
  const cyrillicRatio = cyrillicCount / totalLetters
  const hangulRatio = hangulCount / totalLetters
  const latinRatio = latinCount / totalLetters

  if (cyrillicRatio > 0.5) {
    return 'ru'
  }
  if (hangulRatio > 0.5) {
    return 'ko'
  }
  if (latinRatio > 0.5) {
    return 'en'
  }

  // Mixed text - pick the highest
  if (cyrillicCount >= hangulCount && cyrillicCount >= latinCount) {
    return 'ru'
  }
  if (hangulCount >= cyrillicCount && hangulCount >= latinCount) {
    return 'ko'
  }
  
  return 'en'
}

/**
 * Detects language from a sample of text (first 1000 characters for performance)
 */
export function detectLanguageFromSample(text: string): LanguageCode {
  const sample = text.slice(0, 1000)
  return detectLanguage(sample)
}

