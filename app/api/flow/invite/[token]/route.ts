import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET - get invite info (without accepting)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServerSupabaseClient();

    // Get invite info
    const { data: invite, error } = await supabase
      .from('flow_invites')
      .select(`
        id,
        email,
        role,
        expires_at,
        used_at,
        flow_id,
        flows:flow_id (
          id,
          name
        )
      `)
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        flow: invite.flows,
      },
    });

  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - accept invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please login to accept invite' }, { status: 401 });
    }

    // Call the accept_flow_invite function
    const { data, error } = await supabase.rpc('accept_flow_invite', {
      invite_token: token,
    });

    if (error) {
      console.error('Error accepting invite:', error);
      return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      flowId: data.flow_id,
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
