import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to logout' },
      { status: 500 }
    );
  }
}












