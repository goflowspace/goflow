import {TeamRole} from '@types-folder/team';

/**
 * Проверяет может ли пользователь с данной ролью получить доступ к разделу billing
 * @param role роль пользователя в команде
 * @returns true если доступ разрешен
 */
export const canAccessBilling = (role: TeamRole | null): boolean => {
  const hasAccess = role === 'ADMINISTRATOR';
  return hasAccess;
};

/**
 * Проверяет может ли пользователь с данной ролью получить доступ к разделу members
 * @param role роль пользователя в команде
 * @returns true если доступ разрешен
 */
export const canAccessMembers = (role: TeamRole | null): boolean => {
  const hasAccess = role === 'ADMINISTRATOR' || role === 'MANAGER';
  return hasAccess;
};
