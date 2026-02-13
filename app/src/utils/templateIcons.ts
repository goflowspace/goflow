// Утилита для получения иконок проектов в зависимости от типа шаблона

export interface TemplateIcon {
  emoji: string;
  color: string;
  bgColor: string;
}

// Карта типов шаблонов на иконки
const TEMPLATE_ICONS: Record<string, TemplateIcon> = {
  // Существующие шаблоны
  interactive_story: {
    emoji: '📖',
    color: '#7c3aed',
    bgColor: '#f3f0ff'
  },
  educational_course: {
    emoji: '🎓',
    color: '#0891b2',
    bgColor: '#f0f9ff'
  },
  game_dialogue: {
    emoji: '🎮',
    color: '#dc2626',
    bgColor: '#fef2f2'
  },

  // Новые шаблоны
  detective_mystery: {
    emoji: '🔍',
    color: '#374151',
    bgColor: '#f9fafb'
  },
  corporate_training: {
    emoji: '💼',
    color: '#0f172a',
    bgColor: '#f8fafc'
  },
  fantasy_rpg: {
    emoji: '⚔️',
    color: '#7c2d12',
    bgColor: '#fef7ed'
  },

  // Дополнительные типы (для будущих шаблонов)
  medical_simulation: {
    emoji: '🏥',
    color: '#dc2626',
    bgColor: '#fef2f2'
  },
  business_process: {
    emoji: '📊',
    color: '#059669',
    bgColor: '#f0fdf4'
  },
  historical_project: {
    emoji: '🏛️',
    color: '#92400e',
    bgColor: '#fef3c7'
  },
  sci_fi_world: {
    emoji: '🚀',
    color: '#1d4ed8',
    bgColor: '#eff6ff'
  },
  cooking_recipe: {
    emoji: '👨‍🍳',
    color: '#ea580c',
    bgColor: '#fff7ed'
  },
  travel_guide: {
    emoji: '✈️',
    color: '#0891b2',
    bgColor: '#f0f9ff'
  },
  product_catalog: {
    emoji: '🛍️',
    color: '#7c3aed',
    bgColor: '#f3f0ff'
  },
  legal_case: {
    emoji: '⚖️',
    color: '#374151',
    bgColor: '#f9fafb'
  },
  academic_research: {
    emoji: '🔬',
    color: '#0f766e',
    bgColor: '#f0fdfa'
  },
  event_planning: {
    emoji: '🎪',
    color: '#be185d',
    bgColor: '#fdf2f8'
  }
};

// Иконка по умолчанию для проектов без шаблона
const DEFAULT_ICON: TemplateIcon = {
  emoji: '📋',
  color: '#6b7280',
  bgColor: '#f3f4f6'
};

/**
 * Получить иконку для проекта по его templateId
 */
export function getProjectIcon(templateId?: string): TemplateIcon {
  if (!templateId) {
    return DEFAULT_ICON;
  }

  // Убираем префикс template_, если он есть
  const templateType = templateId.replace('template_', '');

  return TEMPLATE_ICONS[templateType] || DEFAULT_ICON;
}

/**
 * Получить все доступные иконки шаблонов (для админки)
 */
export function getAllTemplateIcons(): Record<string, TemplateIcon> {
  return TEMPLATE_ICONS;
}

/**
 * Проверить, есть ли иконка для типа шаблона
 */
export function hasTemplateIcon(templateType: string): boolean {
  return templateType in TEMPLATE_ICONS;
}
