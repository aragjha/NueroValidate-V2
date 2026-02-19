/** @type {import('tailwindcss').Config} */ 
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#ffffff',
          dark: '#121212',
          alt: '#f8f9fa'
        },
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8'
        },
        status: {
          eligible: '#10b981',
          ineligible: '#ef4444',
          unclear: '#f59e0b',
          neutral: '#6b7280'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}