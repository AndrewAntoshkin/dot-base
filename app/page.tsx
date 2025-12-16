import { createServerSupabaseClient } from '@/lib/supabase/server';
import HomePageClient from '@/components/pages/home-page-client';
import { LandingPage } from '@/components/pages/landing-page';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Если пользователь не авторизован - показываем лендинг
  if (!user) {
    return <LandingPage />;
  }
  
  return <HomePageClient />;
}
