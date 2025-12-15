import { useState, useRef, useEffect } from 'react'

interface FontSizeDropdownProps {
  fontSize: number
  onChange: (size: number) => void
  minSize?: number
  maxSize?: number
}

export function FontSizeDropdown({ 
  fontSize, 
  onChange,
  minSize = 12,
  maxSize = 32,
}: FontSizeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])
  
  return (
    <div ref={dropdownRef} className="relative">
      {/* Aa button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 rounded text-sm transition-colors ${
          isOpen 
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="Font size"
      >
        Aa
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 min-w-[200px]">
          {/* Header with current value */}
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Font Size: <span className="text-blue-600 dark:text-blue-400">{fontSize}px</span>
          </div>
          
          {/* Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 w-6">{minSize}</span>
            <input
              type="range"
              min={minSize}
              max={maxSize}
              step={1}
              value={fontSize}
              onChange={(e) => onChange(parseInt(e.target.value, 10))}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 w-6">{maxSize}</span>
          </div>
          
          {/* Quick adjust buttons */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => onChange(Math.max(minSize, fontSize - 1))}
              disabled={fontSize <= minSize}
              className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
            >
              A-
            </button>
            <button
              onClick={() => onChange(18)}
              className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs text-gray-500 dark:text-gray-400"
            >
              Reset
            </button>
            <button
              onClick={() => onChange(Math.min(maxSize, fontSize + 1))}
              disabled={fontSize >= maxSize}
              className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
            >
              A+
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

