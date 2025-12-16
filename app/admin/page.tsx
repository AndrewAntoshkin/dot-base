import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserRoleFromDb, isAdminRole } from '@/lib/admin';
import AdminPageClient from '@/components/pages/admin-page-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Check authentication and admin access
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const email = user.email || null;
  
  // Получаем роль из БД
  const role = await getUserRoleFromDb(email);
  
  if (!isAdminRole(role)) {
    redirect('/');
  }
  
  return <AdminPageClient userEmail={email} />;
}


