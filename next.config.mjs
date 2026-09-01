/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcryptjs'],
  experimental: { serverActions: { bodySizeLimit: '25mb' } },
};
export default nextConfig;
