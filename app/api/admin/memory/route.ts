import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import v8 from 'v8';

/**
 * GET /api/admin/memory
 * Диагностика потребления памяти Node.js процессом
 */
export async function GET() {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 });
    }

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
        total_heap_size_mb: toMB(heapStats.totalHeapSize),
        used_heap_size_mb: toMB(heapStats.usedHeapSize),
        heap_size_limit_mb: toMB(heapStats.heapSizeLimit),
        total_physical_size_mb: toMB(heapStats.totalPhysicalSize),
        malloced_memory_mb: toMB(heapStats.mallocedMemory),
        peak_malloced_memory_mb: toMB(heapStats.peakMallocedMemory),
        number_of_native_contexts: heapStats.numberOfNativeContexts,
        number_of_detached_contexts: heapStats.numberOfDetachedContexts,
      },
      heap_spaces: heapSpaces.map(space => ({
        name: space.spaceName,
        size_mb: toMB(space.spaceSize),
        used_mb: toMB(space.spaceUsedSize),
        available_mb: toMB(space.spaceAvailableSize),
        physical_mb: toMB(space.physicalSpaceSize),
      })),
      uptime_minutes: Math.round(process.uptime() / 60),
      node_version: process.version,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}