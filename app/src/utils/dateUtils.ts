/**
 * Форматирует дату в формате "DD месяц YYYY" (например, "04 апреля 2023")
 */
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  };
  return date.toLocaleDateString('ru-RU', options);
}

/**
 * Форматирует время в формате "HH:MM" (например, "13:45")
 */
export function formatTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  return date.toLocaleTimeString('ru-RU', options);
}

/**
 * Проверяет, относятся ли две даты к одному дню
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
}

/**
 * Возвращает относительную дату (сегодня, вчера, или конкретная дата)
 */
export function getRelativeDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Сегодня';
  } else if (isSameDay(date, yesterday)) {
    return 'Вчера';
  } else {
    return formatDate(date);
  }
}
