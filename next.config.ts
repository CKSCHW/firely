
import type {NextConfig} from 'next';

// Explicitly load environment variables from .env files
// This ensures they are available for server-side processes.
require('dotenv').config();

const nextConfig: NextConfig = {
  /* config options here */
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
    ],
  },
  webpack: (config, { isServer }) => {
    // This is a key change to prevent bundling certain server-side libraries.
    // By marking them as 'external', we tell Next.js to not bundle them
    // and instead load them directly from node_modules at runtime. This
    // is crucial for libraries with native dependencies or complex internal
    // module resolution like 'pdfjs-dist' and 'canvas'.
    if (isServer) {
      config.externals.push('pdfjs-dist/legacy/build/pdf.js', 'canvas');
    }

    return config;
  },
};

export default nextConfig;
