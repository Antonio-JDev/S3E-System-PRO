// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Dark mode via classe .dark no <html> (ThemeContext / index.html).
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        'brand-s3e': '#0a1a2f',
        'brand-blue': '#2563EB',
        'brand-blue-light': '#EFF6FF',
        'brand-green': '#22C55E',
        'brand-purple': '#8B5CF6',
        'brand-orange': '#F59E0B',
        'brand-red': '#EF4444',
        'brand-gray': {
          '50': '#F9FAFB',
          '100': '#F3F4F6',
          '200': '#E5E7EB',
          '300': '#D1D5DB',
          '400': '#9CA3AF',
          '500': '#6B7280',
          '600': '#4B5563',
          '700': '#374151',
          '800': '#1F2937',
          '900': '#11182C',
        },

        /**
         * Obsidian Slate design system
         * Classes geradas: bg-dark-bg, bg-dark-card, bg-dark-input,
         * border-dark-border, text-dark-text, text-dark-text-secondary, etc.
         */
        dark: {
          bg: '#0F0F0F',
          secondary: '#111318',
          surface: '#151922',
          card: '#151922',
          elevated: '#181C24',
          sidebar: '#0B0E13',
          nav: '#101522',
          input: '#0D1016',
          border: '#252A33',
          'border-subtle': '#1B2028',
          hover: '#1B2028',
          accent: '#2563EB',
          'accent-light': '#60A5FA',
          'accent-soft': '#1B2A4A',
          blue: '#070A2F',
          'blue-deep': '#111A3A',
          text: '#F1F5F9',
          'text-secondary': '#A1A1AA',
          muted: '#71717A',
          table: '#101318',
        },

        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
      },
    },
  },

  plugins: [],
}
