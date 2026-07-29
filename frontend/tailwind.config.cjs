module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c084fc',
          400: '#a78bfa',
          500: '#6366f1', // Indigo primary
          600: '#4f46e5',
          700: '#4338ca',
          DEFAULT: '#6366f1',
        },
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#10b981', // Emerald secondary
          600: '#059669',
          DEFAULT: '#10b981',
        },
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e', // Rose/Red danger
          600: '#e11d48',
          DEFAULT: '#f43f5e',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b', // Amber warning
          600: '#d97706',
          DEFAULT: '#f59e0b',
        },
        dark: {
          50: '#f8fafc',
          900: '#0f172a', // Slate/Dark surface
          DEFAULT: '#0f172a',
        },
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(79, 70, 229, 0.1)',
        'premium-hover': '0 20px 40px -15px rgba(79, 70, 229, 0.15)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
}
