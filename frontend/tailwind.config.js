/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F1B2D',
        offwhite: '#E8ECEF',
        amber: '#F2A93B',
        slate: '#5C6B7A',
        completed: '#4C9A6A',
        skipped: '#C1543C'
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
