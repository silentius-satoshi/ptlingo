/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0D9488',
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        slate: {
          brand: '#1E3A5F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'shake':       'shake 0.4s ease-in-out',
        'bounce-in':   'bounce-in 0.35s ease-out',
        'float-up':    'float-up 0.9s ease-out forwards',
        'slide-down':  'slide-down 0.3s ease-out',
        'slide-up-in': 'slide-up-in 0.3s ease-out',
        'pulse-glow':  'pulse-glow 2s ease-in-out infinite',
        'draw-check':  'draw-check 0.4s ease-out forwards',
        'pop-scale':   'pop-scale 0.3s ease-out',
        'fade-in-up':  'fade-in-up 0.4s ease-out both',
        'node-unlock': 'node-unlock 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
    },
  },
  plugins: [],
}
