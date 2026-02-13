/**
 * Утилиты для работы с локализацией в режиме playback
 * Проверяет полноту переводов и готовность языков для тестирования
 */

export interface LocalizationData {
  nodeId: string;
  layerId: string;
  fieldPath: string;
  targetLanguage: string;
  originalText: string;
  translatedText?: string;
  status: 'PENDING' | 'TRANSLATING' | 'TRANSLATED' | 'REVIEWED' | 'APPROVED' | 'PROTECTED' | 'REJECTED' | 'OUTDATED' | 'ARCHIVED';
}

export interface LanguageCompleteness {
  language: string;
  totalTexts: number;
  translatedTexts: number;
  approvedTexts: number;
  completenessPercentage: number;
  isReady: boolean; // готов ли язык для тестирования
}

export interface ProjectLocalizationData {
  baseLanguage: string;
  targetLanguages: string[];
  localizations: LocalizationData[];
}

/**
 * Проверяет полноту переводов для каждого языка
 * @param localizationData Данные локализации проекта
 * @param readyThreshold Порог готовности (по умолчанию 80%)
 * @returns Массив с информацией о готовности каждого языка
 */
export function checkLocalizationCompleteness(localizationData: ProjectLocalizationData, readyThreshold: number = 80): LanguageCompleteness[] {
  const {targetLanguages, localizations} = localizationData;

  return targetLanguages.map((language) => {
    // Получаем все локализации для этого языка
    const languageLocalizations = localizations.filter((loc) => loc.targetLanguage === language);

    const totalTexts = languageLocalizations.length;
    const translatedTexts = languageLocalizations.filter(
      (loc) => loc.translatedText && loc.translatedText.trim() !== '' && ['TRANSLATED', 'REVIEWED', 'APPROVED', 'PROTECTED'].includes(loc.status)
    ).length;

    const approvedTexts = languageLocalizations.filter((loc) => ['APPROVED', 'PROTECTED'].includes(loc.status)).length;

    const completenessPercentage = totalTexts > 0 ? (translatedTexts / totalTexts) * 100 : 0;
    const isReady = completenessPercentage >= readyThreshold;

    return {
      language,
      totalTexts,
      translatedTexts,
      approvedTexts,
      completenessPercentage: Math.round(completenessPercentage * 100) / 100, // округляем до 2 знаков
      isReady
    };
  });
}

/**
 * Получает список языков готовых для тестирования
 * @param localizationData Данные локализации проекта
 * @param readyThreshold Порог готовности (по умолчанию 80%)
 * @returns Массив кодов языков готовых для тестирования
 */
export function getReadyLanguages(localizationData: ProjectLocalizationData, readyThreshold: number = 80): string[] {
  const completeness = checkLocalizationCompleteness(localizationData, readyThreshold);

  return completeness.filter((lang) => lang.isReady).map((lang) => lang.language);
}

/**
 * Применяет локализации к узлу
 * @param node Узел для локализации
 * @param language Целевой язык
 * @param localizations Данные локализаций
 * @returns Локализованный узел
 */
export function applyNodeLocalization(node: any, language: string, localizations: LocalizationData[]): any {
  if (!language || !localizations.length) {
    return node;
  }

  // Создаем копию узла для изменения
  const localizedNode = {...node};

  // Получаем локализации для этого узла и языка
  const nodeLocalizations = localizations.filter(
    (loc) =>
      loc.nodeId === node.id && loc.targetLanguage === language && loc.translatedText && loc.translatedText.trim() !== '' && ['TRANSLATED', 'REVIEWED', 'APPROVED', 'PROTECTED'].includes(loc.status)
  );

  // Применяем переводы
  nodeLocalizations.forEach((loc) => {
    if (loc.fieldPath === 'data.title' && localizedNode.data) {
      localizedNode.data = {...localizedNode.data, title: loc.translatedText};
    } else if (loc.fieldPath === 'data.text' && localizedNode.data) {
      localizedNode.data = {...localizedNode.data, text: loc.translatedText};
    } else if (loc.fieldPath.startsWith('choices.') && localizedNode.choices) {
      // Для выборов: choices.{choiceId}.text
      const choiceMatch = loc.fieldPath.match(/^choices\.(.+)\.text$/);
      if (choiceMatch) {
        const choiceId = choiceMatch[1];
        const choice = localizedNode.choices.find((c: any) => c.id === choiceId);
        if (choice) {
          choice.text = loc.translatedText;
        }
      }
    }
  });

  return localizedNode;
}

/**
 * Применяет локализации ко всем узлам в массиве
 * @param nodes Массив узлов
 * @param language Целевой язык
 * @param localizations Данные локализаций
 * @returns Массив локализованных узлов
 */
export function applyLocalizationToNodes(nodes: any[], language: string, localizations: LocalizationData[]): any[] {
  if (!language || !localizations.length) {
    return nodes;
  }

  return nodes.map((node) => applyNodeLocalization(node, language, localizations));
}

/**
 * Названия языков для отображения в UI
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
  it: 'Italiano'
};

/**
 * Получает название языка для отображения
 * @param languageCode Код языка
 * @returns Название языка
 */
export function getLanguageName(languageCode: string): string {
  return LANGUAGE_NAMES[languageCode] || languageCode;
}
