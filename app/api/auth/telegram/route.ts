import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Telegram Web App Authentication
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

function verifyTelegramData(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...dataToCheck } = data;

  const dataCheckString = Object.keys(dataToCheck)
    .sort()
    .map((key) => `${key}=${dataToCheck[key]}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calculatedHash === hash;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    // Parse initData
    const params = new URLSearchParams(initData);
    const dataToVerify: Record<string, string> = {};
    params.forEach((value, key) => {
      dataToVerify[key] = value;
    });

    // Verify data
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    if (!verifyTelegramData(dataToVerify, botToken)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 403 });
    }

    // Parse user data
    const userData: TelegramUser = JSON.parse(dataToVerify.user || '{}');

    if (!userData.id) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Check if user exists
    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userData.id)
      .single();

    if (!existingUser) {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: userData.id,
          telegram_username: userData.username || `user_${userData.id}`,
          telegram_first_name: userData.first_name,
          telegram_last_name: userData.last_name,
          telegram_photo_url: userData.photo_url,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      existingUser = newUser;
    } else {
      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', existingUser.id);
    }

    // Check if user is active
    if (!existingUser.is_active) {
      return NextResponse.json({ error: 'User is not active' }, { status: 403 });
    }

    // Create session token (you might want to use JWT here)
    const sessionToken = crypto.randomBytes(32).toString('hex');

    return NextResponse.json({
      user: {
        id: existingUser.id,
        telegram_username: existingUser.telegram_username,
        telegram_first_name: existingUser.telegram_first_name,
        telegram_photo_url: existingUser.telegram_photo_url,
        credits: existingUser.credits,
      },
      session_token: sessionToken,
    });
  } catch (error: any) {
    console.error('Telegram auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


