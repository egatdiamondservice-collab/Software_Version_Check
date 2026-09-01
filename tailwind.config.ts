import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fdfbf7',
        ink: '#2d2d2d',
        muted: '#e5e0d8',
        accent: '#ff4d4d',
        pen: '#2d5da1',
        postit: '#fff9c4',
      },
      fontFamily: {
        // Sriracha / Mali carry Thai; Kalam / Patrick Hand are the Latin fallbacks
        head: ['Sriracha', 'Kalam', 'Comic Sans MS', 'Segoe Print', 'cursive'],
        body: ['Mali', 'Patrick Hand', 'Comic Sans MS', 'Tahoma', 'sans-serif'],
      },
      borderRadius: {
        wobbly: '255px 15px 225px 15px / 15px 225px 15px 255px',
        wobblyMd: '35px 6px 30px 6px / 6px 30px 6px 35px',
        wobblySm: '14px 4px 12px 4px / 4px 12px 4px 14px',
        blob: '60% 40% 55% 45% / 45% 55% 40% 60%',
      },
      boxShadow: {
        hard: '4px 4px 0px 0px #2d2d2d',
        hardLg: '8px 8px 0px 0px #2d2d2d',
        hardSm: '2px 2px 0px 0px #2d2d2d',
softest: '3px 3px 0px 0px rgba(45,45,45,0.18)',
      },
      transitionDuration: { DEFAULT: '100ms' },
    },
  },
  plugins: [],
};
export default config;
