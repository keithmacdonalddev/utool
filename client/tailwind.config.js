/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        dark: {
          DEFAULT: '#1A1A1A', // Matches navbar
          900: '#1A1A1A',
          800: '#2C3036', // Updated to a slightly darker shade (was #333940)
          700: '#333333',
          600: '#444444',
        },
        // App-specific background surfaces
        app: {
          navbar: '#2C3036', // Navbar background
          page: '#2C3036', // Main page background
          sidebar: '#23242B', // Sidebar background
          card: '#23242B', // Card background
          input: '#333940', // Input field background
        },
        // Keeping these for backward compatibility
        sidebar: {
          bg: '#23242B', // Sidebar background - use this for widgets and cards too
          border: '#181A20',
        },
        // Card surfaces - updated to match sidebar
        card: {
          DEFAULT: '#23242B', // Updated to match sidebar.bg for consistency
          hover: '#334155',
        },
        // Accent colors
        primary: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6D28D9',
        },
        secondary: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        // Text colors
        text: {
          DEFAULT: '#F8FAFC',
          muted: '#94A3B8',
          inverted: '#0F172A',
        },
        // Status colors
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#059669',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      fontSize: {
        xs: '0.625rem', // 10px (was 12px)
        sm: '0.75rem', // 12px (was 14px)
        base: '0.875rem', // 14px (was 16px)
        lg: '1rem', // 16px (was 18px)
        xl: '1.125rem', // 18px (was 20px)
        '2xl': '1.375rem', // 22px (was 24px)
        '3xl': '1.75rem', // 28px (was 30px)
        '4xl': '2.125rem', // 34px (was 36px)
      },
    },
  },
  plugins: [],
};
