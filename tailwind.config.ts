import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          darkest: '#1A0F0A',
          dark: '#2C1810',
          DEFAULT: '#2C1810',
          medium: '#6B5B4F',
          light: '#A69586',
          faint: '#D4C5B0',
        },
        paper: {
          lightest: '#FBF8F4',
          light: '#F5F0E8',
          DEFAULT: '#F5F0E8',
          medium: '#EDE4D3',
          dark: '#E0D5C0',
          darker: '#D0C0A8',
        },
        cinnabar: {
          DEFAULT: '#C62828',
          light: '#E53935',
          dark: '#8E1D1D',
        },
        gold: {
          DEFAULT: '#B8860B',
          light: '#D4A017',
        },
        jade: {
          DEFAULT: '#4A7C59',
          light: '#5D8F6A',
        },
      },
      fontFamily: {
        display: ['"Ma Shan Zheng"', 'cursive'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(44, 24, 16, 0.06)',
        'elevated': '0 4px 24px rgba(44, 24, 16, 0.1)',
        'dropdown': '0 8px 32px rgba(44, 24, 16, 0.12)',
      },
      maxWidth: {
        'grid': '72rem',
      },
    },
  },
  plugins: [],
} satisfies Config
