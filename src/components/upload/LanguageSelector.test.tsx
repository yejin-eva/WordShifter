import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSelector } from './LanguageSelector'

describe('LanguageSelector', () => {
  it('renders with label', () => {
    render(
      <LanguageSelector 
        label="Target Language" 
        value={null} 
        onChange={() => {}} 
      />
    )
    
    expect(screen.getByText('Target Language')).toBeInTheDocument()
  })

  it('shows all languages when no source filter', () => {
    render(
      <LanguageSelector 
        label="Language" 
        value={null} 
        onChange={() => {}} 
      />
    )
    
    const select = screen.getByRole('combobox')
    
    expect(select).toBeInTheDocument()
    expect(screen.getByText(/English/)).toBeInTheDocument()
    expect(screen.getByText(/Russian/)).toBeInTheDocument()
    expect(screen.getByText(/Korean/)).toBeInTheDocument()
  })

  it('filters target languages based on source', () => {
    render(
      <LanguageSelector 
        label="Target Language" 
        value={null} 
        onChange={() => {}} 
        sourceLanguage="ru"
      />
    )
    
    // Russian -> English and Russian -> Korean are valid pairs
    expect(screen.getByText(/English/)).toBeInTheDocument()
    expect(screen.getByText(/Korean/)).toBeInTheDocument()
  })

  it('calls onChange when selection changes', () => {
    const mockOnChange = vi.fn()
    
    render(
      <LanguageSelector 
        label="Language" 
        value={null} 
        onChange={mockOnChange} 
      />
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'ru' } })
    
    expect(mockOnChange).toHaveBeenCalledWith('ru')
  })

  it('shows auto-detected badge when specified', () => {
    render(
      <LanguageSelector 
        label="Source Language" 
        value="ru" 
        onChange={() => {}} 
        autoDetected={true}
      />
    )
    
    expect(screen.getByText(/auto-detected/i)).toBeInTheDocument()
  })

  it('disables select when disabled prop is true', () => {
    render(
      <LanguageSelector 
        label="Language" 
        value="en" 
        onChange={() => {}} 
        disabled={true}
      />
    )
    
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })
})

