
require('dotenv').config();
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // No need to map variables here; App Hosting provides them directly.
  // The `env` block has been removed to allow Next.js to use the
  // `NEXT_PUBLIC_` prefixed environment variables automatically.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'public',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
