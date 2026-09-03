import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ปักรากไว้ที่โฟลเดอร์โปรเจกต์ ไม่งั้น Next อาจไปเจอ package-lock.json
  // ที่ค้างอยู่ใน C:\Users\<ชื่อ> แล้วเลือกโฟลเดอร์นั้นเป็นรากแทน
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ['bcryptjs'],
  experimental: { serverActions: { bodySizeLimit: '25mb' } },
};
export default nextConfig;
