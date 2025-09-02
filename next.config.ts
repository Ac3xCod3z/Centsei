
import type { NextConfig } from 'next';

// Pull Firebase web app config from either NEXT_PUBLIC_* (local) or
// FIREBASE_WEBAPP_CONFIG (Firebase App Hosting build-time var).
function resolveFirebaseEnv() {
  let cfg: any = {};
  try {
    if (process.env.FIREBASE_WEBAPP_CONFIG) {
      cfg = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    }
  } catch {
    // ignore
  }
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || cfg.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || cfg.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || cfg.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || cfg.storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || cfg.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || cfg.appId,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || cfg.measurementId,
  } as Record<string, string | undefined>;
}

const nextConfig: NextConfig = {
  output: 'standalone',
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
  env: resolveFirebaseEnv(),
};

export default nextConfig;
