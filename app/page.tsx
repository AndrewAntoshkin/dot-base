import { getFullAuth } from '@/lib/supabase/auth-helpers';
import HomePageClient from '@/components/pages/home-page-client';
import { LandingPage } from '@/components/pages/landing-page';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const auth = await getFullAuth();
  
  if (!auth.isAuthenticated) {
    return <LandingPage />;
  }
  
  return <HomePageClient isAdmin={auth.isAdmin} />;
}
