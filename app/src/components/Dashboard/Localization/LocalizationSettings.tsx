'use client';

import React, {useState} from 'react';

import {CheckIcon, GearIcon} from '@radix-ui/react-icons';
import {Box, Button, Card, Flex, Switch, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {LocalizationConfig, ProjectLocalization, useLocalizationSettings} from '../../../hooks/useLocalizationData';

interface LocalizationSettingsProps {
  projectId: string;
  existingConfig?: ProjectLocalization | null;
  onConfigSaved: () => void;
}

export const LocalizationSettings: React.FC<LocalizationSettingsProps> = ({projectId, existingConfig, onConfigSaved}) => {
  const {t} = useTranslation();
  const {saveConfig, isLoading, error} = useLocalizationSettings();

  const [config, setConfig] = useState<LocalizationConfig>({
    baseLanguage: existingConfig?.baseLanguage || 'en',
    targetLanguages: existingConfig?.targetLanguages || ['ru'],
    autoTranslate: existingConfig?.autoTranslate ?? false,
    preserveMarkup: existingConfig?.preserveMarkup ?? true,
    requireReview: existingConfig?.requireReview ?? true,
    minContextWords: existingConfig?.minContextWords || 10,
    maxBatchSize: existingConfig?.maxBatchSize || 50
  });

  const handleSave = async () => {
    try {
      await saveConfig(projectId, config);
      onConfigSaved();
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const availableLanguages = [
    {code: 'en', name: t('localization.languages.en', 'English')},
    {code: 'ru', name: t('localization.languages.ru', 'Russian')},
    {code: 'es', name: t('localization.languages.es', 'Spanish')},
    {code: 'fr', name: t('localization.languages.fr', 'French')},
    {code: 'pt', name: t('localization.languages.pt', 'Portuguese')},
    {code: 'de', name: t('localization.languages.de', 'German')},
    {code: 'ja', name: t('localization.languages.ja', 'Japanese')},
    {code: 'ko', name: t('localization.languages.ko', 'Korean')},
    {code: 'zh-CN', name: t('localization.languages.zh-CN', 'Chinese (Simplified)')}
  ];

  return (
    <div>
      <Card>
        <Box p='6'>
          <Flex align='center' gap='3' mb='6'>
            <GearIcon width='24' height='24' />
            <Text size='5' weight='bold'>
              {t('localization.settings.title', 'Localization Settings')}
            </Text>
          </Flex>

          {error && (
            <Card mb='4' style={{backgroundColor: 'var(--red-2)', borderColor: 'var(--red-6)'}}>
              <Box p='3'>
                <Text color='red' size='2'>
                  {error}
                </Text>
              </Box>
            </Card>
          )}

          <Flex direction='column' gap='6'>
            {/* Base Language */}
            <div>
              <Text size='3' weight='medium' mb='2'>
                {t('localization.settings.base_language_label', 'Base Language')}
              </Text>
              <Text size='2' color='gray' mb='3'>
                {t('localization.settings.base_language_description', 'The source language for all translations')}
              </Text>

              <select
                value={config.baseLanguage}
                onChange={(e) => setConfig({...config, baseLanguage: e.target.value})}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-6)',
                  backgroundColor: 'var(--color-background)'
                }}
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Languages */}
            <div>
              <Text size='3' weight='medium' mb='2'>
                {t('localization.settings.target_languages_label', 'Target Languages')}
              </Text>
              <Text size='2' color='gray' mb='3'>
                {t('localization.settings.target_languages_description', 'Languages to translate content into')}
              </Text>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
                {availableLanguages
                  .filter((lang) => lang.code !== config.baseLanguage)
                  .map((lang) => (
                    <label
                      key={lang.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--gray-6)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type='checkbox'
                        checked={config.targetLanguages.includes(lang.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({
                              ...config,
                              targetLanguages: [...config.targetLanguages, lang.code]
                            });
                          } else {
                            setConfig({
                              ...config,
                              targetLanguages: config.targetLanguages.filter((l) => l !== lang.code)
                            });
                          }
                        }}
                      />
                      <Text size='2'>{lang.name}</Text>
                    </label>
                  ))}
              </div>
            </div>

            {/* Settings Toggles */}
            <div>
              <Text size='3' weight='medium' mb='4'>
                {t('localization.settings.title', 'Settings')}
              </Text>

              <Flex direction='column' gap='4'>
                <Flex justify='between' align='center'>
                  <div>
                    <Text size='2' weight='medium'>
                      {t('localization.settings.auto_translate_label', 'Auto-translate new content')}
                    </Text>
                    <Text size='1' color='gray'>
                      {t('localization.settings.auto_translate_description', 'Automatically translate new narrative texts using AI')}
                    </Text>
                  </div>
                  <Switch checked={config.autoTranslate} onCheckedChange={(checked) => setConfig({...config, autoTranslate: checked})} />
                </Flex>

                <Flex justify='between' align='center'>
                  <div>
                    <Text size='2' weight='medium'>
                      {t('localization.settings.preserve_markup_label', 'Preserve markup')}
                    </Text>
                    <Text size='1' color='gray'>
                      {t('localization.settings.preserve_markup_description', 'Keep HTML/Markdown formatting in translations')}
                    </Text>
                  </div>
                  <Switch checked={config.preserveMarkup} onCheckedChange={(checked) => setConfig({...config, preserveMarkup: checked})} />
                </Flex>

                <Flex justify='between' align='center'>
                  <div>
                    <Text size='2' weight='medium'>
                      {t('localization.settings.require_review_label', 'Require review')}
                    </Text>
                    <Text size='1' color='gray'>
                      {t('localization.settings.require_review_description', 'Translations need approval before being marked as complete')}
                    </Text>
                  </div>
                  <Switch checked={config.requireReview} onCheckedChange={(checked) => setConfig({...config, requireReview: checked})} />
                </Flex>
              </Flex>
            </div>

            {/* Save Button */}
            <Flex justify='end'>
              <Button onClick={handleSave} disabled={isLoading || config.targetLanguages.length === 0}>
                {isLoading ? (
                  <>Сохранение...</>
                ) : (
                  <>
                    <CheckIcon />
                    {t('localization.settings.save_settings', 'Save Settings')}
                  </>
                )}
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Card>
    </div>
  );
};
