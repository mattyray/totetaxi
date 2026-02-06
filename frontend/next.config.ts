// frontend/next.config.ts - UPDATE YOUR FILE TO LOOK LIKE THIS:

import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            // FIXED: Allow payment APIs for Stripe, disable others
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
            // Removed payment=() to allow Stripe to work
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
  }
};

const sentryWebpackPluginOptions = {
  // Only upload source maps in production
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

// Export with Sentry configuration
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "matthew-raynor",

  project: "totetaxi-next",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true
});