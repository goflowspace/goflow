'use client';

import React, {useEffect, useState} from 'react';

import {usePathname, useRouter} from 'next/navigation';

import useUserStore from '@store/useUserStore';

import {isOSS} from '../../utils/edition';
import {getApiUrl} from '../../utils/environment';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({children, fallback}) => {
  const router = useRouter();
  const pathname = usePathname();
  const {user, isAuthenticated, setUser} = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // OSS: загружаем данные default user с бэкенда без токена
      if (isOSS()) {
        if (!user) {
          try {
            const response = await fetch(`${getApiUrl()}/auth/me`);
            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
            }
          } catch (error) {
            console.error('OSS auth check failed:', error);
          }
        }
        setIsLoading(false);
        return;
      }

      // Cloud: стандартная проверка аутентификации
      // Не выполняем проверку аутентификации на auth страницах
      if (pathname.startsWith('/auth/')) {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('auth_token');

      if (!token) {
        // Перенаправляем на страницу входа с сохранением текущего пути
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!user) {
        try {
          const response = await fetch(`${getApiUrl()}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);

            // Обновляем токен в cookies
            document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
            setIsLoading(false);
          } else {
            // Токен недействителен
            localStorage.removeItem('auth_token');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
            return;
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [user, setUser, router, pathname]);

  // Следим за изменением состояния авторизации (только для Cloud)
  useEffect(() => {
    if (isOSS()) return;

    // Не выполняем redirect на auth страницах
    if (pathname.startsWith('/auth/')) {
      return;
    }

    if (!isLoading && !isAuthenticated) {
      // Если пользователь разлогинился, перенаправляем на страницу входа
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      fallback || (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
          }}
        >
          <p>Loading...</p>
        </div>
      )
    );
  }

  // На auth страницах всегда показываем контент (только Cloud)
  if (!isOSS() && pathname.startsWith('/auth/')) {
    return <>{children}</>;
  }

  // В OSS режиме всегда показываем контент
  if (isOSS()) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
