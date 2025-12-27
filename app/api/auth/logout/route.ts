import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    
    // Сбрасываем кэш Next.js для всех страниц
    revalidatePath('/', 'layout');
    
    // Создаём ответ и очищаем кэш-cookies
    const response = NextResponse.json({ status: 'success' });
    
    // Очищаем кэши сессии и роли
    response.cookies.delete('user_role');
    response.cookies.delete('session_checked');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to logout' },
      { status: 500 }
    );
  }
}















