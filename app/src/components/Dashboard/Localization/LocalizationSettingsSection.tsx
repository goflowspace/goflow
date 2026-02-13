'use client';

import React, {useEffect, useState} from 'react';

import {Badge, Button, Card, Checkbox, Flex, Select, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {LocalizationConfig, useLocalizationData, useLocalizationSettings} from '../../../hooks/useLocalizationData';

interface LocalizationSettingsSectionProps {
  projectId: string;
}

export const LocalizationSettingsSection: React.FC<LocalizationSettingsSectionProps> = ({projectId}) => {
  const {t} = useTranslation();

  const {projectLocalization, isLoading, error, refetch} = useLocalizationData(projectId);

  const localizationSettings = useLocalizationSettings();

  const [formData, setFormData] = useState({
    baseLanguage: 'en',
    targetLanguages: [] as string[],
    autoTranslate: false,
    preserveMarkup: true,
    requireReview: true,
    minContextWords: 5,
    maxBatchSize: 50
  });

  // Supported languages
  const supportedLanguages = [
    {value: 'en', label: t('localization.languages.en', 'English')},
    {value: 'ru', label: t('localization.languages.ru', 'Russian')},
    {value: 'es', label: t('localization.languages.es', 'Spanish')},
    {value: 'fr', label: t('localization.languages.fr', 'French')},
    {value: 'pt', label: t('localization.languages.pt', 'Portuguese')},
    {value: 'de', label: t('localization.languages.de', 'German')},
    {value: 'ja', label: t('localization.languages.ja', 'Japanese')},
    {value: 'ko', label: t('localization.languages.ko', 'Korean')},
    {value: 'zh-CN', label: t('localization.languages.zh-CN', 'Chinese (Simplified)')}
  ];

  // Initialize form data from existing configuration
  useEffect(() => {
    if (projectLocalization) {
      setFormData({
        baseLanguage: projectLocalization.baseLanguage,
        targetLanguages: projectLocalization.targetLanguages,
        autoTranslate: projectLocalization.autoTranslate,
        preserveMarkup: projectLocalization.preserveMarkup,
        requireReview: projectLocalization.requireReview,
        minContextWords: projectLocalization.minContextWords,
        maxBatchSize: projectLocalization.maxBatchSize
      });
    }
  }, [projectLocalization]);

  const handleTargetLanguageChange = (language: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      targetLanguages: checked ? [...prev.targetLanguages, language] : prev.targetLanguages.filter((lang) => lang !== language)
    }));
  };

  const handleBaseLanguageChange = (newBaseLanguage: string) => {
    setFormData((prev) => ({
      ...prev,
      baseLanguage: newBaseLanguage,
      // Remove new base language from target languages if it was there
      targetLanguages: prev.targetLanguages.filter((lang) => lang !== newBaseLanguage)
    }));
  };

  const handleSave = async () => {
    if (!projectId || formData.targetLanguages.length === 0) return;

    try {
      const config: LocalizationConfig = {
        baseLanguage: formData.baseLanguage,
        targetLanguages: formData.targetLanguages,
        autoTranslate: formData.autoTranslate,
        preserveMarkup: formData.preserveMarkup,
        requireReview: formData.requireReview,
        minContextWords: formData.minContextWords,
        maxBatchSize: formData.maxBatchSize
      };

      await localizationSettings.saveConfig(projectId, config);
      refetch(); // Refresh the data to show updated settings
    } catch (error: any) {
      console.error('Failed to save localization settings:', error);

      // Show specific validation errors if available
      if (error.message && error.message.includes('Base language cannot be in target languages list')) {
        window.alert(t('localization.messages.base_language_conflict', 'Базовый язык не может быть в списке целевых языков.'));
      } else if (error.message && error.message.includes('greater than or equal to 5')) {
        window.alert(t('localization.messages.min_context_error', 'Минимальное количество контекстных слов должно быть 5 или больше.'));
      } else if (error.message && error.message.includes('validation')) {
        window.alert(t('localization.messages.validation_error', 'Ошибка валидации данных. Проверьте правильность заполнения полей.'));
      }
      // Error handling is done in the hook
    }
  };

  if (isLoading || localizationSettings.isLoading) {
    return (
      <Card style={{padding: '20px'}}>
        <Text>{t('common.loading', 'Loading...')}</Text>
      </Card>
    );
  }

  if (error || localizationSettings.error) {
    return (
      <Card style={{padding: '20px'}}>
        <Text color='red'>{error || localizationSettings.error || t('localization.messages.load_error', 'Failed to load localization settings')}</Text>
        <Button onClick={refetch} style={{marginTop: '10px'}} variant='outline'>
          {t('common.retry', 'Retry')}
        </Button>
      </Card>
    );
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
      {/* Status */}
      {projectLocalization ? (
        <Flex align='center' gap='2'>
          <Badge color='green' size='1'>
            {t('localization.status.configured', 'Настроено')}
          </Badge>
          <Text size='2' color='gray'>
            {t('localization.overview.base_language')}: {projectLocalization.baseLanguage.toUpperCase()}, {projectLocalization.targetLanguages.length}{' '}
            {t('localization.overview.target_languages', 'целевых языков')}
          </Text>
        </Flex>
      ) : (
        <Flex align='center' gap='2'>
          <Badge color='gray' size='1'>
            {t('localization.status.not_configured', 'Не настроено')}
          </Badge>
          <Text size='2' color='gray'>
            {t('localization.status.configure_to_start', 'Настройте локализацию для перевода контента')}
          </Text>
        </Flex>
      )}

      {/* Settings Form */}
      <Card style={{padding: '20px'}}>
        <Flex direction='column' gap='4'>
          {/* Base Language */}
          <div>
            <Text as='label' size='2' weight='medium' style={{display: 'block', marginBottom: '8px'}}>
              {t('localization.settings.base_language_label', 'Базовый язык')}
            </Text>
            <Text size='1' color='gray' style={{display: 'block', marginBottom: '8px'}}>
              {t('localization.settings.base_language_description', 'Исходный язык для всех переводов')}
            </Text>
            <Select.Root value={formData.baseLanguage} onValueChange={handleBaseLanguageChange}>
              <Select.Trigger />
              <Select.Content>
                {supportedLanguages.map((lang) => (
                  <Select.Item key={lang.value} value={lang.value}>
                    {lang.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          {/* Target Languages */}
          <div>
            <Text as='label' size='2' weight='medium' style={{display: 'block', marginBottom: '8px'}}>
              {t('localization.settings.target_languages_label', 'Целевые языки')}
            </Text>
            <Text size='1' color='gray' style={{display: 'block', marginBottom: '12px'}}>
              {t('localization.settings.target_languages_description', 'Языки для перевода контента')}
            </Text>
            <Flex direction='column' gap='2'>
              {supportedLanguages
                .filter((lang) => lang.value !== formData.baseLanguage)
                .map((lang) => (
                  <Flex key={lang.value} align='center' gap='2'>
                    <Checkbox checked={formData.targetLanguages.includes(lang.value)} onCheckedChange={(checked) => handleTargetLanguageChange(lang.value, checked as boolean)} />
                    <Text size='2'>{lang.label}</Text>
                  </Flex>
                ))}
            </Flex>
          </div>

          {/* Localization Options */}
          <div>
            <Text as='label' size='2' weight='medium' style={{display: 'block', marginBottom: '12px'}}>
              {t('localization.settings.options_label', 'Настройки локализации')}
            </Text>
            <Flex direction='column' gap='3'>
              <Flex align='center' gap='2'>
                <Checkbox checked={formData.autoTranslate} onCheckedChange={(checked) => setFormData((prev) => ({...prev, autoTranslate: checked as boolean}))} />
                <div>
                  <Text size='2'>{t('localization.settings.auto_translate', 'Авто-перевод нового контента')}</Text>
                  <Text size='1' color='gray' style={{display: 'block', marginTop: '2px'}}>
                    {t('localization.settings.auto_translate_description', 'Автоматически переводить новые нарративные тексты через ИИ')}
                  </Text>
                </div>
              </Flex>

              <Flex align='center' gap='2'>
                <Checkbox checked={formData.preserveMarkup} onCheckedChange={(checked) => setFormData((prev) => ({...prev, preserveMarkup: checked as boolean}))} />
                <div>
                  <Text size='2'>{t('localization.settings.preserve_markup', 'Сохранять разметку')}</Text>
                  <Text size='1' color='gray' style={{display: 'block', marginTop: '2px'}}>
                    {t('localization.settings.preserve_markup_description', 'Сохранять HTML/Markdown форматирование в переводах')}
                  </Text>
                </div>
              </Flex>

              <Flex align='center' gap='2'>
                <Checkbox checked={formData.requireReview} onCheckedChange={(checked) => setFormData((prev) => ({...prev, requireReview: checked as boolean}))} />
                <div>
                  <Text size='2'>{t('localization.settings.require_review', 'Требовать проверку')}</Text>
                  <Text size='1' color='gray' style={{display: 'block', marginTop: '2px'}}>
                    {t('localization.settings.require_review_description', 'Переводы требуют утверждения перед завершением')}
                  </Text>
                </div>
              </Flex>
            </Flex>
          </div>

          {/* Save Button */}
          <Flex justify='end' style={{marginTop: '10px'}}>
            <Button onClick={handleSave} disabled={localizationSettings.isLoading || formData.targetLanguages.length === 0} loading={localizationSettings.isLoading}>
              {projectLocalization ? t('localization.settings.update_configuration', 'Обновить настройки') : t('localization.settings.save_configuration', 'Сохранить настройки')}
            </Button>
          </Flex>
        </Flex>
      </Card>
    </div>
  );
};
