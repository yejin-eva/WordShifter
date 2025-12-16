import { useState } from 'react'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { UploadPage } from './components/upload/UploadPage'
import { ReaderPage } from './components/reader/ReaderPage'
import { VocabularyPage } from './components/vocabulary/VocabularyPage'
import { SavedTextsPage } from './components/texts/SavedTextsPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { useTextStore } from './stores/useTextStore'
import { LanguageCode } from './constants/languages'

type Page = 'home' | 'vocabulary' | 'reader' | 'saved' | 'settings'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { currentText, processing, processFile, clearCurrentText, loadSavedText } = useTextStore()

  const handleProcess = async (
    file: File, 
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode
  ) => {
    await processFile(file, sourceLanguage, targetLanguage)
  }

  const handleBack = () => {
    clearCurrentText()
    setCurrentPage('home')
  }

  const handleNavigate = (page: 'home' | 'vocabulary' | 'saved' | 'settings') => {
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

  // If we have loaded text, keep reader mounted but toggle visibility
  // This prevents expensive re-renders when navigating to Settings/Vocabulary
  const hasLoadedText = currentText && processing.status === 'complete'
  
  if (hasLoadedText) {
    // Determine which view to show (reader stays mounted but hidden)
    const isReaderVisible = currentPage === 'reader' || currentPage === 'home'
    
    return (
      <>
        <Layout onNavigate={handleNavigate} currentPage={currentPage === 'home' ? 'reader' : currentPage}>
          {/* Reader - always mounted when text loaded, visibility toggled */}
          <div className={isReaderVisible ? '' : 'hidden'}>
            <ReaderPage onBack={handleBack} />
          </div>
          
          {/* Other pages - mounted only when visible */}
          {currentPage === 'settings' && <SettingsPage onBack={() => setCurrentPage('reader')} />}
          {currentPage === 'vocabulary' && <VocabularyPage onBack={() => setCurrentPage('reader')} />}
          {currentPage === 'saved' && (
            <SavedTextsPage 
              onBack={() => setCurrentPage('reader')} 
              onOpenText={handleOpenSavedText}
            />
          )}
        </Layout>
        <Toaster position="bottom-center" richColors />
      </>
    )
  }

  // No loaded text - show individual pages
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

  if (currentPage === 'settings') {
    return (
      <>
        <Layout onNavigate={handleNavigate} currentPage="settings">
          <SettingsPage onBack={() => setCurrentPage('home')} />
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
