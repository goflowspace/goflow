'use client';

import React from 'react';

import {Badge, Flex, Select, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {getLanguageName} from '../../utils/localizationCompleteness';
import {usePlaybackLog} from '../PlaybackLogPanelV2/contexts/LogContext';

/**
 * Компонент для выбора языка локализации в playback режиме
 * Отображает только языки готовые к тестированию
 */
export const PlaybackLanguageSelector: React.FC = () => {
  const {t} = useTranslation();
  const {selectedLanguage, setSelectedLanguage, localizationData, languageCompleteness, readyLanguages, isLocalizationAvailable} = usePlaybackLog();

  if (!isLocalizationAvailable || !localizationData) {
    return null;
  }

  // Создаем список доступных языков (базовый + все целевые для тестирования)
  const availableLanguages = [localizationData.baseLanguage, ...localizationData.targetLanguages.filter((lang) => lang !== localizationData.baseLanguage)];

  if (availableLanguages.length <= 1) {
    return null; // Не показываем селектор если нет выбора
  }

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
  };

  const getLanguageCompleteness = (language: string) => {
    if (language === localizationData.baseLanguage) {
      return null; // Базовый язык всегда 100%
    }

    return languageCompleteness.find((lc) => lc.language === language);
  };

  return (
    <Flex align='center' gap='2' style={{minWidth: '200px'}}>
      <Text size='2' weight='medium' style={{color: 'var(--gray-11)', whiteSpace: 'nowrap'}}>
        {t('playback.language_selector.label', 'Language')}:
      </Text>

      <Select.Root value={selectedLanguage} onValueChange={handleLanguageChange}>
        <Select.Trigger
          style={{
            minWidth: '140px',
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--gray-6)',
            color: 'var(--gray-12)'
          }}
        />
        <Select.Content>
          {availableLanguages.map((language) => {
            const completeness = getLanguageCompleteness(language);
            const isBaseLanguage = language === localizationData.baseLanguage;

            return (
              <Select.Item key={language} value={language}>
                <Flex align='center' justify='between' style={{width: '100%'}}>
                  <Text>{getLanguageName(language)}</Text>

                  {isBaseLanguage ? (
                    <Badge color='blue' variant='soft' size='1'>
                      {t('playback.language_selector.original', 'Original')}
                    </Badge>
                  ) : (
                    <Badge color={completeness && completeness.completenessPercentage > 0 ? (completeness.completenessPercentage >= 90 ? 'green' : 'orange') : 'gray'} variant='soft' size='1'>
                      {completeness ? Math.round(completeness.completenessPercentage) : 0}%
                    </Badge>
                  )}
                </Flex>
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>

      {/* Индикатор качества перевода для выбранного языка */}
      {selectedLanguage !== localizationData.baseLanguage && (
        <div>
          {(() => {
            const completeness = getLanguageCompleteness(selectedLanguage);
            if (!completeness) return null;

            return (
              <Badge
                color={completeness.completenessPercentage >= 95 ? 'green' : completeness.completenessPercentage >= 80 ? 'orange' : 'red'}
                variant='soft'
                size='1'
                title={t('playback.language_selector.completeness_tooltip', 'Translation completeness: {{translated}}/{{total}} texts ({{percentage}}%)', {
                  translated: completeness.translatedTexts,
                  total: completeness.totalTexts,
                  percentage: Math.round(completeness.completenessPercentage)
                })}
              >
                {Math.round(completeness.completenessPercentage)}%
              </Badge>
            );
          })()}
        </div>
      )}
    </Flex>
  );
};
