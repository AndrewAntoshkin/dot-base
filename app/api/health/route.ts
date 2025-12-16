import { NextResponse } from 'next/server';

/**
 * Health check endpoint для диагностики сетевых проблем
 * Возвращает минимальный ответ для проверки соединения
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
  }, {
    headers: {
      // Запрещаем кэширование для точных замеров
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  });
}










