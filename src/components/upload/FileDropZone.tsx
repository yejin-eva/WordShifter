import { useState, useCallback, DragEvent, ChangeEvent } from 'react'
import { cn } from '@/utils/cn'

interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  acceptedFormats?: string[]
  selectedFile: File | null
}

export function FileDropZone({ 
  onFileSelect, 
  acceptedFormats = ['.txt'],
  selectedFile 
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragging 
          ? 'border-primary bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400',
        selectedFile && 'border-green-500 bg-green-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInput}
      />

      {selectedFile ? (
        <div>
          <p className="text-green-700 font-medium mb-1">
            ✓ File selected
          </p>
          <p className="text-gray-600 text-sm">
            {selectedFile.name}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Click to change file
          </p>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-2">
            Drop file here or click to browse
          </p>
          <p className="text-gray-400 text-sm">
            Supports: {acceptedFormats.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

