/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ieepc: {
          yellow: '#F5C518',
          'yellow-dark': '#D4A60F',
          'yellow-light': '#FFE57F',
          black: '#1A1A1A',
          gray: '#4B4B4B',
          'gray-light': '#E5E5E5',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
