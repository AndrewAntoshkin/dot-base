'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ResultPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Redirect to main page with generation ID
  useEffect(() => {
    router.push(`/?generationId=${id}`);
  }, [id, router]);

  return null;
}
