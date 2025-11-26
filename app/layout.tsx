import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono, Gloock } from 'next/font/google';
import './globals.css';
import { GenerationsProvider } from '@/contexts/generations-context';

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

const gloock = Gloock({ 
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-gloock',
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
      <body className={`${inter.variable} ${ibmPlexMono.variable} ${gloock.variable} font-inter`}>
        <GenerationsProvider>
          {children}
        </GenerationsProvider>
      </body>
    </html>
  );
}

