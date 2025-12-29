import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101010]">
      <div className="text-center">
        <h1 className="font-inter font-bold text-[72px] text-white mb-4">404</h1>
        <p className="font-inter text-[18px] text-[#8c8c8c] mb-8">
          Страница не найдена
        </p>
        <Link
          href="/"
          className="inline-block bg-[#f0f0f5] rounded-xl px-6 py-3 font-inter font-medium text-base text-[#141414] hover:bg-white transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}






