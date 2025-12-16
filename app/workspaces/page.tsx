import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WorkspacesPageClient from '@/components/pages/workspaces-page-client';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Если пользователь не авторизован
  if (!user) {
    redirect('/login');
  }
  
  return <WorkspacesPageClient />;
}
