import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileDropZone } from './FileDropZone'

describe('FileDropZone', () => {
  it('renders drop zone with instructions', () => {
    render(<FileDropZone onFileSelect={() => {}} selectedFile={null} />)
    
    expect(screen.getByText(/drop file here/i)).toBeInTheDocument()
    expect(screen.getByText(/\.txt/)).toBeInTheDocument()
  })

  it('shows selected file name when file is provided', () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    render(<FileDropZone onFileSelect={() => {}} selectedFile={mockFile} />)
    
    expect(screen.getByText('test.txt')).toBeInTheDocument()
    expect(screen.getByText(/file selected/i)).toBeInTheDocument()
  })

  it('calls onFileSelect when file is dropped', () => {
    const mockOnFileSelect = vi.fn()
    render(<FileDropZone onFileSelect={mockOnFileSelect} selectedFile={null} />)
    
    const dropZone = screen.getByText(/drop file here/i).parentElement!
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [mockFile]
      }
    })
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)
  })

  it('calls onFileSelect when file input changes', () => {
    const mockOnFileSelect = vi.fn()
    render(<FileDropZone onFileSelect={mockOnFileSelect} selectedFile={null} />)
    
    const input = document.getElementById('file-input') as HTMLInputElement
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    Object.defineProperty(input, 'files', {
      value: [mockFile]
    })
    
    fireEvent.change(input)
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)
  })
})

