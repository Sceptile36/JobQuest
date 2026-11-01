import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#3D81E3',
        teal:  '#00d2ff',
        ice:   '#A4F4FD',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        shiny: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.8)' },
        },
        'slide-in-r': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shiny:        'shiny 4s linear infinite',
        'pulse-dot':  'pulse-dot 2s ease-in-out infinite',
        'slide-in-r': 'slide-in-r 0.3s ease both',
        'slide-in-up':'slide-in-up 0.2s ease both',
      },
    },
  },
  plugins: [],
} satisfies Config
