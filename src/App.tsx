import { useState } from 'react'
import { Layout } from './components/layout/Layout'
import { UploadPage } from './components/upload/UploadPage'
import { LanguageCode } from './constants/languages'
import { ProcessingMode } from './types/processing.types'

function App() {
  const [processedData, setProcessedData] = useState<{
    file: File
    sourceLanguage: LanguageCode
    targetLanguage: LanguageCode
    mode: ProcessingMode
  } | null>(null)

  const handleProcess = (
    file: File, 
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode, 
    mode: ProcessingMode
  ) => {
    setProcessedData({ file, sourceLanguage, targetLanguage, mode })
    // TODO: Navigate to reader page in Milestone 2
    console.log('Processing:', { 
      fileName: file.name, 
      sourceLanguage, 
      targetLanguage, 
      mode 
    })
  }

  return (
    <Layout>
      {!processedData ? (
        <UploadPage onProcess={handleProcess} />
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-medium mb-4">Processing Complete!</h2>
          <p className="text-gray-600 mb-4">
            {processedData.file.name} ({processedData.sourceLanguage} → {processedData.targetLanguage})
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Reader view will be implemented in Milestone 2
          </p>
          <button
            onClick={() => setProcessedData(null)}
            className="px-4 py-2 text-primary hover:underline"
          >
            ← Upload another file
          </button>
        </div>
      )}
    </Layout>
  )
}

export default App
