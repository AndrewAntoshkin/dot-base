/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Оптимизация изображений как у Higgsfield
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24, // 24 часа кеш
    deviceSizes: [390, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Оптимизации для production
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select', '@radix-ui/react-dialog'],
  },
  // Минимизация бандла
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Отключение source maps в production для уменьшения размера
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;


