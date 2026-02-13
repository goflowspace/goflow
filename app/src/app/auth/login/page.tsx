'use client';

import {useEffect} from 'react';

import {useRouter, useSearchParams} from 'next/navigation';

import {Button} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {getApiUrl} from '../../../utils/environment';

import styles from './login.module.scss';

const LoginPage = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Проверяем, есть ли уже токен
    const token = localStorage.getItem('auth_token');
    const redirect = searchParams.get('redirect') || '/projects';

    if (token) {
      // Если есть токен, перенаправляем на страницу, откуда пришел пользователь
      router.push(redirect);
    }
  }, [router, searchParams]);

  const handleGoogleLogin = () => {
    // Получаем URL для редиректа из query параметров
    const redirect = searchParams.get('redirect') || '/projects';

    // Формируем URL для Google авторизации с передачей redirect параметра
    const authUrl = new URL(`${getApiUrl()}/auth/google`);
    authUrl.searchParams.set('redirect', redirect);

    // Перенаправляем на Google авторизацию
    window.location.href = authUrl.toString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>{t('auth.login.title', 'Welcome to Go Flow')}</h1>
        <p className={styles.subtitle}>{t('auth.login.subtitle', 'You need to log in to access the editor')}</p>

        <Button size='3' className={styles.googleButton} onClick={handleGoogleLogin}>
          <svg className={styles.googleIcon} viewBox='0 0 24 24'>
            <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
            <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
            <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
            <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
          </svg>
          {t('auth.login.google_login', 'Sign in with Google')}
        </Button>
      </div>
    </div>
  );
};

export default LoginPage;
