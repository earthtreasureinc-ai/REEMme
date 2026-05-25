/** @type {import('next').NextConfig} */
const nextConfig = {
  target: 'serverless',
  images: {
    domains: ['example.com'], // Add your image domains here
  },
}

export default nextConfig
