'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface MobileStartScreenProps {
  mode: 'image' | 'video';
  onStartGeneration?: () => void;
}

export function MobileStartScreen({ mode, onStartGeneration }: MobileStartScreenProps) {
  const router = useRouter();

  const handleImageClick = () => {
    if (mode === 'image' && onStartGeneration) {
      // Уже на странице image - просто показываем форму
      onStartGeneration();
    } else {
      // Переходим на страницу image с параметром начала генерации
      router.push('/?start=1');
    }
  };

  const handleVideoClick = () => {
    if (mode === 'video' && onStartGeneration) {
      // Уже на странице video - просто показываем форму
      onStartGeneration();
    } else {
      // Переходим на страницу video с параметром начала генерации
      router.push('/video?start=1');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Mode Cards */}
      <div className="flex gap-2">
        {/* IMAGE Card */}
        <button
          onClick={handleImageClick}
          className={`flex-1 bg-[#131313] rounded-[20px] p-5 text-left transition-all active:scale-[0.98] ${
            mode === 'image' ? 'ring-1 ring-white/20' : ''
          }`}
        >
          <div className="flex flex-col gap-2">
            <p className="font-inter font-black italic text-[24px] leading-[24px] text-white">
              IMAGE
            </p>
            <div className="flex flex-col gap-[2px] font-inter font-medium italic text-[14px] leading-[20px] text-[#9c9c9c]">
              <p>Seedream</p>
              <p>Nano Banana</p>
              <p>Imagen</p>
            </div>
            <p className="font-inter text-[12px] leading-[20px] text-[#797979]">
              +16 моделей
            </p>
          </div>
        </button>

        {/* VIDEO Card */}
        <button
          onClick={handleVideoClick}
          className={`flex-1 bg-[#131313] rounded-[20px] p-5 text-left transition-all active:scale-[0.98] ${
            mode === 'video' ? 'ring-1 ring-white/20'  : ''
          }`}
        >
          <div className="flex flex-col gap-2">
            <p className="font-inter font-black italic text-[24px] leading-[24px] text-white">
              VIDEO
            </p>
            <div className="flex flex-col gap-[2px] font-inter font-medium italic text-[14px] leading-[20px] text-[#9c9c9c]">
              <p>Veo 3</p>
              <p>Kling</p>
              <p>Seedance</p>
            </div>
            <p className="font-inter text-[12px] leading-[20px] text-[#797979]">
              +14 моделей
            </p>
          </div>
        </button>
      </div>

      {/* How to Start Section */}
      <div className="flex flex-col gap-4">
        <p className="font-inter font-semibold text-[16px] leading-[22px] text-white">
          Как начать?
        </p>

        <div className="flex flex-col gap-2">
          {/* Step 1 */}
          <div className="bg-[#131313] rounded-[20px] px-5 py-4 flex gap-5 items-start">
            <div className="w-8 h-8 shrink-0 flex items-center justify-start">
              <Image
                src="/numbers/1.png"
                alt="1"
                width={18}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-inter font-semibold text-[16px] leading-[22px] text-white">
                Выбор модели
              </p>
              <p className="font-inter text-[14px] leading-[20px] text-[#9c9c9c]">
                Выберите действие и модель для начала генерации
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#131313] rounded-[20px] px-5 py-4 flex gap-5 items-start">
            <div className="w-8 h-8 shrink-0 flex items-center justify-start">
              <Image
                src="/numbers/2.png"
                alt="2"
                width={28}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-inter font-semibold text-[16px] leading-[22px] text-white">
                Промпт
              </p>
              <p className="font-inter text-[14px] leading-[20px] text-[#9c9c9c]">
                Опишите что вы хотите создать или изменить
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#131313] rounded-[20px] px-5 py-4 flex gap-5 items-start">
            <div className="w-8 h-8 shrink-0 flex items-center justify-start">
              <Image
                src="/numbers/3.png"
                alt="3"
                width={27}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-inter font-semibold text-[16px] leading-[22px] text-white">
                Настройки
              </p>
              <p className="font-inter text-[14px] leading-[20px] text-[#9c9c9c]">
                Настройте параметры генерации для лучшего результата
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
