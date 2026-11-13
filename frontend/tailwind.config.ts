import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DaMarios brand: blue and white, the owner's chosen blue #0051A1 (from her logo).
        // Token names are kept from the first draft: "gold" is the light-blue accent, "teal" the brand blue.
        ink: { DEFAULT: '#062B57', soft: '#0B3567', deep: '#041E40', line: '#1C4675' },
        ivory: { DEFAULT: '#FFFFFF', warm: '#EDF3FA', line: '#D3DFEE' },
        gold: { DEFAULT: '#8CC4FF', light: '#B5D9FF', admin: '#8CC4FF' },
        teal: { DEFAULT: '#0051A1', dark: '#003F87', night: '#052244', tint: '#E5EEF8' },
        muted: { DEFAULT: '#4A5568', dark: '#9AA8BF', mist: '#C8D3E6' },
        paper: '#F5F8FC',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        ethiopic: ['var(--font-ethiopic)', 'serif'],
      },
      letterSpacing: { widest2: '.24em', widest3: '.36em' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        rise: { from: { transform: 'translateY(110%)' }, to: { transform: 'translateY(0)' } },
        draw: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        fadeup: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        // CSS-only entrance animations, so the hero shows before JavaScript loads.
        rise: 'rise .9s cubic-bezier(.22,1,.36,1) both',
        draw: 'draw 1.4s cubic-bezier(.22,1,.36,1) both',
        fadeup: 'fadeup .8s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
