import { cn } from '@/utils/cn'

interface ProcessingProgressProps {
  /** Current step number (1-based) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Name of current step being processed */
  stepName: string
  /** Number of items processed in current step */
  processed: number
  /** Total items in current step */
  total: number
  /** Whether processing is complete */
  isComplete: boolean
}

const STEPS = [
  { name: 'Parsing', description: 'Reading file content...' },
  { name: 'Tokenizing', description: 'Splitting into words...' },
  { name: 'Translating', description: 'Translating words...' },
  { name: 'Finalizing', description: 'Preparing reader...' },
]

export function ProcessingProgress({
  currentStep,
  totalSteps,
  stepName,
  processed,
  total,
  isComplete,
}: ProcessingProgressProps) {
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0
  const overallProgress = Math.round(((currentStep - 1) / totalSteps) * 100 + (progress / totalSteps))
  
  return (
    <div className="w-full max-w-md mx-auto p-6">
      {/* Overall progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Processing</span>
          <span>{isComplete ? '100' : overallProgress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all duration-300',
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${isComplete ? 100 : overallProgress}%` }}
          />
        </div>
      </div>
      
      {/* Steps list */}
      <div className="space-y-3">
        {STEPS.slice(0, totalSteps).map((step, index) => {
          const stepNum = index + 1
          const isActive = stepNum === currentStep
          const isDone = stepNum < currentStep || isComplete
          
          return (
            <div 
              key={step.name}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                isActive && 'bg-blue-50',
                isDone && 'opacity-60'
              )}
            >
              {/* Step indicator */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                isDone && 'bg-green-500 text-white',
                isActive && 'bg-blue-500 text-white',
                !isDone && !isActive && 'bg-gray-200 text-gray-500'
              )}>
                {isDone ? '✓' : stepNum}
              </div>
              
              {/* Step info */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{step.name}</div>
                {isActive && (
                  <div className="text-sm text-gray-500">
                    {stepName || step.description}
                    {total > 0 && ` (${processed}/${total})`}
                  </div>
                )}
              </div>
              
              {/* Spinner for active step */}
              {isActive && !isComplete && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )
        })}
      </div>
      
      {/* Completion message */}
      {isComplete && (
        <div className="mt-6 text-center text-green-600 font-medium">
          ✓ Processing complete!
        </div>
      )}
    </div>
  )
}

