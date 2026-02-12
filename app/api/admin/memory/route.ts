import { NextResponse } from 'next/server';
import v8 from 'v8';

/**
 * GET /api/admin/memory
 * Диагностика потребления памяти Node.js процессом
 */
export async function GET() {
  try {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const heapSpaces = v8.getHeapSpaceStatistics();

    const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024);

    return NextResponse.json({
      process_memory: {
        rss_mb: toMB(memUsage.rss),
        heap_total_mb: toMB(memUsage.heapTotal),
        heap_used_mb: toMB(memUsage.heapUsed),
        external_mb: toMB(memUsage.external),
        array_buffers_mb: toMB(memUsage.arrayBuffers),
      },
      v8_heap: {
        total_heap_size_mb: toMB(heapStats.total_heap_size),
        used_heap_size_mb: toMB(heapStats.used_heap_size),
        heap_size_limit_mb: toMB(heapStats.heap_size_limit),
        total_physical_size_mb: toMB(heapStats.total_physical_size),
        malloced_memory_mb: toMB(heapStats.malloced_memory),
        peak_malloced_memory_mb: toMB(heapStats.peak_malloced_memory),
        number_of_native_contexts: heapStats.number_of_native_contexts,
        number_of_detached_contexts: heapStats.number_of_detached_contexts,
      },
      heap_spaces: heapSpaces.map(space => ({
        name: space.space_name,
        size_mb: toMB(space.space_size),
        used_mb: toMB(space.space_used_size),
        available_mb: toMB(space.space_available_size),
        physical_mb: toMB(space.physical_space_size),
      })),
      uptime_minutes: Math.round(process.uptime() / 60),
      node_version: process.version,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}