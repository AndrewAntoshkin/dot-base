import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GenerationsProvider } from '@/contexts/generations-context';

// Только Inter - убраны IBM Plex Mono и Gloock для ускорения загрузки
const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap', // Показывать текст сразу, не ждать загрузки шрифта
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

