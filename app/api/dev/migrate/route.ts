import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DEV ONLY: Sync auth.users to public.users
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    console.log('🔄 Syncing auth.users to public.users...');
    
    const supabase = createServiceRoleClient();
    
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to list auth users: ${authError.message}`);
    }

    console.log(`📋 Found ${authUsers?.length || 0} auth users`);

    const results = [];
    let synced = 0;
    let skipped = 0;

    for (const authUser of authUsers || []) {
      // Check if user exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (existingUser) {
        console.log(`✓ User already exists: ${authUser.email}`);
        results.push({ email: authUser.email, status: 'exists' });
        skipped++;
        continue;
      }

      // Create user in public.users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          telegram_username: authUser.email?.split('@')[0] || `user_${authUser.id.substring(0, 8)}`,
          email: authUser.email,
          created_at: authUser.created_at,
          is_active: true,
          credits: 100,
          role: 'user',
        });

      if (insertError) {
        console.error(`❌ Failed to create user ${authUser.email}:`, insertError);
        results.push({ email: authUser.email, status: 'error', error: insertError.message });
      } else {
        console.log(`✅ Synced user: ${authUser.email}`);
        results.push({ email: authUser.email, status: 'synced' });
        synced++;
      }
    }

    console.log(`\n✅ Synced ${synced} users, skipped ${skipped} existing users`);

    return NextResponse.json({
      success: true,
      total: authUsers?.length || 0,
      synced,
      skipped,
      results,
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: error.stack },
      { status: 500 }
    );
  }
}

