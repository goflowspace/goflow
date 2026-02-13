import {useEffect, useRef} from 'react';

import {AuthService} from '@services/authService';
import {ampli} from 'src/ampli';

import useUserStore from '@store/useUserStore';

import {isOSS} from '../utils/edition';
import {getApiUrl} from '../utils/environment';

// Add fetch type definition
declare const fetch: typeof globalThis.fetch;

/**
 * Хук для инициализации пользователя при загрузке приложения
 * Проверяет наличие токена в localStorage и загружает данные пользователя
 */
export const useUserInitialization = () => {
  const {setUser, logout} = useUserStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Предотвращаем повторную инициализацию
    if (hasInitialized.current) {
      return;
    }

    // OSS: загружаем default user без токена
    if (isOSS()) {
      const currentUser = useUserStore.getState().user;
      if (!currentUser) {
        hasInitialized.current = true;
        fetch(`${getApiUrl()}/auth/me`)
          .then((response) => {
            if (response.ok) return response.json();
            throw new Error('OSS auth failed');
          })
          .then((data) => {
            setUser(data.user);
          })
          .catch((error) => {
            console.error('Failed to initialize OSS user:', error);
            hasInitialized.current = false;
          });
      }
      return;
    }

    const token = AuthService.getToken();

    if (token) {
      hasInitialized.current = true;
      AuthService.validateToken(token)
        .then((userData) => {
          setUser(userData);
          // Обновляем токен в cookies для middleware
          AuthService.setToken(token);

          const user = useUserStore.getState().user;
          if (user) {
            ampli.identify(user.id, {
              email: user.email
            });
          }
        })
        .catch((error) => {
          console.error('Failed to authenticate user:', error);
          AuthService.removeToken();
          logout();
          hasInitialized.current = false; // Позволяем повторную инициализацию в случае ошибки
        });
    }
  }, [setUser, logout]);
};
