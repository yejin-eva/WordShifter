import { HighlightColorPicker } from './HighlightColorPicker'

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 w-24"
        >
          ← Back
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white whitespace-nowrap">Settings</h1>
        
        <div className="w-24" /> {/* Spacer for balance */}
      </div>
      
      {/* Settings sections */}
      <div className="space-y-8">
        {/* Appearance Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Appearance
          </h2>
          
          <HighlightColorPicker />
        </section>
        
        {/* Translation Section - Placeholder */}
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Translation
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            LLM provider settings coming soon...
          </p>
        </section>
        
        {/* Dictionaries Section - Placeholder */}
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Dictionaries
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Dictionary management coming soon...
          </p>
        </section>
      </div>
    </div>
  )
}

