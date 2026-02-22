import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import ProjectPageClient from '@/components/pages/project-page-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify project exists
  const adminClient = createServiceRoleClient();
  const { data: project } = await adminClient
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('is_active', true)
    .single() as { data: { id: string } | null };

  if (!project) {
    notFound();
  }

  return <ProjectPageClient projectId={id} />;
}
