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
        // Professional Grey-scale base
        background: {
          light: '#ffffff',
          dark: '#121212',
          alt: '#f8f9fa'
        },
        // Functional color accents
        primary: {
          DEFAULT: '#2563eb', // Calm blue
          hover: '#1d4ed8'
        },
        status: {
          eligible: '#10b981', // Green
          ineligible: '#ef4444', // Red
          unclear: '#f59e0b', // Amber
          neutral: '#6b7280' // Grey
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
