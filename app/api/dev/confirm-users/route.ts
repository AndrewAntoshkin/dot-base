import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DEV ONLY: Auto-confirm all unconfirmed users
 * This endpoint should ONLY be used in development
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
    console.log('🔄 Auto-confirming users...');
    
    const supabase = createServiceRoleClient();

    // List all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error listing users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`📋 Found ${users?.length || 0} users`);

    const results = [];
    let confirmed = 0;

    for (const user of users || []) {
      if (!user.email_confirmed_at) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.error(`❌ Error confirming user ${user.email}:`, updateError);
          results.push({ email: user.email, status: 'error', error: updateError.message });
        } else {
          console.log(`✅ Confirmed: ${user.email}`);
          results.push({ email: user.email, status: 'confirmed' });
          confirmed++;
        }
      } else {
        console.log(`✓ Already confirmed: ${user.email}`);
        results.push({ email: user.email, status: 'already_confirmed' });
      }
    }

    console.log(`\n✅ Auto-confirmed ${confirmed} users`);

    return NextResponse.json({
      success: true,
      total_users: users?.length || 0,
      confirmed,
      results,
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}




