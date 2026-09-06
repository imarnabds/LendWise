/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        darkbg: '#040707',
        cards: '#0C1112',
        borders: '#1B2325',
        'primary-green': '#00ff88',
        'hover-green': '#00FF84',
        muted: '#9BA4A7',
        neon: '#00FF9C',
        surface: '#1A1E1D',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bot-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'bot-breathe': {
          '0%, 100%': { boxShadow: '0 0 30px rgba(0, 255, 136, 0.35)' },
          '50%': { boxShadow: '0 0 50px rgba(0, 255, 136, 0.6)' },
        },
        'bot-blink': {
          '0%, 96%, 100%': { transform: 'scaleY(1)' },
          '98%': { transform: 'scaleY(0.95)' },
        },
        'dot-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)' },
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float-delayed 8s ease-in-out 1.5s infinite',
        'bot-float': 'bot-float 4s ease-in-out infinite',
        'bot-breathe': 'bot-breathe 3s ease-in-out infinite',
        'bot-blink': 'bot-blink 10s infinite',
        'dot-pulse': 'dot-pulse 2s ease-in-out infinite',
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
