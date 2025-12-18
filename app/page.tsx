import { getAuthUser } from '@/lib/supabase/auth-helpers';
import HomePageClient from '@/components/pages/home-page-client';
import { LandingPage } from '@/components/pages/landing-page';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Используем кэшированный auth - результат будет переиспользован из layout.tsx
  const user = await getAuthUser();
  
  // Если пользователь не авторизован - показываем лендинг
  if (!user) {
    return <LandingPage />;
  }
  
  return <HomePageClient />;
}
