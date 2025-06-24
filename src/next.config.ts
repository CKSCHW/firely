
import type {NextConfig} from 'next';

// Explicitly load environment variables from .env files
// This ensures they are available for server-side processes.
require('dotenv').config();

const nextConfig: NextConfig = {
  experimental: {
    // This option allows you to opt-out of bundling packages in the Server Components layer.
    // 'pdfjs-dist' is not designed to be bundled for the server and works
    // best when required at runtime. This resolves module loading issues.
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
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
};

export default nextConfig;
