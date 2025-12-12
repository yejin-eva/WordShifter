import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function for conditional classnames
 * Combines clsx for conditional logic
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

