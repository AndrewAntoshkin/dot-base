import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import WorkspaceUsersPageClient from '@/components/pages/workspace-users-page-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceUsersPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Получаем workspace по slug
  const adminClient = createServiceRoleClient();
  const { data: workspace } = await adminClient
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  if (!workspace) {
    notFound();
  }
  
  return <WorkspaceUsersPageClient workspaceId={workspace.id} />;
}
