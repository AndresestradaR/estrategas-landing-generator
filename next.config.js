/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.nanobanana.com',
      },
      {
        protocol: 'https',
        hostname: '*.nanobanana.com',
      },
    ],
  },
};

module.exports = nextConfig;