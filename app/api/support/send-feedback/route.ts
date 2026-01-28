import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_SUPPORT_CHAT_ID;

export async function POST(request: NextRequest) {
  try {
    // Проверяем env переменные
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram support bot configuration');
      return NextResponse.json(
        { error: 'Сервис временно недоступен' },
        { status: 500 }
      );
    }

    // Support both JSON and FormData
    const contentType = request.headers.get('content-type') || '';
    let subject: string;
    let message: string;
    const images: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      subject = formData.get('subject') as string;
      message = formData.get('message') as string;
      
      // Collect all images
      for (let i = 0; i < 5; i++) {
        const image = formData.get(`image_${i}`) as File | null;
        if (image && image.size > 0) {
          images.push(image);
        }
      }
    } else {
      const body = await request.json();
      subject = body.subject;
      message = body.message;
    }

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Укажите тему и текст обращения' },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: 'Сообщение слишком длинное (максимум 4000 символов)' },
        { status: 400 }
      );
    }

    // Получаем информацию о пользователе
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userInfo = 'Анонимный пользователь';
    let userEmail = '';
    let userId = '';

    if (user) {
      userId = user.id;
      userEmail = user.email || '';
      
      // Пытаемся получить дополнительную информацию
      const { data: profile } = await supabase
        .from('users')
        .select('email, telegram_username, first_name, last_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        const nameParts = [profile.first_name, profile.last_name].filter(Boolean);
        const name = nameParts.length > 0 ? nameParts.join(' ') : '';
        const tg = profile.telegram_username ? `@${profile.telegram_username}` : '';
        
        userInfo = [name, tg, profile.email || userEmail].filter(Boolean).join(' | ') || userEmail || userId;
      } else {
        userInfo = userEmail || userId;
      }
    }

    // Формируем сообщение для Telegram (email без экранирования чтобы был кликабельным)
    const telegramMessage = `📬 *Новое обращение*

👤 *Пользователь:* ${escapeMarkdown(userInfo)}
${userId ? `🆔 *ID:* \`${userId}\`` : ''}
${userEmail ? `📧 *Email:* ${userEmail}` : ''}

📌 *Тема:* ${escapeMarkdown(subject)}

💬 *Сообщение:*
${escapeMarkdown(message)}

---
🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} MSK`;

    // Отправляем текстовое сообщение в Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!telegramResponse.ok) {
      const error = await telegramResponse.json();
      console.error('Telegram API error:', error);
      return NextResponse.json(
        { error: 'Не удалось отправить сообщение. Попробуйте позже.' },
        { status: 500 }
      );
    }

    // Отправляем изображения, если есть
    if (images.length > 0) {
      for (const image of images) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('chat_id', TELEGRAM_CHAT_ID);
          imageFormData.append('photo', image);
          imageFormData.append('caption', `📎 Приложение к обращению от ${userInfo}`);

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
            {
              method: 'POST',
              body: imageFormData,
            }
          );
        } catch (imageError) {
          console.error('Failed to send image to Telegram:', imageError);
          // Continue with other images even if one fails
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Support feedback error:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка. Попробуйте позже.' },
      { status: 500 }
    );
  }
}

// Экранируем специальные символы Markdown
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

