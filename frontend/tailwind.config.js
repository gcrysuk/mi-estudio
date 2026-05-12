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
        dark: {
          bg: '#121212',
          surface: '#1E1E1E',
          elevated: '#2A2A2A',
        },
        light: {
          bg: '#F5F5F5',
          surface: '#FFFFFF',
          elevated: '#F0F0F0',
        },
        accent: {
          DEFAULT: '#4FC3F7',
          hover: '#29B6F6',
        },
        priority: {
          red: '#ff4d4d',
          orange: '#ffa500',
          green: '#2ecc71',
        }
      }
    },
  },
  plugins: [],
}
