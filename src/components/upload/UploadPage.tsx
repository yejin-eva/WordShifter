import { useState, useEffect } from 'react'
import { FileDropZone } from './FileDropZone'
import { LanguageSelector } from './LanguageSelector'
import { TextPreview } from './TextPreview'
import { LanguageCode } from '@/constants/languages'
import { parseFile, SUPPORTED_EXTENSIONS } from '@/services/fileParser'
import { detectLanguageFromSample } from '@/services/language/languageDetector'

interface UploadPageProps {
  onProcess: (file: File, sourceLanguage: LanguageCode, targetLanguage: LanguageCode) => void
}

export function UploadPage({ onProcess }: UploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse file content and auto-detect language when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setFileContent(null)
      setSourceLanguage(null)
      return
    }

    const loadFile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const content = await parseFile(selectedFile)
        setFileContent(content)
        
        // Auto-detect source language from file content
        const detectedLanguage = detectLanguageFromSample(content)
        setSourceLanguage(detectedLanguage)
      } catch (err) {
        console.error('File parse error:', err)
        setError('Failed to read file. Please try a different file.')
        setFileContent(null)
        setSourceLanguage(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [selectedFile])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const canProcess = selectedFile && sourceLanguage && targetLanguage

  const handleProcess = () => {
    if (canProcess) {
      onProcess(selectedFile, sourceLanguage, targetLanguage)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium mb-2">Upload Text</h2>
        <p className="text-gray-600">
          Upload a text file and select your target language
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: File upload */}
        <div>
          <FileDropZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            acceptedFormats={SUPPORTED_EXTENSIONS}
          />
        </div>

        {/* Right column: Options */}
        <div className="space-y-4">
          <LanguageSelector
            label="Source Language"
            value={sourceLanguage}
            onChange={setSourceLanguage}
            autoDetected={selectedFile !== null && sourceLanguage !== null}
            disabled={true}  // Auto-detected, not user-selectable
          />

          <LanguageSelector
            label="Target Language"
            value={targetLanguage}
            onChange={setTargetLanguage}
            sourceLanguage={sourceLanguage}
          />

        </div>
      </div>

      {/* Text Preview */}
      {isLoading && (
        <div className="mt-6 text-center text-gray-500">
          Loading file...
        </div>
      )}
      
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      {fileContent && selectedFile && (
        <div className="mt-6">
          <TextPreview text={fileContent} fileName={selectedFile.name} />
        </div>
      )}

      {/* Process button */}
      <div className="mt-8 text-center">
        <button
          onClick={handleProcess}
          disabled={!canProcess}
          className={`
            px-8 py-3 rounded-lg font-medium transition-colors
            ${canProcess
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Process Text
        </button>
        
        {!canProcess && (
          <p className="mt-2 text-sm text-gray-500">
            {!selectedFile 
              ? 'Upload a file to continue'
              : !targetLanguage 
                ? 'Select a target language'
                : ''
            }
          </p>
        )}
      </div>
    </div>
  )
}

