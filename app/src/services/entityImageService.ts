// Сервис для работы с изображениями сущностей
// Не используем общий api сервис чтобы избежать циклических зависимостей

/**
 * Сервис для работы с изображениями сущностей
 */
export class EntityImageService {
  /**
   * Загрузка изображения для параметра сущности
   */
  static async uploadEntityImage(projectId: string, entityId: string, parameterId: string, imageData: string, filename: string): Promise<any> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${apiUrl}/projects/${projectId}/entities/${entityId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {})
      },
      body: JSON.stringify({
        parameterId,
        imageData,
        filename
      })
    });

    if (!response.ok) {
      throw new Error('Failed to upload entity image');
    }

    return await response.json();
  }

  /**
   * Получение изображения параметра сущности
   */
  static async getEntityImage(projectId: string, entityId: string, parameterId: string): Promise<any> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${apiUrl}/projects/${projectId}/entities/${entityId}/images/${parameterId}`, {
      headers: {
        ...(token ? {Authorization: `Bearer ${token}`} : {})
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get entity image');
    }

    return await response.json();
  }

  /**
   * Получение thumbnail изображения параметра сущности
   */
  static async getEntityImageThumbnail(projectId: string, entityId: string, parameterId: string): Promise<any> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${apiUrl}/projects/${projectId}/entities/${entityId}/images/${parameterId}/thumbnail`, {
      headers: {
        ...(token ? {Authorization: `Bearer ${token}`} : {})
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get entity image thumbnail');
    }

    return await response.json();
  }

  /**
   * Удаление изображения параметра сущности
   */
  static async deleteEntityImage(projectId: string, entityId: string, parameterId: string): Promise<void> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${apiUrl}/projects/${projectId}/entities/${entityId}/images/${parameterId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? {Authorization: `Bearer ${token}`} : {})
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete entity image');
    }
  }

  /**
   * Получение всех изображений сущности
   */
  static async getEntityImages(projectId: string, entityId: string): Promise<any[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${apiUrl}/projects/${projectId}/entities/${entityId}/images`, {
      headers: {
        ...(token ? {Authorization: `Bearer ${token}`} : {})
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get entity images');
    }

    const result = await response.json();
    return result.data;
  }
}
