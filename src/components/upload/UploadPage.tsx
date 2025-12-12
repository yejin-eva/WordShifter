import { useState, useEffect } from 'react'
import { FileDropZone } from './FileDropZone'
import { LanguageSelector } from './LanguageSelector'
import { ProcessingModeToggle } from './ProcessingModeToggle'
import { TextPreview } from './TextPreview'
import { LanguageCode } from '@/constants/languages'
import { ProcessingMode } from '@/types/processing.types'
import { parseTxtFile } from '@/services/fileParser'

interface UploadPageProps {
  onProcess: (file: File, sourceLanguage: LanguageCode, targetLanguage: LanguageCode, mode: ProcessingMode) => void
}

export function UploadPage({ onProcess }: UploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode | null>(null)
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('dynamic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse file content when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setFileContent(null)
      return
    }

    const parseFile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const content = await parseTxtFile(selectedFile)
        setFileContent(content)
      } catch (err) {
        setError('Failed to read file. Please try a different file.')
        setFileContent(null)
      } finally {
        setIsLoading(false)
      }
    }

    parseFile()
  }, [selectedFile])

  // Auto-detect source language when file is selected
  // For now, we'll simulate auto-detection as Russian (will be implemented properly later)
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    // Simulate auto-detection (will be replaced with actual detection)
    setSourceLanguage('ru')
  }

  const canProcess = selectedFile && sourceLanguage && targetLanguage

  const handleProcess = () => {
    if (canProcess) {
      onProcess(selectedFile, sourceLanguage, targetLanguage, processingMode)
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
            acceptedFormats={['.txt']}
          />
        </div>

        {/* Right column: Options */}
        <div className="space-y-4">
          <LanguageSelector
            label="Source Language"
            value={sourceLanguage}
            onChange={setSourceLanguage}
            autoDetected={selectedFile !== null && sourceLanguage !== null}
            // Allow manual override - user can change auto-detected language if needed
          />

          <LanguageSelector
            label="Target Language"
            value={targetLanguage}
            onChange={setTargetLanguage}
            sourceLanguage={sourceLanguage}
          />

          <ProcessingModeToggle
            value={processingMode}
            onChange={setProcessingMode}
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

