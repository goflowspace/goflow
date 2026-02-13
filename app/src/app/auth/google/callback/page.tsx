'use client';

import {Suspense, useEffect} from 'react';

import {useRouter, useSearchParams} from 'next/navigation';

// Add fetch type definition
declare const fetch: typeof globalThis.fetch;

// Компонент с логикой авторизации
const AuthCallbackContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // Получаем токены и redirect URL из параметров
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const redirectUrl = searchParams.get('redirect') || '/projects';

      if (accessToken && refreshToken) {
        // Сохраняем access токен
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        // Сохраняем access токен в cookies для middleware
        document.cookie = `auth_token=${accessToken}; path=/; max-age=${15 * 60}`; // 15 минут

        // Перенаправляем на целевую страницу
        router.push(redirectUrl);
      } else {
        // Если нет токенов, перенаправляем на страницу входа
        console.error('No tokens received from OAuth callback');
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
      <p>Processing authentication...</p>
    </div>
  );
};

// Обернутый в Suspense компонент страницы
const AuthCallback = () => {
  return (
    <Suspense
      fallback={
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
          <p>Loading...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
};

export default AuthCallback;
