import { Layout } from './components/layout/Layout'
import { UploadPage } from './components/upload/UploadPage'
import { ReaderPage } from './components/reader/ReaderPage'
import { useTextStore } from './stores/useTextStore'
import { LanguageCode } from './constants/languages'
import { ProcessingMode } from './types/processing.types'

function App() {
  const { currentText, processing, processFile, clearCurrentText } = useTextStore()

  const handleProcess = async (
    file: File, 
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode, 
    mode: ProcessingMode
  ) => {
    await processFile(file, sourceLanguage, targetLanguage, mode)
  }

  const handleBack = () => {
    clearCurrentText()
  }

  // Show reader if we have processed text
  if (currentText && processing.status === 'complete') {
    return (
      <Layout>
        <ReaderPage onBack={handleBack} />
      </Layout>
    )
  }

  // Show processing progress
  if (processing.status !== 'idle' && processing.status !== 'error') {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="text-xl font-medium mb-4">Processing...</h2>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processing.progress}%` }}
            />
          </div>
          
          <p className="text-gray-600">{processing.currentStep}</p>
        </div>
      </Layout>
    )
  }

  // Show error
  if (processing.status === 'error') {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="text-xl font-medium text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{processing.error}</p>
          <button
            onClick={clearCurrentText}
            className="text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </Layout>
    )
  }

  // Show upload page
  return (
    <Layout>
      <UploadPage onProcess={handleProcess} />
    </Layout>
  )
}

export default App
