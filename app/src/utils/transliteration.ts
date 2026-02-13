/**
 * Функция транслитерации русских букв в латиницу
 */
export const transliterate = (word: string): string => {
  const rusToLat: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Д: 'D',
    Е: 'E',
    Ё: 'E',
    Ж: 'Zh',
    З: 'Z',
    И: 'I',
    Й: 'Y',
    К: 'K',
    Л: 'L',
    М: 'M',
    Н: 'N',
    О: 'O',
    П: 'P',
    Р: 'R',
    С: 'S',
    Т: 'T',
    У: 'U',
    Ф: 'F',
    Х: 'H',
    Ц: 'Ts',
    Ч: 'Ch',
    Ш: 'Sh',
    Щ: 'Sch',
    Ъ: '',
    Ы: 'Y',
    Ь: '',
    Э: 'E',
    Ю: 'Yu',
    Я: 'Ya'
  };

  // Преобразуем строку, заменяя русские буквы на латинские
  return word
    .split('')
    .map((char) => (char in rusToLat ? rusToLat[char] : char))
    .join('');
};

/**
 * Функция для генерации внутреннего имени из пользовательского
 */
export const generateInternalName = (customName: string): string => {
  // Сначала транслитерируем имя
  const transliterated = transliterate(customName);

  let result = transliterated
    .toLowerCase()
    .replace(/\s+/g, '_') // заменяем пробелы на подчеркивания
    .replace(/[^a-z0-9_]/g, ''); // оставляем только латинские буквы, цифры и подчеркивания

  // Если имя начинается с цифры, заменяем на 'var'
  if (/^\d/.test(result)) {
    result = 'var' + result;
  }
  // Если имя начинается не с буквы или подчеркивания (после предыдущей проверки это может быть только пустая строка),
  // добавляем подчеркивание
  else if (!/^[a-z_]/.test(result)) {
    result = '_' + result;
  }

  return result;
};
