/**
 * Утилиты для форматирования значений переменных при отображении
 */

/**
 * Форматирует процентное значение из внутреннего формата (0-1) в отображаемый (0-100%)
 * @param value Значение переменной
 * @returns Отформатированное значение с символом %
 */
export const formatPercentValue = (value: any): string => {
  if (typeof value === 'number') {
    // Преобразуем значение из 0-1 в 0-100%
    const percentValue = Math.round(value * 100);
    return `${percentValue}%`;
  }
  return String(value) + '%';
};

/**
 * Универсальная функция форматирования значения переменной в зависимости от её типа
 * @param value Значение переменной
 * @param type Тип переменной (percent, boolean, integer, etc.)
 * @returns Отформатированное значение для отображения
 */
export const formatVariableValue = (value: string | number | boolean, type?: string): string => {
  // Проверка на null/undefined
  if (value === null || value === undefined) {
    return 'N/A';
  }

  // Если значение - объект (не должно быть, но защищаемся)
  if (typeof value === 'object') {
    console.warn('Variable value is an object:', value);
    return 'NaN';
  }

  // Обработка процентных значений
  if (type === 'percent') {
    // Если значение уже строка и содержит %, возвращаем как есть
    if (typeof value === 'string' && value.includes('%')) {
      return value;
    }

    // Если это строковое представление числа, преобразуем в число и добавляем %
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      // Проверяем, является ли число долей (0-1)
      if (numValue <= 1 && numValue >= 0) {
        return `${Math.round(numValue * 100)}%`;
      }
      return `${numValue}%`;
    }

    // Если это число
    if (typeof value === 'number') {
      // Проверяем, является ли число долей (0-1)
      if (value <= 1 && value >= 0) {
        // Это доля, конвертируем в проценты (0-100%)
        const percentValue = Math.round(value * 100);
        return `${percentValue}%`;
      }
      // Иначе это уже проценты, просто добавляем символ %
      return `${value}%`;
    }
  }
  // Обработка числовых значений
  else if (type === 'integer') {
    // Для целочисленных значений округляем
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return String(Math.round(parseFloat(value)));
    }
    if (typeof value === 'number') {
      return String(Math.round(value));
    }
  } else if (type === 'float') {
    // Для float значений ограничиваем количество знаков после запятой
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value)
        .toFixed(2)
        .replace(/\.?0+$/, '');
    }
    if (typeof value === 'number') {
      return value.toFixed(2).replace(/\.?0+$/, '');
    }
  } else if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Для любых других типов или если тип не указан
  return String(value);
};
