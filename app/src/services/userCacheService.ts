/**
 * Сервис для кеширования информации о пользователях
 * Экономит трафик WebSocket, передавая только ID пользователей
 */

interface CachedUser {
  id: string;
  name: string;
  picture?: string;
  color: string;
  lastSeen: number;
}

class UserCacheService {
  private cache = new Map<string, CachedUser>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 минут
  private readonly USER_COLORS = [
    '#4F46E5', // Индиго
    '#DC2626', // Красный
    '#059669', // Зеленый
    '#D97706', // Оранжевый
    '#7C3AED', // Фиолетовый
    '#DB2777', // Розовый
    '#0891B2', // Голубой
    '#65A30D', // Лайм
    '#DC2626', // Красный
    '#F59E0B' // Желтый
  ];

  /**
   * Получить информацию о пользователе из кеша
   */
  getUser(userId: string): CachedUser | null {
    const user = this.cache.get(userId);
    if (!user) return null;

    // Проверяем TTL
    if (Date.now() - user.lastSeen > this.CACHE_TTL) {
      this.cache.delete(userId);
      return null;
    }

    return user;
  }

  /**
   * Добавить или обновить информацию о пользователе в кеше
   */
  setUser(userId: string, userData: Partial<CachedUser>): void {
    const existingUser = this.cache.get(userId);
    const user: CachedUser = {
      id: userId,
      name: userData.name || existingUser?.name || 'Unknown User',
      picture: userData.picture || existingUser?.picture,
      color: userData.color || existingUser?.color || this.generateUserColor(userId),
      lastSeen: Date.now()
    };

    this.cache.set(userId, user);
  }

  /**
   * Обновить время последнего присутствия пользователя
   */
  updateLastSeen(userId: string): void {
    const user = this.cache.get(userId);
    if (user) {
      user.lastSeen = Date.now();
    }
  }

  /**
   * Генерировать стабильный цвет для пользователя на основе его ID
   */
  private generateUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }
    return this.USER_COLORS[Math.abs(hash) % this.USER_COLORS.length];
  }

  /**
   * Очистить устаревшие записи из кеша
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, user] of this.cache.entries()) {
      if (now - user.lastSeen > this.CACHE_TTL) {
        this.cache.delete(userId);
      }
    }
  }

  /**
   * Получить всех активных пользователей
   */
  getActiveUsers(): CachedUser[] {
    const now = Date.now();
    return Array.from(this.cache.values()).filter((user) => now - user.lastSeen < this.CACHE_TTL);
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    this.cache.clear();
  }
}

export const userCacheService = new UserCacheService();

// Автоматическая очистка кеша каждые 5 минут
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      userCacheService.cleanup();
    },
    5 * 60 * 1000
  );
}
