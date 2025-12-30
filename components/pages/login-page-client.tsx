'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';

type AuthMode = 'login' | 'register';

export default function LoginPageClient() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Secret access code for registration
  const REGISTRATION_ACCESS_CODE = 'gfjsGst264!!hDy';

  // Создаём клиент один раз с useMemo
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // Helper function to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), ms)
      )
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Check access code first
        if (accessCode !== REGISTRATION_ACCESS_CODE) {
          setError('Неверный код доступа');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Пароли не совпадают');
          setIsLoading(false);
          return;
        }

        const { error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          }),
          15000, // 15 sec timeout
          'Сервер недоступен. Проверьте подключение или попробуйте VPN.'
        );

        if (error) throw error;
        setEmailSent(true);
      } else {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          15000, // 15 sec timeout
          'Сервер недоступен. Проверьте подключение или попробуйте VPN.'
        );

        if (error) throw error;
        // Hard redirect для полной перезагрузки с новыми данными пользователя
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      console.error('[Login] Error message:', err.message);
      console.error('[Login] Error status:', err.status);
      
      // Улучшенные сообщения об ошибках
      let errorMessage = err.message || 'Произошла ошибка';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Ошибка сети. Попробуйте использовать VPN.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Неверный email или пароль';
      } else if (errorMessage.includes('недоступен') || errorMessage.includes('timeout')) {
        errorMessage = 'Сервер недоступен. Попробуйте позже.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем сообщение об отправке письма
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#101010] flex">
        {/* Left side - Success message */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="w-[364px] flex flex-col gap-7 items-center">
            {/* Logo */}
            <div className="flex flex-col gap-4 items-center w-full">
              <Image
                src="/baseCRLogo.svg"
                alt="BASE"
                width={85}
                height={24}
                priority
              />
              <div className="flex flex-col gap-2 items-center text-center w-full">
                <h1 className="font-inter font-semibold text-[20px] leading-[28px] text-white">
                  Аккаунт создан!
                </h1>
                <p className="font-inter font-medium text-[14px] leading-[24px] text-[#9f9f9f]">
                  Отправили письмо на почту. Перейдите по ссылке для начала работы в сервисе
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <p className="font-inter text-[14px] text-[#656565]">© 2025 BASE</p>
          </div>
        </div>

        {/* Right side - Featured image */}
        <div className="flex-1 p-8 hidden lg:block">
          <div className="relative w-full h-full rounded-3xl overflow-hidden">
            {/* Background image */}
            <Image
              src="/generation-10138132-7a00-46a1-8681-9ce07511f008.png"
              alt="Featured artwork"
              fill
              className="object-cover"
              priority
            />
            
            {/* Card overlay */}
            <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-[477px] backdrop-blur-md bg-[rgba(26,26,26,0.5)] rounded-2xl p-5 flex flex-col gap-4">
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-lg w-fit">
                <span className="font-inter font-medium text-[14px] text-white">Nano Banana Pro</span>
              </div>
              <p className="font-inter text-[12px] leading-[18px] text-white">
                A hyper-realistic cinematic shot of two Formula 1 cars colliding at high speed, captured at the exact moment of impact.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-[364px] flex flex-col gap-7 items-center">
          {/* Logo */}
          <div className="flex flex-col gap-4 items-center w-full">
            <Image
              src="/baseCRLogo.svg"
              alt="BASE"
              width={85}
              height={24}
              priority
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            {/* Tabs */}
            <div className="bg-[#212121] rounded-xl p-1 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 h-[34px] rounded-lg font-inter text-[14px] tracking-[-0.4px] transition-colors ${
                  mode === 'login'
                    ? 'bg-black text-white font-medium'
                    : 'text-[#bebbbb]'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 h-[34px] rounded-lg font-inter text-[14px] tracking-[-0.4px] transition-colors ${
                  mode === 'register'
                    ? 'bg-black text-white font-medium'
                    : 'text-[#bebbbb]'
                }`}
              >
                Регистрация
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-[#212121] rounded-xl px-4 py-3 font-inter font-medium text-[14px] text-white placeholder:text-[#9f9f9f] focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                required
                minLength={6}
                className="w-full bg-[#212121] rounded-xl px-4 py-3 font-inter font-medium text-[14px] text-white placeholder:text-[#9f9f9f] focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              {mode === 'register' && (
                <>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Подтвердите пароль"
                    required
                    minLength={6}
                    className="w-full bg-[#212121] rounded-xl px-4 py-3 font-inter font-medium text-[14px] text-white placeholder:text-[#9f9f9f] focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <input
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Код доступа"
                    required
                    className="w-full bg-[#212121] rounded-xl px-4 py-3 font-inter font-medium text-[14px] text-white placeholder:text-[#9f9f9f] focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                </>
              )}

              {/* Error message */}
              {error && (
                <p className="font-inter text-[14px] text-red-500">{error}</p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#f0f0f5] rounded-xl px-4 py-3 font-inter font-medium text-[16px] text-[#141414] hover:bg-white transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? 'Загрузка...'
                  : mode === 'login'
                  ? 'Войти'
                  : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <p className="font-inter text-[14px] text-[#656565]">© 2025 BASE</p>
        </div>
      </div>

      {/* Right side - Featured image */}
      <div className="flex-1 p-8 hidden lg:block">
        <div className="relative w-full h-full rounded-3xl overflow-hidden">
          {/* Background image */}
          <Image
            src="/generation-10138132-7a00-46a1-8681-9ce07511f008.png"
            alt="Featured artwork"
            fill
            className="object-cover"
            priority
          />
          
          {/* Card overlay */}
          <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-[477px] backdrop-blur-md bg-[rgba(26,26,26,0.5)] rounded-2xl p-5 flex flex-col gap-4">
            <div className="bg-[#1a1a1a] px-4 py-2 rounded-lg w-fit">
              <span className="font-inter font-medium text-[14px] text-white">Nano Banana Pro</span>
            </div>
            <p className="font-inter text-[12px] leading-[18px] text-white">
              A hyper-realistic cinematic shot of two Formula 1 cars colliding at high speed, captured at the exact moment of impact. Carbon fiber pieces and metal fragments are flying through the air, tires lifting slightly, sparks bursting from the contact point.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

