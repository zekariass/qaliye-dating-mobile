/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8A2CFF',
          light: '#A855F7',
          dark: '#6D35FF',
        },
        secondary: {
          DEFAULT: '#FF4B8A',
          light: '#FF7AAB',
        },
        brand: {
          purple: '#8A2CFF',
          pink: '#FF4B8A',
          lavender: '#EDE7FF',
          nearBlack: '#06070D',
        },
        // Semantic tokens
        semantic: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          surfaceMuted: 'var(--color-surface-muted)',
          surfaceElevated: 'var(--color-surface-elevated)',
          textPrimary: 'var(--color-text-primary)',
          textSecondary: 'var(--color-text-secondary)',
          textMuted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          accent: 'var(--color-accent)',
          accentSoft: 'var(--color-accent-soft)',
          accentStrong: 'var(--color-accent-strong)',
          success: 'var(--color-success)',
          info: 'var(--color-info)',
          danger: 'var(--color-danger)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        rounded: ['SF Pro Rounded', 'Hiragino Maru Gothic ProN', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
