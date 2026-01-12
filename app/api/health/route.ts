import { NextResponse } from 'next/server';

// Используем Edge Runtime для минимальной латентности
export const runtime = 'edge';
export const preferredRegion = 'fra1';

/**
 * Health check endpoint для диагностики сетевых проблем
 * Возвращает минимальный ответ для проверки соединения
 * Использует Edge Runtime для мгновенного ответа без cold start
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    region: 'fra1',
  }, {
    headers: {
      // Запрещаем кэширование для точных замеров
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  });
}

















