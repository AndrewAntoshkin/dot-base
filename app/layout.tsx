import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { GenerationsProvider } from '@/contexts/generations-context';

// Локальный шрифт Inter - работает без VPN, не зависит от Google
const inter = localFont({
  src: [
    {
      path: '../public/fonts/Inter-Variable.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../public/fonts/Inter-Cyrillic.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.basecraft.ru'),
  title: '.base — Один инструмент для работы с генеративными моделями',
  description: 'Создавайте изображения, редактируйте, увеличивайте разрешение и удаляйте фон с помощью ИИ. Все генеративные модели в одном месте.',
  keywords: ['ИИ', 'генерация изображений', 'искусственный интеллект', 'нейросети', 'AI', 'image generation', 'upscale', 'remove background'],
  authors: [{ name: '.base' }],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
  openGraph: {
    title: '.base — Один инструмент для работы с генеративными моделями',
    description: 'Создавайте изображения, редактируйте, увеличивайте разрешение и удаляйте фон с помощью ИИ. Все генеративные модели в одном месте.',
    url: 'https://www.basecraft.ru',
    siteName: '.base',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '.base — Один инструмент для работы с генеративными моделями',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '.base — Один инструмент для работы с генеративными моделями',
    description: 'Создавайте изображения, редактируйте, увеличивайте разрешение и удаляйте фон с помощью ИИ.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-inter`}>
        <GenerationsProvider>
          {children}
        </GenerationsProvider>
      </body>
    </html>
  );
}

