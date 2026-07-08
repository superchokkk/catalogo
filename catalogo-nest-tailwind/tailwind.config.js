/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,js,html}', './public/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        danger: 'var(--color-danger)',
      },
      backgroundImage: {
        'logo-tema': 'var(--img-logo)',
      }
    },
  },
  plugins: [],
}