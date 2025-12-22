import { getFullAuth } from '@/lib/supabase/auth-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import HomePageClient from '@/components/pages/home-page-client';
import { LandingPage } from '@/components/pages/landing-page';
import { WaitingForProjectPage } from '@/components/pages/waiting-for-project-page';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Используем кэшированный auth - результат будет переиспользован из layout.tsx
  const auth = await getFullAuth();
  
  // Если пользователь не авторизован - показываем лендинг
  if (!auth.isAuthenticated || !auth.dbUser) {
    return <LandingPage />;
  }
  
  // Проверяем есть ли у пользователя workspace
  const supabase = createServiceRoleClient();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', auth.dbUser.id)
    .limit(1)
    .single();
  
  // Если пользователь не добавлен ни в один проект - показываем заглушку
  if (!membership) {
    return <WaitingForProjectPage />;
  }
  
  return <HomePageClient />;
}
