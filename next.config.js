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
      // Разрешаем все поддомены replicate
      {
        protocol: 'https',
        hostname: '**.replicate.delivery',
      },
    ],
    // Разрешаем изображения с любых доменов (для прокси)
    unoptimized: false,
    // Оптимизация для мобильных устройств
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Форматы изображений - WebP для меньшего размера
    formats: ['image/webp'],
    // Минимизация запросов к CDN
    minimumCacheTTL: 60 * 60 * 24, // 24 часа
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Сжатие ответов
  compress: true,
};

module.exports = nextConfig;
