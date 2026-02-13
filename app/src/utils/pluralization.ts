/**
 * Правила склонения для русского языка
 * @param count - число
 * @param one - форма для 1 (например, "узел")
 * @param few - форма для 2-4 (например, "узла")
 * @param many - форма для 5+ (например, "узлов")
 * @returns правильная форма слова
 */
export function pluralizeRussian(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  // Исключения для чисел 11-14
  if (mod100 >= 11 && mod100 <= 14) {
    return many;
  }

  // Для остальных случаев смотрим на последнюю цифру
  if (mod10 === 1) {
    return one;
  } else if (mod10 >= 2 && mod10 <= 4) {
    return few;
  } else {
    return many;
  }
}

/**
 * Интернационализированная функция для склонений
 * @param count - число
 * @param key - ключ для получения форм из i18n
 * @param t - функция перевода из react-i18next
 * @returns правильная форма слова
 */
export function pluralizeWithI18n(count: number, key: string, t: (key: string) => any): string {
  const forms = t(key);

  // Если это объект с формами склонения
  if (typeof forms === 'object' && forms && forms.one && forms.few && forms.many) {
    return pluralizeRussian(count, forms.one, forms.few, forms.many);
  }

  // Если это простая строка, возвращаем как есть
  return forms || key;
}
