import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './composables/**/*.{vue,js,ts}',
    './constants/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          darkest: '#1A0F0A',
          dark: '#1E1210',
          DEFAULT: '#2C1810',
          light: '#6B5B4F',
          medium: '#5E5045',
          muted: '#4D4037',
          faint: '#D4C5B0',
        },
        paper: {
          lightest: '#FBF8F4',
          light: '#F5F0E8',
          DEFAULT: '#F5F0E8',
          medium: '#EDE4D3',
          card: '#E8DCC6',
          dark: '#E0D5C0',
          darker: '#D0C0A8',
        },
        cinnabar: {
          DEFAULT: '#C62828',
          light: '#E53935',
          dark: '#8E1D1D',
          deeper: '#9C1A1C',
          deepest: '#7A1416',
        },
        gold: {
          DEFAULT: '#7A5E12',
          light: '#9A7818',
        },
        jade: {
          DEFAULT: '#3D6B4B',
          light: '#4D7A5A',
        },
        wuxing: {
          wood: '#3D6B4B',
          fire: '#C62828',
          earth: '#7A5E12',
          metal: '#5E5E5E',
          water: '#2C5F7C',
        },
      },
      fontFamily: {
        display: ['"Ma Shan Zheng"', '"STKaiti"', '"KaiTi"', 'cursive'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"微软雅黑"', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.15' }],
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
