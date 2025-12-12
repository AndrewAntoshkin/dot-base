'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, User } from 'lucide-react';
import { useUser } from '@/contexts/user-context';

// 20 топовых моделей для бегущей строки
const MODELS_LIST = [
  'FLUX 2 Pro', 'SeeDream 4.5', 'Nano Banana Pro', 'Ideogram V3',
  'FLUX 1.1 Pro', 'Imagen 4 Ultra', 'Recraft V3', 'SD 3.5 Large', 
  'MiniMax Image-01', 'Veo 3.1', 'Kling v2.5', 'Hailuo 2.3', 
  'Wan 2.5', 'Seedance 1 Pro', 'Runway Gen4', 'FLUX Kontext',
  'Bria GenFill', 'Crystal Upscaler', 'Google Upscaler', 'BiRefNet',
];

// Функции сервиса
const FEATURES = [
  'Image', 'Video', 'Keyframes', 'Analyze', 'Brainstorm', 'Inpaint', 'Outpaint'
];

// Данные галереи из Figma - точное соответствие макету
const GALLERY_DATA = {
  col1: [
    { id: '1-1', height: 340, image: '/landing/gallery-1.png', model: 'recraft-v3', prompt: 'A WHITE LINEN-COVERED BED FLOATING ON A CALM LAKE, WRINKLED SHEETS AND TWO PILLOWS, SHADOW OF A TREE PARTIALLY OVER IT, PEACEFUL MOUNTAIN BACKDROP, AMBIENT SUNLIGHT ON FOLDS OF FABRIC, PHOTOGRAPHED WITH SONY A7R V, CONCEPTUAL EDITORIAL' },
    { id: '1-2', height: 260, image: '/landing/gallery-2.png', model: 'Nano Banana', prompt: 'Flat lay of eco-friendly yoga gear, including mat, blocks, and straps, styled aesthetically' },
    { id: '1-3', height: 340, image: '/landing/gallery-3.png', model: 'stable-diffusion-3.5-large', prompt: 'A realistic photo of a full-size transparent inflatable car standing in the middle of a wild grassy field during golden hour, soft warm sunlight, long shadows, gentle breeze moving the grass, surreal and poetic atmosphere, high detail and natural colors.' },
    { id: '1-4', height: 140, image: '/landing/gallery-4.png', model: 'flux-2-pro', prompt: 'volumetric 3D model toy Bear. Add subtle lighting, soft shadows, and a clean modern aesthetic to enhance the stylized look. Keep the playful charm but elevate it with polished 3D rendering.' },
  ],
  col2: [
    { id: '2-1', height: 140, image: '/landing/gallery-5.png', model: 'flux-2-pro', prompt: 'an instagram post of a beautiful flower shop inside a train, with a grass floor and roses everywhere. the image is made to look realistic, with green plants added around the scene' },
    { id: '2-2', height: 140, image: '/landing/gallery-6.png', model: 'Nano Banana', prompt: 'In the style of Guy Bourdin, create an image of frozen strawberry encased in an ice cube, on a light blue background, with cinematic lighting and pastel tones, hyperrealistic photograph.' },
    { id: '2-3', height: 260, image: '/landing/gallery-7-new.png', model: 'stable-diffusion-3.5-large', prompt: '3D avatar of a girl, with a happy face on a white background. Conceptual playlist style digital art with Pixar quality aesthetics --v 6.1 --stylize 250' },
    { id: '2-4', height: 340, image: '/landing/gallery-8.png', model: 'ideogram-v3-turbo', prompt: 'A color film-inspired portrait of a young man looking to the side with a shallow depth of field that blurs the surrounding elements, drawing attention to his eye. The fine grain and cast suggest a high ISO film stock, while the wide aperture lens creates a motion blur effect, enhancing the candid and natural documentary style.' },
    { id: '2-5', height: 260, image: '/landing/gallery-9.png', model: 'flux-2-pro', prompt: 'Create an image of an owl drawn with watercolor paint' },
  ],
  col3: [
    { id: '3-1', height: 340, image: '/landing/gallery-10.png', model: 'Nano Banana', prompt: 'A high-detail realistic shot of two wingsuit flyers soaring down a massive mountain valley, wearing bright red wingsuits, dramatic aerial perspective, huge cliffs and a winding blue river below, crisp lighting, intense sense of speed and freedom.' },
    { id: '3-2', height: 340, image: '/landing/gallery-11.png', model: 'imagen-4', prompt: 'Surreal minimalist portrait of a professional female cyclist with black hair and freckles, she is facing the camera. She wears aerodynamic running sport glasses, their lenses vividly reflecting a mountain landscape. Set beneath a crystal-clear blue sky, the scene is bathed in soft natural lighting. Dominant color palette of rich blue and vibrant orange. Clean composition, high detail, cinematic atmosphere' },
    { id: '3-3', height: 260, image: '/landing/gallery-12.png', model: 'Nano Banana', prompt: 'a heavy, low-cut crystal tumbler with a dark plum-toned negroni, placed perfectly aligned with the edge of a rough slate surface, its symmetry disrupted by a single sharp diagonal shadow cast from a narrow beam angled from the side' },
    { id: '3-4', height: 140, image: '/landing/gallery-13.png', model: 'recraft-v3', prompt: 'Fashion film still, model on Milan runway in shimmering barbie pink shearling coat, icy wind blowing fur, slow-motion stride, sequin mini dress underneath, disco ball reflections on floor, retro glam lens flare, 35mm cinematic grain, 1970s Vogue aesthetic' },
  ],
  col4: [
    { id: '4-1', height: 140, image: '/landing/gallery-14.png', model: 'Nano Banana', prompt: 'Realistic abstract organic sculpture levitating mid-air - soft green moss, translucent quartz crystals, dew droplets, pastel wildflowers, clean white background, zen balance, minimalistic, soft ambient light, hyper-detailed textures, natural shadows.' },
    { id: '4-2', height: 260, image: '/landing/gallery-15.png', model: 'recraft-v3', prompt: 'A fantasy dwarven city carved into the walls of a glowing crystal cavern' },
    { id: '4-3', height: 140, image: '/landing/gallery-16.png', model: 'flux-2-pro', prompt: 'A PERSON INSIDE A TRANSPARENT CUBE PLACED AT THE BASE OF A GIANT WATERFALL, MIST COVERING THE SURROUNDINGS, RAINBOW APPEARING THROUGH THE SPRAY. CINEMATIC TENSION BETWEEN FRAGILITY AND POWER' },
    { id: '4-4', height: 340, image: '/landing/gallery-17.png', model: 'Nano Banana', prompt: 'A hyper-stylized fashion photo of a popular celebrity suspended mid-air against a studio wall, held in place by wide strips of silver duct tape arranged in dynamic star-shaped patterns. Her hair is blown upward by large industrial yellow fans on the floor, creating a dramatic windswept effect.' },
    { id: '4-5', height: 340, image: '/landing/gallery-18.png', model: 'flux-2-pro', prompt: 'A matte glass skincare bottle with wooden cap placed on a bed of deep green moss. Shot top-down with soft natural light mimicking daylight from a window. The bottle is centered, shadows are diffused, subtle fog effect in the background. Focus on texture: porous moss, smooth frosted glass. Scandinavian eco-luxury product photography aesthetic' },
  ],
  col5: [
    { id: '5-1', height: 140, image: '/landing/gallery-19.png', model: 'recraft-v3', prompt: 'photo of ripe apricot slices, top view, only apricot slices are visible, filling the entire vertical frame, vibrant realistic textures, sunlit summer mood, bright warm tones' },
    { id: '5-2', height: 260, image: '/landing/gallery-20.png', model: 'Nano Banana', prompt: 'Sun-drenched poolside patio with bold terrazzo tiles and vintage lounge chairs in turquoise and yellow. Shot on Kodachrome film with a Hasselblad 500C, warm golden afternoon sunlight, dramatic lens flare, punchy oversaturated colors with that distinctive 70s yellow-orange cast' },
    { id: '5-3', height: 260, image: '/landing/gallery-2.png', model: 'Nano Banana', prompt: 'Flat lay of eco-friendly yoga gear, including mat, blocks, and straps, styled aesthetically' },
    { id: '5-4', height: 140, image: '/landing/gallery-21.png', model: 'flux-2-pro', prompt: 'a 1996 Lada niva 4x4 car is photographed in a pure white cyclorama studio setting, positioned to show its complete side profile from front back. The rugged off road vehicle\'s distinctive body lines' },
    { id: '5-5', height: 340, image: '/landing/gallery-22.png', model: 'imagen-4-ultra', prompt: 'A dramatic cinematic scene in a dark foggy forest where two hooded figures clash, one unleashing a burst of glowing red energy that lights up the trees, sparks flying, deep shadows, dense atmosphere, high-detail lighting and moody composition.' },
  ],
};

