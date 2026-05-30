/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./app/**/*.{vue,js,ts,jsx,tsx}",
    "./components/**/*.{vue,js,ts,jsx,tsx}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./utils/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nuanta', 'Nuanta-Medium', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
