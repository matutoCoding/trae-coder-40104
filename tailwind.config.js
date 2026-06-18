/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        billiard: {
          bg: '#0A1F1C',
          surface: '#0F2E29',
          card: '#143D36',
          border: '#1B5148',
          gold: '#D4A843',
          'gold-dark': '#B8902E',
          'gold-light': '#E8C76A',
          red: '#8B1A1A',
          brown: '#3E2723',
          text: '#E8E0D4',
          'text-muted': '#8B9A96',
          available: '#22C55E',
          occupied: '#EF4444',
          reserved: '#F59E0B',
          maintenance: '#6B7280',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 168, 67, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 168, 67, 0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
