/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#f7f1ea',
          100: '#efe3d2',
          200: '#d9bf90',
          300: '#c8a46d',
          400: '#ab7e41',
          500: '#8d6229',
          600: '#6e4a20',
          700: '#4c3217',
          800: '#2f220f'
        }
      }
    }
  },
  plugins: []
};
