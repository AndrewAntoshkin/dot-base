import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';
import { ErrorBoundary } from '@/components/error-boundary';
import { getFullAuth } from '@/lib/supabase/auth-helpers';
import type { UserRole } from '@/contexts/user-context';

// This layout reads auth cookies (Supabase SSR), so it must always be dynamic.
// Otherwise Next.js will try to statically prerender pages and fail with DYNAMIC_SERVER_USAGE.
export const dynamic = 'force-dynamic';

// Alumni Sans для заголовков на лендинге — локальный, не зависит от Google
const alumniSans = localFont({
  src: [
    {
      path: '../public/fonts/AlumniSans-Latin.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../public/fonts/AlumniSans-Cyrillic.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-alumni-sans',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Используем кэшированный auth helper - один запрос вместо двух
  const auth = await getFullAuth();
  
  const userEmail = auth.user?.email ?? null;
  const userRole: UserRole = auth.dbUser?.role ?? 'user';
  const isAuthenticated = auth.isAuthenticated;

  return (
    <html lang="ru">
      <body className={`${alumniSans.variable} font-inter`}>
        <ErrorBoundary>
          <AppProviders 
            initialUserEmail={userEmail} 
            initialUserRole={userRole}
            isAuthenticated={isAuthenticated}
          >
            {children}
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}

