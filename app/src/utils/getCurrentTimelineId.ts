import {parseEditorPath} from './navigation';

/**
 * Получает текущий timeline_id из URL
 * Используется в местах, где нет доступа к хукам React
 * Возвращает null если timeline_id не найден в URL
 */
export const getCurrentTimelineId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const parsed = parseEditorPath(window.location.pathname);
  return parsed?.timelineId || null;
};
