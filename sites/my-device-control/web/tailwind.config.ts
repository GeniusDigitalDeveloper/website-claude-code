import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A', accent: '#0369A1', surface: '#F8FAFC',
        muted: '#E8ECF1', mutedfg: '#475569', line: '#E2E8F0', danger: '#DC2626',
        ok: '#047857', warn: '#B45309',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
