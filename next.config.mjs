/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.replicate.delivery' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
      { protocol: 'https', hostname: '**.blob.core.windows.net' },
      { protocol: 'https', hostname: 'replicate.com' },
      { protocol: 'https', hostname: 'pbxt.replicate.delivery' },
    ],
  },
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-tooltip', 'framer-motion'],
  },
}
export default nextConfig
