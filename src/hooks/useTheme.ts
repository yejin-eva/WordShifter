import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'wordshift-theme'

/**
 * Hook for managing app-wide theme (dark/light mode)
 * 
 * - Defaults to system preference
 * - Persists user choice in localStorage
 * - Applies 'dark' class to document root
 */
export function useTheme() {
  // Get initial theme from localStorage or default to 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  })
  
  // Compute the actual applied theme (resolves 'system' to light/dark)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  
  // Apply theme to document
  useEffect(() => {
    const applyTheme = () => {
      let effectiveTheme: 'light' | 'dark'
      
      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light'
      } else {
        effectiveTheme = theme
      }
      
      setResolvedTheme(effectiveTheme)
      
      // Apply to document
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    
    applyTheme()
    
    // Listen for system preference changes (only matters if theme is 'system')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])
  
  // Set and persist theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }, [])
  
  // Quick toggle between light and dark (ignores system)
  const toggle = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])
  
  return {
    theme,           // Current setting: 'light' | 'dark' | 'system'
    resolvedTheme,   // Actual applied theme: 'light' | 'dark'
    setTheme,        // Set to specific theme
    toggle,          // Quick toggle light/dark
    isDark: resolvedTheme === 'dark',
  }
}

