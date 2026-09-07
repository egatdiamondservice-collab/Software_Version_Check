import type { Config } from 'tailwindcss';

/**
 * ธีมมาตรฐาน — ใช้สเกลสีปกติของ Tailwind เป็นหลัก
 * สีน้ำเงินเป็นสีหลักของปุ่มและลิงก์ เขียว/แดง/เหลืองใช้บอกสถานะเท่านั้น
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Thai',
          'Segoe UI',
          'Tahoma',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
