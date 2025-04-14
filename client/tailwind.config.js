/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#181A20',
          900: '#181A20',
          800: '#23242B',
          700: '#22232A',
          600: '#23242B',
        },
        card: {
          DEFAULT: '#23242B',
          900: '#23242B',
          800: '#23242B',
        },
        accent: {
          blue: '#5DE6FB',
          cyan: '#6EE7F7',
          purple: '#B983FF',
          lilac: '#A78BFA',
        },
        text: {
          DEFAULT: '#F8FAFC',
          muted: '#A1A1AA',
          soft: '#E5E7EB',
        },
      },
      boxShadow: {
        'card': '0 2px 16px 0 rgba(0,0,0,0.25)',
      },
      borderRadius: {
        'xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
