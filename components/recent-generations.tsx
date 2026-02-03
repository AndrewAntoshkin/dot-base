'use client';

import { Play } from 'lucide-react';

export interface SessionGeneration {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  output_urls: string[] | null;
  model_name: string;
  action: string;
  created_at: string;
}

interface RecentGenerationsProps {
  generations: SessionGeneration[];
  currentGenerationId: string | null;
  onSelect: (id: string) => void;
  isMobile?: boolean;
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
}

// Skeleton pulse placeholder - uses working shimmer pattern from other components
function SkeletonPulse() {
  return (
    <div 
      className="absolute inset-0 rounded-[6px] bg-[#252525] overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent"
    />
  );
}


export function RecentGenerations({
  generations,
  currentGenerationId,
  onSelect,
  isMobile = false,
}: RecentGenerationsProps) {
  // Фильтруем только image и video генерации
  const filteredGenerations = generations.filter(
    (g) => !g.action.startsWith('analyze_')
  );

  if (filteredGenerations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-inter font-semibold text-[16px] leading-[22px] tracking-[-0.007em] text-white">
        Последние генерации
      </h3>

      {/* Grid: 4 columns on desktop, 2 on mobile. p-1 for ring visibility */}
      <div className={`grid gap-4 p-1 -m-1 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {filteredGenerations.map((generation) => {
          const isActive = generation.id === currentGenerationId;
          const isProcessing = generation.status === 'pending' || generation.status === 'processing';
          const isFailed = generation.status === 'failed';
          const hasOutput = generation.output_urls && generation.output_urls.length > 0;
          const firstUrl = generation.output_urls?.[0];
          const isVideo = firstUrl ? isVideoUrl(firstUrl) : false;
          const totalImages = generation.output_urls?.length || 0;
          const extraCount = totalImages - 1;

          return (
            <button
              key={generation.id}
              onClick={() => onSelect(generation.id)}
              className={`
                group flex flex-col gap-1 text-left transition-all
                ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}
              `}
            >
              {/* Thumbnail - fixed height as per Figma (240.83px) */}
              <div
                className={`
                  relative w-full rounded-[6px] bg-[#151515] overflow-hidden
                  ${isActive ? 'ring-2 ring-white' : ''}
                `}
                style={{ height: '241px', minHeight: '241px' }}
              >
                {isProcessing ? (
                  // Skeleton pulse placeholder during processing
                  <SkeletonPulse />
                ) : isFailed ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                    <span className="text-red-500 text-xs font-medium">Ошибка</span>
                  </div>
                ) : hasOutput && firstUrl ? (
                  <>
                    {isVideo ? (
                      <>
                        <video
                          src={`${firstUrl}#t=0.001`}
                          className="w-full h-full object-cover peer"
                          muted
                          playsInline
                          loop
                          preload="metadata"
                          onMouseEnter={(e) => {
                            e.currentTarget.src = firstUrl;
                            e.currentTarget.play();
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        {/* Play icon overlay - hides when video is playing (hovered) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none peer-hover:opacity-0 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={firstUrl}
                        alt={generation.model_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Multi-image indicator - показываем если больше 1 картинки */}
                    {extraCount > 0 && (
                      <div className="absolute bottom-2 right-2">
                        <div
                          className="flex items-center p-[2px] rounded-[10px] backdrop-blur-[4px]"
                          style={{ background: '#101010', boxShadow: '0px 0px 0px 2px rgba(0,0,0,0.3)' }}
                        >
                          {/* Показываем до 4 thumbnails */}
                          {generation.output_urls?.slice(1, 5).map((url, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-[8px] overflow-hidden border-2 border-[#101010] shrink-0"
                              style={{ marginLeft: idx > 0 ? '-16px' : 0 }}
                            >
                              <img
                                src={url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                          {/* "+N" badge если больше 5 картинок всего (4 в индикаторе + основная) */}
                          {totalImages > 5 && (
                            <div
                              className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-[#212121] border-2 border-[#101010] shrink-0"
                              style={{ marginLeft: '-16px' }}
                            >
                              <span className="font-inter font-medium text-[10px] leading-[16px] tracking-[-0.02em] uppercase text-white">
                                +{totalImages - 5}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#656565] text-sm">
                    —
                  </div>
                )}
              </div>

              {/* Model name - matches Figma: 10px, 500 weight, uppercase */}
              <span className="font-inter font-medium text-[10px] leading-[16px] tracking-[-0.02em] uppercase text-[#BBBBBB] block mt-1">
                {generation.model_name || 'Unknown Model'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
