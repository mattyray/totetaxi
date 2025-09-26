// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Existing config
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Security headers - protect against common web attacks
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            // Prevent embedding in iframes (clickjacking protection)
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            // Prevent MIME type sniffing attacks
            key: 'X-Content-Type-Options', 
            value: 'nosniff'
          },
          {
            // Control referrer information leakage
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            // XSS protection (backup for older browsers)
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            // Disable dangerous browser features
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          {
            // Force HTTPS (only in production)
            key: 'Strict-Transport-Security',
            value: process.env.NODE_ENV === 'production' 
              ? 'max-age=31536000; includeSubDomains; preload' 
              : ''
          }
        ]
      }
    ]
  },

  // Production optimizations
  compiler: {
    // Remove console.logs in production (keep errors/warnings)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },

  // Remove source maps in production (security)
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    domains: ['totetaxi.com', 'api.totetaxi.com'],
    formats: ['image/webp', 'image/avif']
  },

  // Strict mode for better React practices
  reactStrictMode: true,

  // Security-focused experimental features
  experimental: {
    // Enable modern bundling
    esmExternals: true
  },

  // OVERRIDE: Force disable linting in all contexts
  webpack: (config, { dev }) => {
    // Disable ESLint plugin entirely in production builds
    if (!dev) {
      config.plugins = config.plugins.filter(
        (plugin: any) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
    }
    return config;
  }
};

export default nextConfig;