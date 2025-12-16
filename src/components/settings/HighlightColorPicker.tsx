import { useSettingsStore, HIGHLIGHT_COLORS, HighlightColorKey } from '@/stores/useSettingsStore'

export function HighlightColorPicker() {
  const { highlightColor, setHighlightColor } = useSettingsStore()
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Word Highlight Color
      </label>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose the color used to highlight words when clicked
      </p>
      
      <div className="flex gap-3">
        {(Object.keys(HIGHLIGHT_COLORS) as HighlightColorKey[]).map((colorKey) => {
          const color = HIGHLIGHT_COLORS[colorKey]
          const isSelected = highlightColor === colorKey
          
          return (
            <button
              key={colorKey}
              onClick={() => setHighlightColor(colorKey)}
              className={`
                w-10 h-10 rounded-full transition-all
                ${isSelected 
                  ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 scale-110' 
                  : 'hover:scale-105'
                }
              `}
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={`${color.name} highlight color`}
            />
          )
        })}
      </div>
      
      {/* Preview */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
        <p className="text-gray-900 dark:text-gray-100">
          Click on a{' '}
          <span 
            className="px-1 rounded cursor-pointer"
            style={{ backgroundColor: HIGHLIGHT_COLORS[highlightColor].value }}
          >
            highlighted word
          </span>
          {' '}to see its translation.
        </p>
      </div>
    </div>
  )
}

