export type LanguageCode = 'en' | 'ru' | 'ko'

export interface Language {
  code: LanguageCode
  name: string
  nativeName: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
]

export const LANGUAGE_PAIRS: { source: LanguageCode; target: LanguageCode }[] = [
  // From Russian
  { source: 'ru', target: 'en' },
  { source: 'ru', target: 'ko' },
  // From English
  { source: 'en', target: 'ru' },
  { source: 'en', target: 'ko' },
  // From Korean
  { source: 'ko', target: 'en' },
  { source: 'ko', target: 'ru' },
]

export function getLanguageName(code: LanguageCode): string {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name ?? code
}

export function getAvailableTargetLanguages(sourceCode: LanguageCode): Language[] {
  const validTargets = LANGUAGE_PAIRS
    .filter(pair => pair.source === sourceCode)
    .map(pair => pair.target)
  
  return SUPPORTED_LANGUAGES.filter(lang => validTargets.includes(lang.code))
}

