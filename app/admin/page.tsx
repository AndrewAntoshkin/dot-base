import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import AdminPageClient from '@/components/pages/admin-page-client';

export default async function AdminPage() {
  // Check authentication and admin access
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const email = user.email || null;
  
  if (!isAdminEmail(email)) {
    redirect('/');
  }
  
  return <AdminPageClient userEmail={email} />;
}


