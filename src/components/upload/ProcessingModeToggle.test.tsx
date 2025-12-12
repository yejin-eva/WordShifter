import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProcessingModeToggle } from './ProcessingModeToggle'

describe('ProcessingModeToggle', () => {
  it('renders both processing mode options', () => {
    render(<ProcessingModeToggle value="full" onChange={() => {}} />)
    
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.getByText('Dynamic')).toBeInTheDocument()
  })

  it('shows descriptions for each mode', () => {
    render(<ProcessingModeToggle value="full" onChange={() => {}} />)
    
    expect(screen.getByText(/translate all words upfront/i)).toBeInTheDocument()
    expect(screen.getByText(/translate as you read/i)).toBeInTheDocument()
  })

  it('checks the correct radio based on value', () => {
    render(<ProcessingModeToggle value="dynamic" onChange={() => {}} />)
    
    const fullRadio = screen.getByRole('radio', { name: /full/i })
    const dynamicRadio = screen.getByRole('radio', { name: /dynamic/i })
    
    expect(fullRadio).not.toBeChecked()
    expect(dynamicRadio).toBeChecked()
  })

  it('calls onChange when mode is selected', () => {
    const mockOnChange = vi.fn()
    render(<ProcessingModeToggle value="full" onChange={mockOnChange} />)
    
    const dynamicRadio = screen.getByRole('radio', { name: /dynamic/i })
    fireEvent.click(dynamicRadio)
    
    expect(mockOnChange).toHaveBeenCalledWith('dynamic')
  })

  it('highlights selected mode with border color', () => {
    render(<ProcessingModeToggle value="full" onChange={() => {}} />)
    
    const fullLabel = screen.getByText('Full').closest('label')
    
    expect(fullLabel).toHaveClass('border-primary')
  })
})

