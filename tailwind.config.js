/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'nc-bg': '#0A0E1A',
        'nc-card': '#111827',
        'nc-surface': '#1A2235',
        'nc-green': '#4ADE80',
        'nc-cyan': '#38BDF8',
        'nc-neon': '#22D3EE',
        'nc-glow': '#A3E635',
        'nc-text1': '#F1F5F9',
        'nc-text2': '#94A3B8',
        'nc-text3': '#64748B',
        'nc-grade-a': '#22C55E',
        'nc-grade-b': '#3B82F6',
        'nc-grade-c': '#F59E0B',
        'nc-grade-d': '#EF4444',
        'nc-border': 'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        outfit: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        tajawal: ['Tajawal', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'nc-glow': '0 0 40px rgba(74,222,128,0.15), 0 0 80px rgba(34,211,238,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(74,222,128,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(74,222,128,0.6)' },
        },
      },
    },
  },
  plugins: [],
};
