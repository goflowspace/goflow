'use client';

import {useEffect} from 'react';

import {useTranslation} from 'react-i18next';

import {useProjectStore} from '@store/useProjectStore';

import welcomeStoryDataEn from '../data/welcome_story_en.json';
import welcomeStoryDataRu from '../data/welcome_story_ru.json';
import {importStoryFromJsonData} from '../utils/importStoryFromJsonData';

/**
 * Компонент для инициализации welcome-истории
 *
 * Отслеживает флаг includeWelcomeStory и добавляет welcome-историю на холст
 * при закрытии модального окна приветствия, если этот флаг включен
 *
 * Загружает версию истории в зависимости от языка системы
 */
const WelcomeStoryInitializer = () => {
  const {includeWelcomeStory, showWelcomeModal} = useProjectStore();
  const {i18n} = useTranslation();

  useEffect(() => {
    if (!showWelcomeModal && includeWelcomeStory) {
      // Определяем текущий язык интерфейса
      const currentLanguage = i18n.language;
      const isRussian = currentLanguage === 'ru';

      // Загружаем соответствующую версию истории
      const storyData = isRussian ? welcomeStoryDataRu : welcomeStoryDataEn;
      importStoryFromJsonData(storyData);
    }
  }, [showWelcomeModal, includeWelcomeStory, i18n.language]);

  return null;
};

export default WelcomeStoryInitializer;
