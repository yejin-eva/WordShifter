interface TextPreviewProps {
  text: string
  fileName: string
}

export function TextPreview({ text, fileName }: TextPreviewProps) {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  const charCount = text.length
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <span className="font-medium text-gray-700">{fileName}</span>
        <span className="text-sm text-gray-500">
          {wordCount.toLocaleString()} words · {charCount.toLocaleString()} characters
        </span>
      </div>
      
      {/* Text content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {text.length > 2000 
            ? text.slice(0, 2000) + '...'
            : text
          }
        </p>
        {text.length > 2000 && (
          <p className="mt-2 text-sm text-gray-500 italic">
            Preview truncated. Full text will be processed.
          </p>
        )}
      </div>
    </div>
  )
}

