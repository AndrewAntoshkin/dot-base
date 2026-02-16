/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix incorrect monorepo/workspace root inference (multiple lockfiles)
  turbopack: {
    root: __dirname,
  },
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
      {
        protocol: 'https',
        hostname: 'basecraft.ru',
      },
      // Разрешаем все поддомены replicate
      {
        protocol: 'https',
        hostname: '**.replicate.delivery',
      },
    ],
    // Отключаем серверную оптимизацию изображений — она кэширует обработанные
    // изображения в RAM процесса. При сотнях генераций в день это вызывает
    // монотонный рост памяти (каждое изображение хранится в кэше до TTL).
    // Используем уже готовые thumbnails из Supabase Storage.
    unoptimized: true,
    // Форматы изображений - WebP для меньшего размера
    formats: ['image/webp'],
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
