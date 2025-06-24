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
    // Exclude react-pdf from the server-side bundle
    if (isServer) {
      config.externals.push('react-pdf');
    }
    return config;
  },
};

export default nextConfig;
