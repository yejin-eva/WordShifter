import { ProcessingMode, PROCESSING_MODES } from '@/types/processing.types'
import { cn } from '@/utils/cn'

interface ProcessingModeToggleProps {
  value: ProcessingMode
  onChange: (mode: ProcessingMode) => void
}

export function ProcessingModeToggle({ value, onChange }: ProcessingModeToggleProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Processing Mode
      </label>
      
      <div className="space-y-2">
        {PROCESSING_MODES.map((mode) => (
          <label
            key={mode.value}
            className={cn(
              'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
              value === mode.value
                ? 'border-primary bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <input
              type="radio"
              name="processingMode"
              value={mode.value}
              checked={value === mode.value}
              onChange={() => onChange(mode.value)}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-gray-900">{mode.label}</span>
              <p className="text-sm text-gray-500">{mode.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

