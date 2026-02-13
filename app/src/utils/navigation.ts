/**
 * Построение пути к редактору
 * timelineId теперь обязательный параметр
 */
export const buildEditorPath = (projectId: string, timelineId: string, layerId?: string): string => {
  const base = `/${projectId}/editor/${timelineId}`;
  return layerId && layerId !== 'root' ? `${base}/${layerId}` : base;
};

/**
 * Построение пути к воспроизведению
 */
export const buildPlayPath = (projectId: string, timelineId: string, nodeId?: string): string => {
  const base = `/${projectId}/play/${timelineId}`;
  return nodeId ? `${base}?nodeId=${nodeId}` : base;
};

/**
 * Парсинг пути редактора
 */
export const parseEditorPath = (pathname: string) => {
  // Удаляем query параметры и hash перед парсингом
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const match = cleanPath.match(/\/([^/]+)\/editor\/([^/]+)(?:\/([^/]+))?/);

  if (!match) return null;

  return {
    projectId: match[1],
    timelineId: match[2],
    layerId: match[3] || 'root'
  };
};

/**
 * Построение пути к проекту (библия)
 */
export const buildProjectPath = (projectId: string): string => {
  return `/${projectId}`;
};

/**
 * Построение пути к сущностям проекта
 */
export const buildEntitiesPath = (projectId: string): string => {
  return `/${projectId}/entities`;
};

/**
 * Построение пути к типу сущностей
 */
export const buildEntityTypePath = (projectId: string, typeId: string): string => {
  return `/${projectId}/entities/${typeId}`;
};

/**
 * Построение пути к конкретной сущности
 */
export const buildEntityPath = (projectId: string, typeId: string, entityId: string): string => {
  return `/${projectId}/entities/${typeId}/${entityId}`;
};

/**
 * Построение пути к локализации проекта
 */
export const buildLocalizationPath = (projectId: string): string => {
  return `/${projectId}/localization`;
};

/**
 * Парсинг пути проекта
 */
export const parseProjectPath = (pathname: string) => {
  // Удаляем query параметры и hash перед парсингом
  const cleanPath = pathname.split('?')[0].split('#')[0];

  // Проверяем разные паттерны путей

  // Паттерн для сущности: /{projectId}/entities/{typeId}/{entityId}
  const entityMatch = cleanPath.match(/\/([^/]+)\/entities\/([^/]+)\/([^/]+)$/);
  if (entityMatch) {
    return {
      projectId: entityMatch[1],
      section: 'entities' as const,
      typeId: entityMatch[2],
      entityId: entityMatch[3]
    };
  }

  // Паттерн для типа сущностей: /{projectId}/entities/{typeId}
  const typeMatch = cleanPath.match(/\/([^/]+)\/entities\/([^/]+)$/);
  if (typeMatch) {
    return {
      projectId: typeMatch[1],
      section: 'entities' as const,
      typeId: typeMatch[2],
      entityId: undefined
    };
  }

  // Паттерн для всех сущностей: /{projectId}/entities
  const entitiesMatch = cleanPath.match(/\/([^/]+)\/entities$/);
  if (entitiesMatch) {
    return {
      projectId: entitiesMatch[1],
      section: 'entities' as const,
      typeId: undefined,
      entityId: undefined
    };
  }

  // Паттерн для локализации: /{projectId}/localization
  const localizationMatch = cleanPath.match(/\/([^/]+)\/localization$/);
  if (localizationMatch) {
    return {
      projectId: localizationMatch[1],
      section: 'localization' as const,
      typeId: undefined,
      entityId: undefined
    };
  }

  // Паттерн для проекта: /{projectId}
  const projectMatch = cleanPath.match(/\/([^/]+)$/);
  if (projectMatch) {
    return {
      projectId: projectMatch[1],
      section: 'about' as const,
      typeId: undefined,
      entityId: undefined
    };
  }

  return null;
};
