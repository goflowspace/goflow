import {getApiUrl} from 'src/utils/environment';

// Add fetch type definition
declare const fetch: typeof globalThis.fetch;

/**
 * Сервис для работы с авторизацией
 */
export class AuthService {
  private static readonly API_BASE_URL = getApiUrl();
  private static readonly AUTH_TOKEN_KEY = 'auth_token';
  private static readonly COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 дней

  /**
   * Получает URL для Google авторизации с редиректом
   */
  static getGoogleAuthUrl(redirectPath?: string): string {
    const authUrl = new URL(`${this.API_BASE_URL}/auth/google`);

    if (redirectPath) {
      authUrl.searchParams.set('redirect', redirectPath);
    }

    return authUrl.toString();
  }

  /**
   * Перенаправляет пользователя на Google авторизацию
   */
  static redirectToGoogleAuth(redirectPath?: string): void {
    const currentPath = redirectPath || window.location.pathname;
    const authUrl = this.getGoogleAuthUrl(currentPath);
    window.location.href = authUrl;
  }

  /**
   * Получает токен из localStorage
   */
  static getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  /**
   * Сохраняет токен в localStorage и cookies
   */
  static setToken(token: string): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    document.cookie = `${this.AUTH_TOKEN_KEY}=${token}; path=/; max-age=${this.COOKIE_MAX_AGE}`;
  }

  /**
   * Удаляет токен из localStorage и cookies
   */
  static removeToken(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    document.cookie = `${this.AUTH_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * Проверяет токен и получает данные пользователя
   */
  static async validateToken(token: string): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Token validation failed');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Выполняет выход пользователя
   */
  static logout(redirectPath?: string): void {
    this.removeToken();

    if (redirectPath) {
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;
      window.location.href = loginUrl;
    }
  }

  /**
   * Получает URL для редиректа после логина
   */
  static getLoginRedirectUrl(currentPath?: string): string {
    const path = currentPath || window.location.pathname;
    return `/auth/login?redirect=${encodeURIComponent(path)}`;
  }
}
