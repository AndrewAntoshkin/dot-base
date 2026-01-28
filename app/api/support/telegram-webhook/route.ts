import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_SUPPORT_CHAT_ID;

// Telegram Update interface
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    reply_to_message?: {
      message_id: number;
      text?: string;
      from?: {
        id: number;
        is_bot?: boolean;
      };
    };
  };
}

// POST /api/support/telegram-webhook - receive updates from Telegram
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update, null, 2));

    // Check if this is a message in our support chat
    if (!update.message || update.message.chat.id.toString() !== TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;

    // Check if this is a reply to another message
    if (!message.reply_to_message) {
      return NextResponse.json({ ok: true });
    }

    // Check if the replied message is from the bot (original support request)
    const repliedMessage = message.reply_to_message;
    if (!repliedMessage.from?.is_bot || !repliedMessage.text) {
      return NextResponse.json({ ok: true });
    }

    // Extract user ID from the original message
    // Telegram returns rendered text (without Markdown asterisks)
    // Format can be: "🆔 ID: uuid-here" or "🆔 ID:\nuuid-here" (ID on new line)
    const userIdMatch = repliedMessage.text.match(/🆔\s*ID:?\s*\n?([a-f0-9-]{36})/i);
    if (!userIdMatch) {
      console.log('[Telegram Webhook] Could not extract user ID from message. Text:', repliedMessage.text);
      return NextResponse.json({ ok: true });
    }

    const userId = userIdMatch[1];
    const replyText = message.text;

    if (!replyText) {
      return NextResponse.json({ ok: true });
    }

    console.log('[Telegram Webhook] Creating notification for user:', userId);

    // Create notification for the user
    const supabase = createAdminSupabaseClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'support_reply',
        title: 'Ответ от поддержки',
        message: replyText,
        is_read: false,
        metadata: {
          telegram_message_id: message.message_id,
          replied_by: message.from?.username || message.from?.first_name || 'Support',
        },
      });

    if (error) {
      console.error('[Telegram Webhook] Error creating notification:', error);
      return NextResponse.json({ ok: false, error: 'Failed to create notification' }, { status: 500 });
    }

    console.log('[Telegram Webhook] Notification created successfully');

    // Send confirmation to Telegram
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: '✅ Ответ отправлен пользователю',
          reply_to_message_id: message.message_id,
        }),
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// GET endpoint to verify webhook (Telegram sends GET to verify)
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook is active' });
}
