import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UploadPage } from './UploadPage'

describe('UploadPage', () => {
  it('renders upload heading and instructions', () => {
    render(<UploadPage onProcess={() => {}} />)
    
    expect(screen.getByText('Upload Text')).toBeInTheDocument()
    expect(screen.getByText(/upload a text file/i)).toBeInTheDocument()
  })

  it('renders file drop zone', () => {
    render(<UploadPage onProcess={() => {}} />)
    
    expect(screen.getByText(/drop file here/i)).toBeInTheDocument()
  })

  it('renders language selectors', () => {
    render(<UploadPage onProcess={() => {}} />)
    
    expect(screen.getByText('Source Language')).toBeInTheDocument()
    expect(screen.getByText('Target Language')).toBeInTheDocument()
  })

  it('renders processing mode toggle', () => {
    render(<UploadPage onProcess={() => {}} />)
    
    expect(screen.getByText('Processing Mode')).toBeInTheDocument()
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.getByText('Dynamic')).toBeInTheDocument()
  })

  it('disables process button when no file selected', () => {
    render(<UploadPage onProcess={() => {}} />)
    
    const button = screen.getByRole('button', { name: /process text/i })
    expect(button).toBeDisabled()
  })

  it('shows helper text when file not selected', () => {
    render(<UploadPage onProcess={() => {}} />)
    
    expect(screen.getByText(/upload a file to continue/i)).toBeInTheDocument()
  })

  it('auto-detects source language when file is dropped', async () => {
    render(<UploadPage onProcess={() => {}} />)
    
    // Drop a file with English content
    const dropZone = screen.getByText(/drop file here/i).closest('div')!
    const mockFile = new File(['test content in English'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [mockFile] }
    })
    
    // Wait for async file parsing and language detection
    await waitFor(() => {
      expect(screen.getByText(/auto-detected/i)).toBeInTheDocument()
    })
  })

  it('calls onProcess with all parameters when button clicked', async () => {
    const mockOnProcess = vi.fn()
    render(<UploadPage onProcess={mockOnProcess} />)
    
    // Drop a file with Russian content
    const dropZone = screen.getByText(/drop file here/i).closest('div')!
    const mockFile = new File(['Привет мир тест'], 'test.txt', { type: 'text/plain' })
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [mockFile] }
    })
    
    // Wait for async file parsing and language detection
    await waitFor(() => {
      expect(screen.getByText(/auto-detected/i)).toBeInTheDocument()
    })
    
    // Select target language
    const targetSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(targetSelect, { target: { value: 'en' } })
    
    // Click process
    const button = screen.getByRole('button', { name: /process text/i })
    fireEvent.click(button)
    
    expect(mockOnProcess).toHaveBeenCalledWith(
      mockFile,
      'ru',  // auto-detected source (Cyrillic)
      'en',  // selected target
      'dynamic'  // default processing mode
    )
  })
})

