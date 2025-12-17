import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProfilePageClient from '@/components/pages/profile-page-client';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return <ProfilePageClient userEmail={user.email || null} />;
}

