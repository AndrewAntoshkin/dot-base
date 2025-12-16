'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-[#252525]',
        'before:absolute before:inset-0',
        'before:-translate-x-full',
        'before:animate-[shimmer_1.5s_infinite]',
        'before:bg-gradient-to-r',
        'before:from-transparent before:via-[#3a3a3a] before:to-transparent',
        className
      )}
    />
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <div className="border border-[#303030] rounded-[20px] p-6">
      <Skeleton className="h-5 w-24 mb-3" />
      <div className="flex items-end justify-between gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-[#252525]">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded-[6px]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-6 w-20 rounded-[6px]" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-5 w-12" />
      </td>
      {columns >= 5 && (
        <td className="py-4 px-6">
          <Skeleton className="h-5 w-16" />
        </td>
      )}
      {columns >= 6 && (
        <td className="py-4 px-6">
          <Skeleton className="h-6 w-24 rounded-full" />
        </td>
      )}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

// Full Dashboard Skeleton
export function DashboardSkeleton({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const cardCount = isSuperAdmin ? 5 : 3;
  const columnCount = isSuperAdmin ? 7 : 6;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1 mb-4">
        <Skeleton className="h-9 w-40 rounded-[10px]" />
        <Skeleton className="h-9 w-40 rounded-[10px]" />
        <Skeleton className="h-9 w-44 rounded-[10px]" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Table */}
      <div className="border border-[#252525] rounded-[12px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#252525]">
                <th className="h-11 px-6 text-left">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-5 h-5 rounded-[6px]" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </th>
                <th className="h-11 px-6"><Skeleton className="h-4 w-16" /></th>
                <th className="h-11 px-6"><Skeleton className="h-4 w-16" /></th>
                <th className="h-11 px-6"><Skeleton className="h-4 w-20" /></th>
                {isSuperAdmin && <th className="h-11 px-6"><Skeleton className="h-4 w-20" /></th>}
                <th className="h-11 px-6"><Skeleton className="h-4 w-12" /></th>
                <th className="h-11 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columnCount} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Side Sheet Skeleton
export function SideSheetSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-4">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Table Header */}
      <div className="flex items-center gap-4 py-3 border-b border-[#252525]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-[#252525]">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-8 ml-auto" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}

      {/* Pagination */}
      <div className="flex justify-center gap-1 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-8 h-8 rounded-md" />
        ))}
      </div>
    </div>
  );
}

// Generation Card Skeleton (for history page)
export function GenerationCardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#252525]">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// History Page Skeleton
export function HistoryPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <GenerationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
