/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lumen': {
          dark: '#0a0a12',
          darker: '#06060c',
          accent: '#6366f1',
        }
      }
    },
  },
  plugins: [],
}
