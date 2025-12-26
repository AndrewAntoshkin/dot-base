'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ResultPageClient() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch generation to determine type, then redirect appropriately
  useEffect(() => {
    async function fetchAndRedirect() {
      try {
        const response = await fetch(`/api/generations/${id}`);
        
        if (!response.ok) {
          // Generation not found - go to home
          router.push('/');
          return;
        }
        
        const generation = await response.json();
        
        // Determine redirect based on action type
        if (generation.action?.startsWith('video_')) {
          // Video generation (including merge) - go to video page
          router.push(`/video?generationId=${id}`);
        } else if (generation.action?.startsWith('analyze_')) {
          // Analysis - go to analyze page
          router.push(`/analyze?generationId=${id}`);
        } else {
          // Image generation - go to main page
          router.push(`/?generationId=${id}`);
        }
      } catch (error) {
        console.error('Error fetching generation:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchAndRedirect();
    }
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return null;
}
