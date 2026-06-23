/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        velo: {
          ink: '#101820',
          mint: '#39C6A3',
          road: '#E9EEF2',
          signal: '#FFB02E',
        },
      },
    },
  },
  plugins: [],
};
