/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        peach: '#FFB5A7',
        blush: '#FCD5CE',
        sand: '#F9DCC4',
        honey: '#FAE1A4',
        coral: '#FF8C7C',
        brown: {
          DEFAULT: '#6B4226',
          light: '#9C8B7E',
        },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
