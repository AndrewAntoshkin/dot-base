import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';
import { ErrorBoundary } from '@/components/error-boundary';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { UserRole } from '@/contexts/user-context';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;
  let userRole: UserRole = 'user';
  let isAuthenticated = false;
  
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    isAuthenticated = !!user;
    
    // Получаем роль пользователя из БД
    if (user?.email) {
      const serviceClient = createServiceRoleClient();
      const { data: userData } = await serviceClient
        .from('users')
        .select('role')
        .eq('email', user.email.toLowerCase())
        .single() as { data: { role: string } | null };
      
      if (userData?.role) {
        userRole = userData.role as UserRole;
      }
    }
  } catch (error) {
    console.error('Failed to fetch user for layout:', error);
  }

  return (
    <html lang="ru">
      <body className={`${inter.variable} font-inter`}>
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

