'use client';

import Image from 'next/image';
import { Copy } from 'lucide-react';

const examplePrompt = "different fantasy heroes staying back to camera and looking at the edge, sunset, mountains, cinematic";

export function WaitingForProjectPage() {
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(examplePrompt);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="/waiting-bg.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 md:px-16 lg:px-40">
        <div className="flex max-w-[640px] flex-col gap-16">
          {/* Logo and text */}
          <div className="flex flex-col gap-11">
            {/* Logo */}
            <Image
              src="/baseCRLogo.svg"
              alt="BASECRAFT!"
              width={136}
              height={28}
              className="h-7 w-auto"
            />

            {/* Heading */}
            <div className="flex flex-col gap-4">
              <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.01em] text-white">
                Почти готово
              </h1>
              <p className="text-xl leading-[1.4] text-white">
                Дождитесь добавления в проект
                <br />
                для продолжения работы
              </p>
            </div>
          </div>

          {/* Prompt card */}
          <div className="flex w-full max-w-[416px] flex-col gap-3 rounded-2xl bg-black/30 p-5 backdrop-blur-[32px]">
            <div className="flex items-center gap-2">
              <span className="text-base text-[#707070]">Prompt</span>
              <button
                onClick={handleCopyPrompt}
                className="text-[#707070] transition-colors hover:text-white"
                title="Скопировать"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xl leading-[1.2] text-white">
              {examplePrompt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
