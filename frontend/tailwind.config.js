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
        pepsi: {
          blue: '#0051A5',
          darkBlue: '#002B66',
          red: '#E32934',
          lightBg: '#F4F7FC',
          cardDark: '#1E293B',
          bgDark: '#0F172A',
        }
      }
    },
  },
  plugins: [],
}
