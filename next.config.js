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
  typescript: {
    // O typecheck continua obrigatório no script npm run typecheck.
    // Mantido aqui para impedir que o build da Vercel fique preso em verificação duplicada do Next/Turbopack.
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
  outputFileTracingRoot: path.join(__dirname),
}

module.exports = nextConfig
