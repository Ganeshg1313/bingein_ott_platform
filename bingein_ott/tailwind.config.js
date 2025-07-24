// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This line is crucial for Tailwind to scan your React files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}