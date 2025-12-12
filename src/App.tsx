import { useState } from 'react'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { UploadPage } from './components/upload/UploadPage'
import { ReaderPage } from './components/reader/ReaderPage'
import { VocabularyPage } from './components/vocabulary/VocabularyPage'
import { SavedTextsPage } from './components/texts/SavedTextsPage'
import { useTextStore } from './stores/useTextStore'
import { LanguageCode } from './constants/languages'
import { ProcessingMode } from './types/processing.types'

type Page = 'home' | 'vocabulary' | 'reader' | 'saved'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { currentText, processing, processFile, clearCurrentText, loadSavedText } = useTextStore()

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
    setCurrentPage('home')
  }

  const handleNavigate = (page: 'home' | 'vocabulary' | 'saved') => {
    if (page === 'home') {
      clearCurrentText()
    }
    setCurrentPage(page)
  }

  const handleOpenSavedText = async (textId: string) => {
    const success = await loadSavedText(textId)
    if (success) {
      setCurrentPage('reader')
    }
  }

  // Show vocabulary page
  if (currentPage === 'vocabulary') {
    return (
      <>
        <Layout onNavigate={handleNavigate} currentPage="vocabulary">
          <VocabularyPage onBack={() => setCurrentPage('home')} />
        </Layout>
        <Toaster position="bottom-center" richColors />
      </>
    )
  }

  // Show saved texts page
  if (currentPage === 'saved') {
    return (
      <>
        <Layout onNavigate={handleNavigate} currentPage="saved">
          <SavedTextsPage 
            onBack={() => setCurrentPage('home')} 
            onOpenText={handleOpenSavedText}
          />
        </Layout>
        <Toaster position="bottom-center" richColors />
      </>
    )
  }

  // Show reader if we have processed text
  if (currentText && processing.status === 'complete') {
    return (
      <>
        <Layout onNavigate={handleNavigate} currentPage="reader">
          <ReaderPage onBack={handleBack} />
        </Layout>
        <Toaster position="bottom-center" richColors />
      </>
    )
  }

  // Show processing progress
  if (processing.status !== 'idle' && processing.status !== 'error') {
    return (
      <>
        <Layout onNavigate={handleNavigate}>
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
        <Toaster position="bottom-center" richColors />
      </>
    )
  }

  // Show error
  if (processing.status === 'error') {
    return (
      <>
        <Layout onNavigate={handleNavigate}>
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
        <Toaster position="bottom-center" richColors />
      </>
    )
  }

  // Show upload page
  return (
    <>
      <Layout onNavigate={handleNavigate} currentPage="home">
        <UploadPage onProcess={handleProcess} />
      </Layout>
      <Toaster position="bottom-center" richColors />
    </>
  )
}

export default App
