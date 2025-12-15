import { LanguageCode, SUPPORTED_LANGUAGES, getAvailableTargetLanguages } from '@/constants/languages'

interface LanguageSelectorProps {
  label: string
  value: LanguageCode | null
  onChange: (code: LanguageCode) => void
  sourceLanguage?: LanguageCode | null  // If provided, filters target options
  disabled?: boolean
  autoDetected?: boolean  // Shows "Auto-detected" badge
}

export function LanguageSelector({
  label,
  value,
  onChange,
  sourceLanguage,
  disabled = false,
  autoDetected = false,
}: LanguageSelectorProps) {
  // Get available languages based on source (if filtering for target)
  const availableLanguages = sourceLanguage 
    ? getAvailableTargetLanguages(sourceLanguage)
    : SUPPORTED_LANGUAGES

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {autoDetected && (
          <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">
            ✓ Auto-detected
          </span>
        )}
      </label>
      
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
          bg-white dark:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
          ${!value ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}
        `}
      >
        <option value="" disabled>
          Select language...
        </option>
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.nativeName})
          </option>
        ))}
      </select>
    </div>
  )
}

