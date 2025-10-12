/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

export default nextConfig