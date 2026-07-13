import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#12151A',
        surface: '#1B1F27',
        surface2: '#232833',
        border: '#2B313D',
        ink: '#E8EAED',
        muted: '#8B93A3',
        signal: '#6FE3B4',
        signalDim: '#2E5346',
        amber: '#E8A33D',
        rose: '#E17B7B',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      keyframes: {
        flow: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateX(120px)', opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        flow: 'flow 1.8s linear infinite',
        scan: 'scan 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;