// Карусель моделей
const MODEL_CARDS = [
  { name: 'FLUX 2 Pro', description: 'Генерация и редактирование с поддержкой до 8 референсных изображений.', image: '/landing/gallery-16.png' },
  { name: 'SeeDream 4.5', description: 'ByteDance модель с поддержкой генерации до 4K разрешения.', image: '/landing/gallery-11.png' },
  { name: 'Nano Banana Pro', description: 'Сверхбыстрая генерация изображений за 3-5 секунд.', image: '/landing/gallery-23.png' },
  { name: 'Ideogram V3 Turbo', description: 'Лучшая модель для генерации текста на изображениях.', image: '/landing/gallery-8.png' },
  { name: 'Kling v2.5 Turbo Pro', description: 'Топовая модель для генерации видео высокого качества.', image: '/landing/gallery-17.png' },
  { name: 'Recraft V3', description: 'Создание иллюстраций, иконок и векторной графики.', image: '/landing/gallery-1.png' },
  { name: 'Veo 3.1 Fast', description: 'Google модель для быстрой генерации видео.', image: '/landing/gallery-22.png' },
  { name: 'Runway Gen4 Turbo', description: 'Профессиональная генерация видео с контролем камеры.', image: '/landing/gallery-18.png' },
  { name: 'Imagen 4 Ultra', description: 'Кинематографичные сцены, фотореализм и отличный текстурный контроль.', image: '/landing/gallery-22.png' },
  { name: 'SD 3.5 Large', description: 'Сбалансированная универсальная модель для реалистичных изображений.', image: '/landing/gallery-3.png' },
];

