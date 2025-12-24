'use client';

import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, email } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Даём время на загрузку данных пользователя
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isChecking && email && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, email, isChecking, router]);

  // Показываем загрузку пока проверяем
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  // Если не админ и есть email - редирект уже произойдёт
  if (email && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
