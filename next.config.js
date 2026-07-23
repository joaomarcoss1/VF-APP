const path = require('path')
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  webpack(config) {
    config.resolve.symlinks = false
    return config
  },
}
module.exports = nextConfig
