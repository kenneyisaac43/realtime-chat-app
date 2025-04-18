/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enable manual class-based dark mode
  content: [
    './src/**/*.{js,jsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(5px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
};



