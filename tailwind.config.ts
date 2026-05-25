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
          light: '#7A6A5C',
          muted: '#8E8070',
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
          DEFAULT: '#8B6914',
          light: '#A8862A',
        },
        jade: {
          DEFAULT: '#4A7C59',
          light: '#5D8F6A',
        },
        wuxing: {
          wood: '#4A7C59',
          fire: '#C62828',
          earth: '#8B6914',
          metal: '#6E6E6E',
          water: '#2C5F7C',
        },
        compat: {
          great: '#4A7C59',
          good: '#8B6914',
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
