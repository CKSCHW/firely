
import type {NextConfig} from 'next';
import path from 'node:path';
import fs from 'node:fs';

// --- Start: Copy PDF.js worker file ---
// This is the most reliable way to serve the PDF.js worker.
// The worker file is copied to the `public` directory, and then
// the client can safely load it from there. This avoids issues with
// CDNs, module resolution, or bundler configurations.
try {
  const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
  // Using the 'legacy' build as it has better browser compatibility.
  const pdfWorkerPath = path.join(pdfjsDistPath, 'legacy/build', 'pdf.worker.min.mjs');
  const publicDir = path.join(process.cwd(), 'public');
  const destPath = path.join(publicDir, 'pdf.worker.min.mjs');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.copyFileSync(pdfWorkerPath, destPath);
  console.log('Successfully copied PDF.js worker to public directory.');
} catch (error) {
  console.error('Error copying PDF.js worker:', error);
  // We don't want to fail the build if this copy fails, but we should log it.
}
// --- End: Copy PDF.js worker file ---


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
};

export default nextConfig;
