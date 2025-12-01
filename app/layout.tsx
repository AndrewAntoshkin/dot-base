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
  title: '.base - AI Generation Platform',
  description: 'Create, edit, upscale and remove backgrounds from images using AI',
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

