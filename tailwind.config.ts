import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0D0D0D',
        'ink-soft': '#3A3A3A',
        'ink-muted': '#888888',
        cream: '#F7F4EF',
        accent: '#1B4332',
        'accent-light': '#D8F3DC',
        'accent-mid': '#52B788',
        rail: '#E8E4DC',
        'rail-dark': '#C8C2B4',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
