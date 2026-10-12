/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0F0F11',
          800: '#18181C',
          700: '#232329',
          600: '#2F2F37',
        },
        primary: {
          500: '#00F2FE', // Neon Cyan
          600: '#00D2DE',
        },
        accent: {
          500: '#05FFC5', // Neon Emerald / Mint
          600: '#00E5AE',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
