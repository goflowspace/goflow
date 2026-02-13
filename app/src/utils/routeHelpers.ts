/**
 * Определяет, находится ли пользователь в воркспейсе проекта
 * @param pathname - текущий путь (от usePathname)
 * @returns true если пользователь находится в любом разделе проекта
 */
export const isInProjectWorkspace = (pathname: string): boolean => {
  // Проверяем, что путь начинается с /{project_id} и не является другими страницами
  const pathSegments = pathname.split('/').filter(Boolean);

  // Если нет сегментов, то это главная страница
  if (pathSegments.length === 0) {
    return false;
  }

  const firstSegment = pathSegments[0];

  // Исключаем известные не-проектные страницы
  const nonProjectPages = ['projects', 'usage', 'settings', 'billing', 'members', 'teams', 'auth'];

  // Если первый сегмент не является известной страницей,
  // то это скорее всего project_id
  return !nonProjectPages.includes(firstSegment);
};

/**
 * Извлекает ID проекта из пути
 * @param pathname - текущий путь (от usePathname)
 * @returns project_id или null
 */
export const extractProjectId = (pathname: string): string | null => {
  if (!isInProjectWorkspace(pathname)) {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  return pathSegments[0] || null;
};
