/**
 * Генерирует хеш из строки
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Преобразуем в 32-битное число
  }
  return Math.abs(hash);
}

/**
 * Генерирует HSL цвет на основе строки
 */
function generateColorFromString(str: string): string {
  const hash = hashCode(str);

  // Генерируем Hue (оттенок) от 0 до 360
  const hue = hash % 360;

  // Смягченные цвета для лучшего восприятия
  const saturation = 40 + (hash % 25); // 40-65% (более мягкие цвета)
  const lightness = 35 + (hash % 20); // 35-55% (темнее для лучшего контраста с белым текстом)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Удалены неиспользуемые функции hslToRgb и getLuminance

/**
 * Определяет контрастный цвет текста (белый или черный) для данного фона
 */
function getContrastTextColor(backgroundColor: string): string {
  // Упрощенный и более надежный алгоритм - извлекаем lightness из HSL
  const matches = backgroundColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!matches) return '#ffffff'; // fallback на белый

  const lightness = parseInt(matches[3]);

  // Поскольку мы генерируем темные цвета (35-55%), почти всегда используем белый текст
  // Только для очень светлых фонов (lightness > 70%) используем черный
  return lightness > 70 ? '#000000' : '#ffffff';
}

/**
 * Генерирует цветовую схему для типа сущности
 */
export function generateEntityTypeColors(entityType: string): {
  background: string;
  color: string;
} {
  const backgroundColor = generateColorFromString(entityType);
  const textColor = getContrastTextColor(backgroundColor);

  return {
    background: backgroundColor,
    color: textColor
  };
}
