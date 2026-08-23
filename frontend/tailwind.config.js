/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070a13",
          900: "#0b0f19",
          850: "#121824",
          800: "#1a2332",
          700: "#26354a",
          600: "#384c66",
        },
        offwhite: {
          50: "#faf9f8",
          100: "#f4f3f0",
          200: "#e9e7e2",
          300: "#dcdad3",
        }
      }
    },
  },
  plugins: [],
}
