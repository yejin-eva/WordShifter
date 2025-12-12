/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimal color palette
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
        },
        accent: '#fef08a',    // Light yellow for word highlights
        success: '#22c55e',   // Green for confirmations
      },
      fontFamily: {
        // System fonts - no loading overhead
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        'reader': '65ch',     // Optimal reading width
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

