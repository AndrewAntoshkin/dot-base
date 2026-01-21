import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET flow members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flowId } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this flow
    const { data: flow } = await supabase
      .from('flows')
      .select('user_id')
      .eq('id', flowId)
      .single();

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Get members
    const { data: members, error: membersError } = await supabase
      .from('flow_members')
      .select(`
        id,
        user_id,
        role,
        accepted_at,
        created_at
      `)
      .eq('flow_id', flowId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Get pending invites (only for owner)
    let invites: any[] = [];
    if (flow.user_id === user.id) {
      const { data: invitesData } = await supabase
        .from('flow_invites')
        .select('id, email, role, expires_at, created_at')
        .eq('flow_id', flowId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString());
      
      invites = invitesData || [];
    }

    return NextResponse.json({
      members: members || [],
      invites,
      isOwner: flow.user_id === user.id,
    });

  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - invite member by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flowId } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role = 'viewer' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user is the owner
    const { data: flow } = await supabase
      .from('flows')
      .select('user_id, name')
      .eq('id', flowId)
      .single();

    if (!flow || flow.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to invite members' }, { status: 403 });
    }

    // Check if user with this email already exists and is a member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('flow_members')
        .select('id')
        .eq('flow_id', flowId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
      }
    }

    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from('flow_invites')
      .select('id')
      .eq('flow_id', flowId)
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 });
    }

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('flow_invites')
      .insert({
        flow_id: flowId,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // TODO: Send email with invite link
    // For now, just return the invite token
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'https://base-craft.com'}/flow/invite/${invite.token}`;

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
      },
      inviteUrl, // For manual sharing
    });

  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - remove member or cancel invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flowId } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const inviteId = searchParams.get('inviteId');

    // Check if user is the owner
    const { data: flow } = await supabase
      .from('flows')
      .select('user_id')
      .eq('id', flowId)
      .single();

    if (!flow || flow.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (memberId) {
      // Remove member
      const { error } = await supabase
        .from('flow_members')
        .delete()
        .eq('id', memberId)
        .eq('flow_id', flowId);

      if (error) {
        console.error('Error removing member:', error);
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
      }
    } else if (inviteId) {
      // Cancel invite
      const { error } = await supabase
        .from('flow_invites')
        .delete()
        .eq('id', inviteId)
        .eq('flow_id', flowId);

      if (error) {
        console.error('Error canceling invite:', error);
        return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'memberId or inviteId required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete member/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
