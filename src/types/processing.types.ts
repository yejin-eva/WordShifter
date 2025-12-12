export type ProcessingMode = 'full' | 'dynamic'

export interface ProcessingModeOption {
  value: ProcessingMode
  label: string
  description: string
}

export const PROCESSING_MODES: ProcessingModeOption[] = [
  {
    value: 'full',
    label: 'Full',
    description: 'Translate all words upfront (best for offline reading)',
  },
  {
    value: 'dynamic',
    label: 'Dynamic',
    description: 'Translate as you read (faster start)',
  },
]