export function LandingPage() {
  const router = useRouter();
  const { email } = useUser();
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselInitialItemRef = useRef<HTMLDivElement>(null);
  const [showCarouselArrows, setShowCarouselArrows] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  
  const isLoggedIn = !!email;

  // Show toast on copy
  const handleShowCopyToast = () => {
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 1500);
  };

  // Minimal fade-in on scroll (opacity only; no heavy effects)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-fade-reveal]'));
    if (els.length === 0) return;

    // Immediately show elements that are already in/near viewport (avoid "blank" on load)
    const initialThreshold = window.innerHeight * 0.9;
    for (const el of els) {
      if (el.getBoundingClientRect().top < initialThreshold) {
        el.classList.add('fade-in');
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const toShow: HTMLElement[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          toShow.push(entry.target as HTMLElement);
        }
        if (toShow.length === 0) return;
        requestAnimationFrame(() => {
          for (const el of toShow) {
            el.classList.add('fade-in');
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px 10% 0px' }
    );

    for (const el of els) {
      if (!el.classList.contains('fade-in')) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const handleStartClick = () => {
    router.push('/login');
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 848; // card width + gap
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Infinite loop behavior for the big model carousel (with arrows)
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    // Start in the middle copy so left side is never empty
    // IMPORTANT: don't use scrollIntoView here — it can scroll the whole page vertically on load.
    requestAnimationFrame(() => {
      const target = carouselInitialItemRef.current;
      if (!target) return;
      const left = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2;
      el.scrollLeft = Math.max(0, left);
    });

    const onScroll = () => {
      // We render 3 copies of the same list, so we can jump back to the middle seamlessly.
      const oneSetWidth = el.scrollWidth / 3;
      if (!Number.isFinite(oneSetWidth) || oneSetWidth <= 0) return;

      // Keep scroll position within the middle band to simulate infinity
      if (el.scrollLeft < oneSetWidth * 0.5) {
        el.scrollLeft += oneSetWidth;
      } else if (el.scrollLeft > oneSetWidth * 1.5) {
        el.scrollLeft -= oneSetWidth;
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Copy Toast */}
      <div 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 bg-[#1A1A1A] rounded-2xl transition-all duration-300 ${
          showCopyToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{ boxShadow: '0px 4px 32px rgba(0, 0, 0, 0.8)', width: '300px' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM6.4 12L2.4 8L3.528 6.872L6.4 9.736L12.472 3.664L13.6 4.8L6.4 12Z" fill="white"/>
        </svg>
        <span className="font-inter font-normal text-sm text-white">Промпт скопирован</span>
      </div>

      {/* Header / Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505] px-4 md:px-8 py-3">
        <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5">
            <Image 
              src="/baseCRLogo.svg" 
              alt="BASE" 
              width={120} 
              height={26}
              priority
              className="h-[26px] w-auto"
            />
          </Link>

          {/* Auth Button / Avatar */}
          {isLoggedIn ? (
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-[#FCED44] flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <User className="w-5 h-5 text-[#050505]" />
            </Link>
          ) : (
            <button
              onClick={handleStartClick}
              className="bg-[#FCED44] text-[#050505] font-inter font-medium text-sm px-5 py-2 rounded-2xl tracking-[-0.28px] hover:opacity-90 transition-opacity"
            >
              Войти
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-[142px] px-4 md:px-[164px] min-h-[800px] lg:min-h-[700px]">
        <div className="flex flex-col lg:flex-row gap-8 relative">
          {/* Left - Text Content */}
          <div className="w-full lg:w-[660px] flex flex-col gap-10 shrink-0 relative z-10">
            <div className="flex flex-col gap-[15px]">
              <h1 className="font-alumni-sans font-bold text-[48px] md:text-[88px] leading-[0.9] uppercase tracking-[-0.88px]">
                Создавайте креативы за минуты
              </h1>
              <p className="text-[#BDBDBD] text-base md:text-[20px] leading-[28px] tracking-[-0.2px]">
                Все лучшие генеративные модели в одном месте. Создавайте изображения, видео, редактируйте и анализируйте — без подписок и лимитов.
              </p>
            </div>
            <button
              onClick={handleStartClick}
              className="w-fit bg-[#FCED44] text-[#050505] font-inter font-medium text-[20px] px-10 py-4 rounded-full tracking-[-0.4px] hover:opacity-90 transition-opacity"
            >
              Начать работу
            </button>
          </div>

          {/* Right - Image Grid - positioned like Figma */}
          <div className="hidden lg:flex gap-2 items-end absolute right-0 top-0">
            {/* Column 1 - Single square */}
            <div className="flex flex-col justify-end">
              <div className="w-[260px] h-[260px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-23.png" alt="" width={260} height={260} className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Column 2 - Tall + short */}
            <div className="flex flex-col gap-2 justify-end">
              <div className="w-[260px] h-[260px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-11.png" alt="" width={260} height={260} className="w-full h-full object-cover" />
              </div>
              <div className="w-[260px] h-[140px] rounded-[32px] overflow-hidden">
                <Image src="/landing/hero-2.png" alt="" width={260} height={140} className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Column 3 - Very tall + square */}
            <div className="flex flex-col gap-2 justify-end">
              <div className="w-[260px] h-[362px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-1.png" alt="" width={260} height={362} className="w-full h-full object-cover" />
              </div>
              <div className="w-[260px] h-[260px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-3.png" alt="" width={260} height={260} className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Column 4 - Short + square + short + short */}
            <div className="flex flex-col gap-2 justify-end">
              <div className="w-[260px] h-[140px] rounded-[32px] overflow-hidden">
                <Image src="/landing/hero-5.png" alt="" width={260} height={140} className="w-full h-full object-cover" />
              </div>
              <div className="w-[260px] h-[260px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-2.png" alt="" width={260} height={260} className="w-full h-full object-cover" />
              </div>
              <div className="w-[260px] h-[140px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-18.png" alt="" width={260} height={140} className="w-full h-full object-cover" />
              </div>
              <div className="w-[260px] h-[140px] rounded-[32px] overflow-hidden">
                <Image src="/landing/gallery-19.png" alt="" width={260} height={140} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section data-fade-reveal className="fade-reveal relative mt-[180px] pt-[180px]">
        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-0 mb-14">
          <div className="flex flex-col gap-[15px] max-w-[584px]">
            <h2 className="font-alumni-sans font-bold text-[36px] md:text-[52px] leading-[1] uppercase tracking-[-0.52px]">
              Более 50 топовых моделей<br />в одном инструменте
            </h2>
            <p className="text-[#BDBDBD] text-base md:text-[20px] leading-[28px] tracking-[-0.2px] max-w-[600px]">
              Используйте лучшие модели для генерации изображений и видео. От Flux до Kling — всё в одном месте.
            </p>
          </div>
        </div>

        {/* Models Marquee - Full Width */}
        <div className="relative overflow-hidden">
          {/* Gradient Left */}
          <div className="absolute left-0 top-0 bottom-0 w-[240px] bg-gradient-to-r from-[#050505] to-transparent z-10" />
          {/* Gradient Right */}
          <div className="absolute right-0 top-0 bottom-0 w-[240px] bg-gradient-to-l from-[#050505] to-transparent z-10" />
          
          {/* Animated Marquee */}
          <div className="flex animate-marquee whitespace-nowrap py-4">
            {[...MODELS_LIST, ...MODELS_LIST, ...MODELS_LIST, ...MODELS_LIST].map((model, index) => (
              <span
                key={index}
                className="font-alumni-sans font-bold text-[20px] md:text-[28px] text-[#ACABAB] px-6 py-5 whitespace-nowrap"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section data-fade-reveal className="fade-reveal mt-[180px] max-w-[1400px] mx-auto px-4 md:px-0">
        <div className="bg-[#101010] rounded-[32px] overflow-hidden flex flex-col lg:flex-row">
          {/* Left - Content */}
          <div className="flex flex-col justify-center gap-12 p-8 md:p-12 lg:p-16 lg:w-1/2">
            {/* Header */}
            <div className="flex flex-col gap-[15px]">
              <h2 className="font-alumni-sans font-bold text-[36px] md:text-[52px] leading-[1] uppercase tracking-[-0.52px]">
                Как это работает
              </h2>
              <p className="text-[#717171] text-base md:text-[20px] leading-[1.4] tracking-[-0.2px] max-w-[600px]">
                Всего три шага — и у вас готовый креатив. Никаких сложных настроек: только действие, модель и результат.
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-6">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <Image src="/landing/step-1.svg" alt="1" width={32} height={32} className="shrink-0 mt-1" />
                <div className="flex flex-col gap-2">
                  <h3 className="font-alumni-sans font-bold text-[28px] md:text-[32px] uppercase leading-[1] tracking-[-0.32px]">
                    Выберите действие
                  </h3>
                  <p className="text-[#ACABAB] text-sm leading-[1.43]">
                    Создать, редактировать, апскейл, удаление фона, анализ — переключайтесь между задачами за секунду.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <Image src="/landing/step-2.svg" alt="2" width={32} height={32} className="shrink-0 mt-1" />
                <div className="flex flex-col gap-2">
                  <h3 className="font-alumni-sans font-bold text-[28px] md:text-[32px] uppercase leading-[1] tracking-[-0.32px]">
                    Подберите модель
                  </h3>
                  <p className="text-[#ACABAB] text-sm leading-[1.43]">
                    Для текста на изображении, фотореализма, стилизации или видео — выбирайте оптимальную модель под задачу.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <Image src="/landing/step-3.svg" alt="3" width={32} height={32} className="shrink-0 mt-1" />
                <div className="flex flex-col gap-2">
                  <h3 className="font-alumni-sans font-bold text-[28px] md:text-[32px] uppercase leading-[1] tracking-[-0.32px]">
                    Получите результат
                  </h3>
                  <p className="text-[#ACABAB] text-sm leading-[1.43]">
                    Запускайте генерацию, следите за статусом в реальном времени и скачивайте готовый результат в один клик.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Image */}
          <div className="hidden lg:flex lg:w-1/2 p-4">
            <div className="relative w-full h-full min-h-[400px] rounded-3xl overflow-hidden">
              <Image 
                src="/landing/how-it-works-bg.png" 
                alt="" 
                fill 
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section - "Никаких стоковых медиа" */}
      <section data-fade-reveal className="fade-reveal mt-[180px] max-w-[1400px] mx-auto px-4 md:px-0">
        {/* Header */}
        <div className="flex flex-col gap-[15px] mb-14">
          <h2 className="font-alumni-sans font-bold text-[36px] md:text-[52px] leading-[1] uppercase tracking-[-0.52px] max-w-[584px]">
            Никаких стоковых медиа
          </h2>
          <p className="text-[#BDBDBD] text-base md:text-[20px] leading-[28px] tracking-[-0.2px] max-w-[600px]">
            Генерируйте уникальный контент под любые задачи. Полный контроль над результатом.
          </p>
        </div>

        {/* Cards - Figma exact layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Card 1 - Простой интерфейс (large, spans full height) */}
          <div className="flex-1 border-4 border-[#212121] rounded-[32px] p-1 flex flex-col">
            {/* Header with blur effect */}
            <div className="p-6 flex flex-col gap-3.5 backdrop-blur-[20px] rounded-2xl">
              <h3 className="font-alumni-sans font-bold text-[32px] uppercase leading-[1.125] tracking-[-0.32px]">
                Простой интерфейс
              </h3>
              <div className="flex gap-4 items-start">
                <Image 
                  src="/landing/interface-icon.svg" 
                  alt="" 
                  width={56} 
                  height={56} 
                  className="shrink-0"
                />
                <p className="text-[#BDBDBD] text-base leading-6 tracking-[-0.16px]">
                  Интуитивный дизайн без сложных настроек. У каждой модели свой набор параметров – внимательно ознакомьтесь с ними перед генерацией.
                </p>
              </div>
            </div>
            {/* App UI Preview */}
            <div className="flex-1 bg-[#101010] rounded-t-2xl mt-2 p-3 min-h-[300px]">
              <div className="bg-[#101010] rounded-xl h-full border border-[#2a2a2a] overflow-hidden">
                {/* Mini header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
                  <div className="flex gap-1">
                    {['Image', 'Video', 'Keyframes', 'Analyze'].map((tab, i) => (
                      <span key={tab} className={`text-[8px] px-2 py-1 rounded ${i === 0 ? 'bg-[#1f1f1f] text-white' : 'text-[#666]'}`}>
                        {tab}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[8px] text-[#666]">История</span>
                    <div className="w-4 h-4 rounded-full bg-[#FCED44]" />
                  </div>
                </div>
                {/* Mini content */}
                <div className="flex h-[calc(100%-32px)]">
                  <div className="w-1/2 p-2 border-r border-[#2a2a2a]">
                    <div className="text-[7px] text-[#666] mb-1">Input</div>
                    <div className="space-y-1">
                      <div className="bg-[#1a1a1a] rounded h-6" />
                      <div className="bg-[#1a1a1a] rounded h-4" />
                      <div className="bg-[#1a1a1a] rounded h-12" />
                    </div>
                  </div>
                  <div className="w-1/2 p-2">
                    <div className="text-[7px] text-[#666] mb-1">Output</div>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-[#1a1a1a] rounded aspect-square" />
                      <div className="bg-[#1a1a1a] rounded aspect-square" />
                      <div className="bg-[#1a1a1a] rounded aspect-square" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - 2 cards stacked */}
          <div className="flex flex-col gap-4 lg:w-[400px]">
            {/* Card 2 - Множество функций */}
            <div className="border-4 border-[#212121] rounded-[32px] p-1 flex flex-col">
              <div className="p-6 flex flex-col gap-3">
                <h3 className="font-alumni-sans font-bold text-[32px] uppercase leading-[1.125] tracking-[-0.32px]">
                  Множество функций
                </h3>
                <p className="text-[#BDBDBD] text-base leading-6 tracking-[-0.16px]">
                  Генерация, редактирование, апскейл и удаление фона — всё в одном интерфейсе
                </p>
              </div>
              {/* Action tags */}
              <div className="px-6 pb-6 flex flex-wrap gap-2">
                {FEATURES.map((action) => (
                  <span
                    key={action}
                    className="border border-[#363636] rounded-full px-4 py-2 font-inter font-medium text-sm uppercase tracking-[-0.14px]"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>

            {/* Card 3 - Быстрый результат */}
            <div className="border-4 border-[#212121] rounded-[32px] p-1 flex flex-col flex-1">
              <div className="p-6 flex flex-col gap-3 flex-1">
                <h3 className="font-alumni-sans font-bold text-[32px] uppercase leading-[1.125] tracking-[-0.32px]">
                  Быстрый результат
                </h3>
                <p className="text-[#BDBDBD] text-base leading-6 tracking-[-0.16px]">
                  Генерация за секунды. Следите за прогрессом в реальном времени.
                </p>
              </div>
              <div className="px-6 pb-6">
                <p className="text-[#666] text-xs leading-4">
                  Возможны сбои на стороне моделей.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section - "Примеры с промптами" */}
      <div data-fade-reveal className="fade-reveal">
        <ExamplesSection onStartClick={handleStartClick} onCopy={handleShowCopyToast} />
      </div>

      {/* Model Cards Carousel */}
      <section 
        data-fade-reveal
        className="fade-reveal mt-[180px] relative"
        onMouseEnter={() => setShowCarouselArrows(true)}
        onMouseLeave={() => setShowCarouselArrows(false)}
      >
        {/* Gradient Left */}
        <div className="absolute left-0 top-0 bottom-0 w-[240px] bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        {/* Gradient Right */}
        <div className="absolute right-0 top-0 bottom-0 w-[240px] bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

        {/* Left Arrow */}
        <button
          onClick={() => scrollCarousel('left')}
          className={`absolute left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all ${showCarouselArrows ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scrollCarousel('right')}
          className={`absolute right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all ${showCarouselArrows ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div 
          ref={carouselRef}
          className="flex gap-12 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollPaddingLeft: 'calc(50% - 400px)', scrollPaddingRight: 'calc(50% - 400px)' }}
        >
          {[...MODEL_CARDS, ...MODEL_CARDS, ...MODEL_CARDS].map((card, index) => (
            <div 
              key={index}
              className="bg-[#121212] rounded-[56px] p-10 flex gap-10 items-center w-[800px] h-[400px] shrink-0 snap-center"
              ref={index === MODEL_CARDS.length ? carouselInitialItemRef : undefined}
            >
              <div className="w-[240px] h-[320px] rounded-[20px] shadow-[0px_16px_32px_rgba(0,0,0,0.25)] shrink-0 relative overflow-hidden">
                <Image 
                  src={card.image} 
                  alt={card.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <h3 className="font-alumni-sans font-bold text-[40px] uppercase leading-[1] tracking-[-0.4px]">
                    {card.name}
                  </h3>
                  <p className="text-[20px] leading-[28px] tracking-[-0.2px]">
                    {card.description}
                  </p>
                </div>
                <button className="w-fit bg-[#3d3d3d] text-white font-inter font-semibold text-sm px-6 py-3 rounded-full tracking-[-0.28px] hover:bg-[#4d4d4d] transition-colors">
                  Попробовать
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section data-fade-reveal className="fade-reveal mt-[180px] flex flex-col items-center px-4">
        {/* Title */}
        <h2 className="font-alumni-sans font-bold text-[36px] md:text-[52px] leading-[1] uppercase tracking-[-0.52px] text-center mb-10">
          Частые вопросы (FAQ)
        </h2>

        {/* FAQ Categories */}
        <div className="flex flex-col gap-6 w-full max-w-[720px]">
          {/* Category: Виды моделей */}
          <div className="flex flex-col gap-4">
            <h3 className="font-alumni-sans font-bold text-[28px] leading-[1.14] uppercase tracking-[-0.28px] text-[#909090]">
              Виды моделей
            </h3>
            <div className="flex flex-col">
              {[
                {
                  q: 'Какие модели доступны в сервисе?',
                  a: 'Более 50 топовых моделей для генерации изображений и видео: FLUX 2 Pro, SeeDream, Nano Banana, Ideogram, Kling, Recraft и другие. Мы регулярно добавляем новые.',
                },
                {
                  q: 'Как выбрать подходящую модель?',
                  a: 'Выбирайте по задаче: для текста на изображении — Ideogram, для фотореализма — FLUX или Imagen, для стилизации — Recraft, для видео — Kling или Veo.',
                },
                {
                  q: 'Какое максимальное разрешение?',
                  a: 'Зависит от модели. Некоторые поддерживают до 4K, другие — стандартные размеры. Параметры отображаются в интерфейсе при выборе модели.',
                },
              ].map((item, idx, arr) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} isLast={idx === arr.length - 1} />
              ))}
            </div>
          </div>

          {/* Category: Действия */}
          <div className="flex flex-col gap-4">
            <h3 className="font-alumni-sans font-bold text-[28px] leading-[1.14] uppercase tracking-[-0.28px] text-[#909090]">
              Действия
            </h3>
            <div className="flex flex-col">
              {[
                {
                  q: 'Что можно делать с изображениями?',
                  a: 'Генерировать с нуля, редактировать (inpaint/outpaint), улучшать качество (апскейл), удалять фон, анализировать содержимое и генерировать видео.',
                },
                {
                  q: 'Можно ли копировать промпты из примеров?',
                  a: 'Да. В галерее примеров на каждой карточке есть кнопка копирования — промпт сразу попадает в буфер обмена.',
                },
                {
                  q: 'Как быстро появляются результаты?',
                  a: 'От нескольких секунд до пары минут — зависит от модели и сложности. Статус обновляется в реальном времени.',
                },
              ].map((item, idx, arr) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} isLast={idx === arr.length - 1} />
              ))}
            </div>
          </div>

          {/* Category: Общие */}
          <div className="flex flex-col gap-4">
            <h3 className="font-alumni-sans font-bold text-[28px] leading-[1.14] uppercase tracking-[-0.28px] text-[#909090]">
              Общие
            </h3>
            <div className="flex flex-col">
              {[
                {
                  q: 'Можно ли использовать результаты коммерчески?',
                  a: 'В большинстве случаев да, но условия зависят от конкретной модели. Рекомендуем проверять лицензию выбранной модели.',
                },
                {
                  q: 'Что с приватностью моих данных?',
                  a: 'Ваши генерации доступны только вам. Мы не публикуем материалы пользователей и не используем их для обучения моделей.',
                },
              ].map((item, idx, arr) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} isLast={idx === arr.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section data-fade-reveal className="fade-reveal mt-[180px] relative">
        {/* Gradient Left */}
        <div className="absolute left-0 top-0 bottom-0 w-[240px] bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        {/* Gradient Right */}
        <div className="absolute right-0 top-0 bottom-0 w-[240px] bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

        {/* Text */}
        <div className="max-w-[660px] mx-auto text-center flex flex-col gap-10 items-center px-4">
          <div className="flex flex-col gap-3">
            <h2 className="font-alumni-sans font-bold text-[56px] md:text-[88px] leading-[0.9] uppercase tracking-[-0.88px]">
              готовы начать?
            </h2>
            <p className="text-[20px] leading-[28px] tracking-[-0.2px]">
              Зарегистрируйтесь бесплатно и начните создавать уникальный контент с помощью ИИ
            </p>
          </div>
          <button
            onClick={handleStartClick}
            className="bg-[#FCED44] text-[#050505] font-inter font-medium text-[20px] px-10 py-4 rounded-full tracking-[-0.4px] hover:opacity-90 transition-opacity"
          >
            Начать работу
          </button>
        </div>

        {/* Infinite Marquee Cards */}
        <div className="mt-16 overflow-hidden py-8">
          <div className="flex animate-marquee-cta" style={{ width: 'max-content' }}>
            {/* Triple set for seamless infinite loop */}
            {[0, 1, 2].map(setIndex => (
              [
                { model: 'FLUX 2 Pro', image: '/landing/gallery-10.png' },
                { model: 'Ideogram V3', image: '/landing/gallery-8.png' },
                { model: 'SeeDream 4.5', image: '/landing/gallery-11.png' },
                { model: 'Recraft V3', image: '/landing/gallery-1.png' },
                { model: 'Kling v2.5', image: '/landing/gallery-17.png' },
                { model: 'Nano Banana Pro', image: '/landing/gallery-23.png' },
                { model: 'MiniMax', image: '/landing/gallery-20.png' },
                { model: 'Veo 3.1', image: '/landing/gallery-22.png' },
                { model: 'Runway Gen4', image: '/landing/gallery-18.png' },
                { model: 'Hailuo 2.3', image: '/landing/gallery-12.png' },
              ].map((item, i) => (
                <div
                  key={`${setIndex}-${i}`}
                  className="shrink-0 mx-[-10px]"
                  style={{ transform: `rotate(${i % 2 === 0 ? 5 : -2}deg)` }}
                >
                  <div className="w-[224px] h-[224px] rounded-[20px] border-4 border-[#050505] p-3 flex flex-col justify-end overflow-hidden relative">
                    <Image 
                      src={item.image} 
                      alt={item.model}
                      fill
                      className="object-cover -z-10"
                    />
                    <div className="bg-[#050505] px-2.5 py-1.5 rounded-full w-fit flex items-center justify-center">
                      <span className="font-inter font-medium text-[10px] uppercase tracking-[-0.2px] leading-none">{item.model}</span>
                    </div>
                  </div>
                </div>
              ))
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer data-fade-reveal className="fade-reveal mt-[180px] pb-16 px-4 md:px-[164px]">
        <div className="max-w-[1400px] mx-auto">
          {/* Large Logo - using actual logo scaled up */}
          <div className="flex items-center justify-center mb-[170px]">
            <Image 
              src="/baseCRLogo.svg" 
              alt="BASECRAFT" 
              width={1080} 
              height={224}
              className="h-[120px] md:h-[224px] w-auto"
            />
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            <p className="font-inter text-xs text-white/40">
              © 2025 — BASECRAFT!
            </p>
            <div className="flex gap-8">
              <Link href="#" className="font-inter text-xs text-white/40 hover:text-white/60 transition-colors">
                Политики
              </Link>
              <Link href="#" className="font-inter text-xs text-white/40 hover:text-white/60 transition-colors">
                Правила
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Examples Section with hover interactions
function ExamplesSection({ onStartClick, onCopy }: { onStartClick: () => void; onCopy: () => void }) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="mt-[180px] max-w-[1400px] mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-[15px] mb-14">
        <h2 className="font-alumni-sans font-bold text-[36px] md:text-[52px] leading-[1] uppercase tracking-[-0.52px] max-w-[584px]">
          Примеры с промптами
        </h2>
        <p className="text-[#BDBDBD] text-base md:text-[20px] leading-[28px] tracking-[-0.2px] max-w-[600px]">
          Смотрите, что создают пользователи. Вдохновляйтесь и экспериментируйте.
        </p>
      </div>

      {/* Gallery Grid - 5 columns, align top, gap 8px */}
      <div className="relative">
        <div className="flex gap-2">
          {/* Column 1 */}
          <div className="flex-1 flex flex-col gap-2 items-start">
            {GALLERY_DATA.col1.map(card => (
              <GalleryCard 
                key={card.id}
                {...card}
                isHovered={hoveredCard === card.id}
                isAnyHovered={hoveredCard !== null}
                onHover={() => setHoveredCard(card.id)}
                onLeave={() => setHoveredCard(null)}
                onCopy={onCopy}
              />
            ))}
          </div>
          {/* Column 2 */}
          <div className="flex-1 flex flex-col gap-2 items-start">
            {GALLERY_DATA.col2.map(card => (
              <GalleryCard 
                key={card.id}
                {...card}
                isHovered={hoveredCard === card.id}
                isAnyHovered={hoveredCard !== null}
                onHover={() => setHoveredCard(card.id)}
                onLeave={() => setHoveredCard(null)}
                onCopy={onCopy}
              />
            ))}
          </div>
          {/* Column 3 */}
          <div className="flex-1 flex flex-col gap-2 items-start">
            {GALLERY_DATA.col3.map(card => (
              <GalleryCard 
                key={card.id}
                {...card}
                isHovered={hoveredCard === card.id}
                isAnyHovered={hoveredCard !== null}
                onHover={() => setHoveredCard(card.id)}
                onLeave={() => setHoveredCard(null)}
                onCopy={onCopy}
              />
            ))}
          </div>
          {/* Column 4 */}
          <div className="hidden md:flex flex-1 flex-col gap-2 items-start">
            {GALLERY_DATA.col4.map(card => (
              <GalleryCard 
                key={card.id}
                {...card}
                isHovered={hoveredCard === card.id}
                isAnyHovered={hoveredCard !== null}
                onHover={() => setHoveredCard(card.id)}
                onLeave={() => setHoveredCard(null)}
                onCopy={onCopy}
              />
            ))}
          </div>
          {/* Column 5 */}
          <div className="hidden md:flex flex-1 flex-col gap-2 items-start">
            {GALLERY_DATA.col5.map(card => (
              <GalleryCard 
                key={card.id}
                {...card}
                isHovered={hoveredCard === card.id}
                isAnyHovered={hoveredCard !== null}
                onHover={() => setHoveredCard(card.id)}
                onLeave={() => setHoveredCard(null)}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>

        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
      </div>

      {/* Button below cards */}
      <div className="flex justify-center mt-10">
        <button
          onClick={onStartClick}
          className="bg-[#FCED44] text-[#050505] font-inter font-medium text-[20px] px-10 py-4 rounded-full tracking-[-0.4px] hover:opacity-90 transition-opacity"
        >
          Начать работу
        </button>
      </div>
    </section>
  );
}

// Gallery Card Component with hover
interface GalleryCardProps {
  id: string;
  height: number;
  image: string;
  model: string;
  prompt: string;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onCopy: () => void;
}

function GalleryCard({ height, image, model, prompt, isHovered, isAnyHovered, onHover, onLeave, onCopy }: GalleryCardProps) {
  const copyPrompt = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
        copied = true;
      }
    } catch {
      // Fall back below
    }

    // Fallback for environments where Clipboard API is unavailable/blocked
    if (!copied) {
      try {
        const el = document.createElement('textarea');
        el.value = prompt;
        el.setAttribute('readonly', 'true');
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        copied = true;
      } catch {
        // noop
      }
    }

    if (copied) {
      onCopy();
    }
  };

  return (
    <div 
      className={`w-full rounded-[20px] bg-[#1a1a1a] relative overflow-hidden cursor-pointer transition-all duration-300 ease-out ${
        isHovered 
          ? 'scale-110 shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-20' 
          : isAnyHovered 
            ? 'opacity-60' 
            : ''
      }`}
      style={{ height }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Background Image */}
      <Image 
        src={image} 
        alt={prompt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 33vw, 20vw"
      />
      
      {/* Hover overlay with model and prompt */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          type="button"
          aria-label="Скопировать промпт"
          title="Скопировать промпт"
          onClick={copyPrompt}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 flex items-center justify-center transition-colors"
        >
          <Copy className="w-4 h-4 text-white/90" />
        </button>
        <div className="bg-[#050505] px-2 py-1 rounded-full w-fit mb-2 flex items-center justify-center">
          <span className="font-inter font-medium text-[8px] uppercase tracking-[-0.16px] leading-none">{model}</span>
        </div>
        <p className="font-inter text-[10px] leading-[13px] line-clamp-4 lowercase">
          {prompt}
        </p>
      </div>
    </div>
  );
}

// FAQ Item Component - matches Figma design exactly
interface FaqItemProps {
  question: string;
  answer: string;
  isLast?: boolean;
}

function FaqItem({ question, answer, isLast = false }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${!isLast ? 'border-b border-[#282726]' : ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2.5 py-4 text-left"
      >
        <span className="font-inter font-medium text-base leading-[1.5] text-white">
          {question}
        </span>
        <span className={`w-6 h-6 flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-0' : ''}`}>
          {isOpen ? (
            <svg width="14" height="2" viewBox="0 0 14 2" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 1V13M1 7H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </span>
      </button>
      <div 
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="font-inter font-normal text-base leading-6 text-[#949391] pb-4">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

