/**
 * Утилиты для генерации лейблов в экспортерах
 */
import {generateInternalName} from '../../../utils/transliteration';

/**
 * Генерирует читаемое имя лейбла для экспорта
 * Использует name узла или первые 3 слова/30 символов из текста + часть nodeId для уникальности
 */
export const generateLabelFromNodeData = (name?: string, text?: string, nodeId?: string): string => {
  let baseName = '';

  // Если есть name, используем его
  if (name && name.trim()) {
    baseName = generateInternalName(name.trim());
  }
  // Если нет name, используем текст
  else if (text && text.trim()) {
    const cleanText = text.trim();

    // Берем первые 3 слова
    const words = cleanText.split(/\s+/);
    let labelText = words.slice(0, 3).join(' ');

    // Ограничиваем до 30 символов
    if (labelText.length > 30) {
      labelText = labelText.substring(0, 30);
    }

    baseName = generateInternalName(labelText);
  }

  // Если нет базового имени, возвращаем пустую строку
  if (!baseName) {
    return '';
  }

  // Добавляем соль из nodeId для предотвращения коллизий
  if (nodeId) {
    const nodeIdSuffix = generateNodeIdSuffix(nodeId);
    return `${baseName}_${nodeIdSuffix}`;
  }

  return baseName;
};

/**
 * Генерирует суффикс из nodeId (берем короткий уникальный идентификатор)
 */
const generateNodeIdSuffix = (nodeId: string): string => {
  // Очищаем от спецсимволов, оставляем только буквы, цифры и подчеркивания
  let cleaned = nodeId.replace(/[^a-zA-Z0-9_]/g, '');

  // Убираем общие префиксы чтобы оставить только уникальную часть
  if (cleaned.toLowerCase().startsWith('node')) {
    cleaned = cleaned.slice(4);
  }

  // Если результат пустой, используем исходный очищенный nodeId
  if (cleaned.length === 0) {
    cleaned = nodeId.replace(/[^a-zA-Z0-9_]/g, '');
  }

  // Если строка короткая (до 10 символов), возвращаем как есть
  if (cleaned.length <= 10) {
    return cleaned;
  }

  // Для длинных строк берем первые 5 и последние 5 символов
  return cleaned.slice(0, 5) + cleaned.slice(-5);
};

/**
 * Генерирует fallback имя лейбла на основе ID узла
 */
export const generateFallbackLabel = (nodeId: string): string => {
  return `node_${nodeId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
};
