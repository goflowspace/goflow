'use client';

import React, {useState} from 'react';

import Image from 'next/image';

import {useCurrentProject} from '@hooks/useCurrentProject';
import * as Dialog from '@radix-ui/react-dialog';
import {CheckIcon, Cross2Icon} from '@radix-ui/react-icons';
import * as RadioGroup from '@radix-ui/react-radio-group';
import {Box, Button, Flex, Text} from '@radix-ui/themes';
import {trackProjectExport} from '@services/analytics';
import {API_URL, api} from '@services/api';
import {loadProject} from '@services/dbService';
import {ExportServiceFactory} from '@services/exporters/ExportService';
import {ExportFormat} from '@services/exporters/interfaces/exportInterfaces';
import {ProjectDataService} from '@services/projectDataService';
import JSZip from 'jszip';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';
import {useTimelinesStore} from '@store/useTimelinesStore';
import {useUIStore} from '@store/useUIStore';
import {useVariablesStore} from '@store/useVariablesStore';

import {getAggregatedPlayParams} from '../../utils/analyticsUtils';
import {downloadFile} from '../../utils/download';
import {generateHTMLTemplate, prepareDataForHTML} from '../../utils/htmlPreview';
import {exportLocalizationData} from '../../utils/localizationExport';

import styles from './ExportModal.module.scss';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface JsonExportOptions {
  includeGraph: boolean;
  includeEntities: boolean;
  includeKnowledge: boolean;
  includeLocalization: boolean;
}

const ExportModal = ({open, onOpenChange}: ExportModalProps) => {
  const {t} = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [jsonExportOptions, setJsonExportOptions] = useState<JsonExportOptions>({
    includeGraph: true, // Граф всегда включен и не может быть отключен
    includeEntities: true,
    includeKnowledge: true,
    includeLocalization: true
  });
  const {projectName} = useProjectStore();
  const projectId = useCurrentProject().projectId || ProjectDataService.getStatus().currentProjectId || 'undefined';
  const {layers, lastLayerNumber, entities, entityTypes, currentTimelineId} = useGraphStore();
  const {timelines: timelinesMetadata} = useTimelinesStore();

  // Получаем имя текущего таймлайна для заголовка
  const getCurrentTimelineName = () => {
    const timeline = timelinesMetadata.find((t) => t.id === currentTimelineId);
    return timeline?.name || `Timeline ${currentTimelineId.slice(-8)}`;
  };
  // Получаем состояние сайдбара для аналитики
  const isSidebarOpened = useUIStore((state) => state.isSidebarOpen);

  // Форматы экспорта
  const exportFormats = [
    {
      id: 'json',
      label: t('export_modal.formats.json.label'),
      description: t('export_modal.formats.json.description')
    },
    {
      id: 'html',
      label: t('export_modal.formats.html.label'),
      description: t('export_modal.formats.html.description')
    },
    {
      id: 'renpy',
      label: t('export_modal.formats.renpy.label'),
      description: t('export_modal.formats.renpy.description')
    },
    {
      id: 'dialogic',
      label: t('export_modal.formats.dialogic.label'),
      description: t('export_modal.formats.dialogic.description')
    },
    {
      id: 'unity',
      label: t('export_modal.formats.unity.label'),
      description: t('export_modal.formats.unity.description'),
      disabled: true
    },
    {
      id: 'unreal',
      label: t('export_modal.formats.unreal.label'),
      description: t('export_modal.formats.unreal.description'),
      disabled: true
    },
    {
      id: 'gamemaker',
      label: t('export_modal.formats.gamemaker.label'),
      description: t('export_modal.formats.gamemaker.description'),
      disabled: true
    }
  ];

  // Функция экспорта в JSON (создает ZIP архив с отдельными файлами)
  const exportToJSON = async () => {
    // Принудительно сохраняем актуальные данные перед экспортом
    await useGraphStore.getState().saveToDb();

    // Получаем переменные из хранилища
    const variables = useVariablesStore.getState().variables;

    // Собираем аналитику для экспорта
    const metricsParams = getAggregatedPlayParams(layers, variables, 'PlayBar');

    // Функция для получения имени таймлайна по ID
    const getTimelineName = (timelineId: string, fallbackMetadata?: any[]): string => {
      // Сначала ищем в текущих метаданных таймлайнов из store
      const timelineFromStore = timelinesMetadata.find((t) => t.id === timelineId);
      if (timelineFromStore?.name) {
        return timelineFromStore.name;
      }

      // Затем ищем в метаданных из загруженных данных проекта
      if (fallbackMetadata) {
        const timelineFromProject = fallbackMetadata.find((t) => t.id === timelineId);
        if (timelineFromProject?.name) {
          return timelineFromProject.name;
        }
      }

      // Fallback: создаем имя на основе ID
      return `Timeline ${timelineId.slice(-8)}`;
    };

    // Экспортируем только текущий активный таймлайн
    const currentTimelineName = getTimelineName(currentTimelineId);
    const exportedTimelineIds = [currentTimelineId];

    // 1. Основной файл с таймлайном (timeline.json)
    const timelineData = {
      title: projectName,
      data: {
        timelines: {
          [currentTimelineId]: {
            name: currentTimelineName,
            layers,
            lastLayerNumber,
            variables
          }
        }
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        protocolVersion: 5, // Увеличиваем версию для ZIP структуры
        exportedTimelineIds: exportedTimelineIds,
        exportFormat: 'zip' // Указываем что это ZIP экспорт
      }
    };

    // Создаем ZIP архив
    const zip = new JSZip();

    // Добавляем основной файл таймлайна с ID в имени
    const timelineFileName = `timeline_${currentTimelineId.slice(-8)}.json`;
    zip.file(timelineFileName, JSON.stringify(timelineData, null, 2));

    // 2. Файл с сущностями (entities.json) - если выбрано
    if (jsonExportOptions.includeEntities && projectId) {
      try {
        // Исключаем изображения из сущностей
        const entitiesForExport = entities.map((entity) => {
          const entityCopy = {...entity};

          // Убираем основное изображение сущности
          delete entityCopy.image;

          // Убираем параметры типа MEDIA из значений
          if (entityCopy.values) {
            entityCopy.values = entityCopy.values.filter((value) => {
              // Проверяем тип параметра - если MEDIA, исключаем
              return value.parameter?.valueType !== 'MEDIA';
            });
          }

          return entityCopy;
        });

        // Исключаем параметры типа MEDIA из типов сущностей
        const entityTypesForExport = entityTypes.map((entityType) => {
          const entityTypeCopy = {...entityType};

          if (entityTypeCopy.parameters) {
            entityTypeCopy.parameters = entityTypeCopy.parameters.filter((typeParam) => {
              return typeParam.parameter?.valueType !== 'MEDIA';
            });
          }

          return entityTypeCopy;
        });

        const entitiesData = {
          entities: entitiesForExport,
          entityTypes: entityTypesForExport,
          metadata: {
            exportedAt: new Date().toISOString(),
            version: '1.0'
          }
        };

        zip.file('entities.json', JSON.stringify(entitiesData, null, 2));
      } catch (error) {
        console.error('Failed to include entities in export:', error);
      }
    }

    // 3. Файл с библией проекта (knowledge.json) - если выбрано
    if (jsonExportOptions.includeKnowledge && projectId) {
      try {
        const projectInfo = await api.getProjectInfo(projectId);
        if (projectInfo) {
          const knowledgeData = {
            knowledge: {
              logline: projectInfo.logline,
              synopsis: projectInfo.synopsis,
              genres: projectInfo.genres,
              formats: projectInfo.formats,
              status: projectInfo.status,
              setting: projectInfo.setting,
              targetAudience: projectInfo.targetAudience,
              mainThemes: projectInfo.mainThemes,
              message: projectInfo.message,
              references: projectInfo.references,
              uniqueFeatures: projectInfo.uniqueFeatures,
              atmosphere: projectInfo.atmosphere,
              constraints: projectInfo.constraints
            },
            metadata: {
              exportedAt: new Date().toISOString(),
              version: '1.0'
            }
          };

          zip.file('knowledge.json', JSON.stringify(knowledgeData, null, 2));
        }
      } catch (error) {
        console.error('Failed to load project info for export:', error);
      }
    }

    // 4. Файлы локализации (localization_<lang>.json) - если выбрано
    if (jsonExportOptions.includeLocalization) {
      try {
        // Получаем настройки локализации проекта
        const localizationResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}`);
        if (localizationResponse.ok) {
          const localizationSettings = await localizationResponse.json();
          const settings = localizationSettings.data;

          if (settings && settings.targetLanguages && settings.targetLanguages.length > 0) {
            // Получаем тексты для всех целевых языков
            for (const targetLanguage of settings.targetLanguages) {
              try {
                const textsResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/timelines/${currentTimelineId}/texts?language=${targetLanguage}`);

                if (textsResponse.ok) {
                  const textsData = await textsResponse.json();
                  const texts = textsData.data || [];

                  // Создаем простую структуру key-value, где key = nodeId
                  const localizationByNode: {[nodeId: string]: string} = {};

                  texts.forEach((text: any) => {
                    // Используем переведенный текст или оригинальный, если перевода нет
                    localizationByNode[text.nodeId] = text.translatedText || text.originalText;
                  });

                  const localizationFileData = {
                    timelineId: currentTimelineId,
                    language: targetLanguage,
                    baseLanguage: settings.baseLanguage,
                    localizations: localizationByNode,
                    metadata: {
                      exportedAt: new Date().toISOString(),
                      version: '1.0'
                    }
                  };

                  zip.file(`localization_${currentTimelineId}_${targetLanguage}.json`, JSON.stringify(localizationFileData, null, 2));
                }
              } catch (error) {
                console.warn(`Error loading texts for language ${targetLanguage}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to include localization in export:', error);
      }
    }

    // 5. Создаем README файл с описанием структуры
    const readmeContent = `# Go Flow JSON Export

This export contains your project data in a structured format.

## File Structure

- **${timelineFileName}** - Contains the main timeline data including story nodes, layers, and variables
- **entities.json** - Contains character entities and their definitions (if included)
- **knowledge.json** - Contains project bible information (if included)
- **localization_${currentTimelineId}_<lang>.json** - Contains localized texts for each language (if included)

## Import Instructions

1. Create a new project in Go Flow
2. Use the Import function and select this ZIP file
3. Choose which timeline to import into

## Technical Details

- Export Format: ZIP archive
- Protocol Version: 5
- Timeline: ${currentTimelineName} (ID: ${currentTimelineId})
- Exported At: ${new Date().toISOString()}
`;

    zip.file('README.md', readmeContent);

    // Генерируем ZIP архив
    const archiveContentAsBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'STORE'
    });

    const archiveContent = archiveContentAsBuffer.toString('base64');
    const archiveFilename = `${projectName.replace(/\s+/g, '_')}-${currentTimelineId.slice(-8)}_export.zip`;

    // Скачиваем ZIP файл
    downloadFile(archiveContent, archiveFilename, 'application/zip', true);

    // Отправляем событие экспорта (не нужно ждать завершения)
    trackProjectExport(metricsParams, 'JSON', isSidebarOpened, projectId, currentTimelineId).catch((err) => {
      console.error('Error sending analytics event:', err);
    });
  };

  // Функция экспорта в HTML
  const exportToHTML = async () => {
    // Принудительно сохраняем актуальные данные перед экспортом
    await useGraphStore.getState().saveToDb();

    // Получаем переменные из хранилища
    const variables = useVariablesStore.getState().variables;

    // Собираем аналитику для экспорта
    const metricsParams = getAggregatedPlayParams(layers, variables, 'PlayBar');

    const {nodes, edges} = prepareDataForHTML(layers);
    const htmlTemplate = generateHTMLTemplate(projectName, {nodes, edges});

    // Создаем и скачиваем HTML файл
    const blob = new Blob([htmlTemplate], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.html`;

    // Скачиваем файл
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Отправляем событие экспорта (не нужно ждать завершения)
    trackProjectExport(metricsParams, 'HTML', isSidebarOpened, projectId, currentTimelineId).catch((err) => {
      console.error('Error sending analytics event:', err);
    });
  };

  // Функция экспорта в Ren'Py
  const exportToRenpy = async () => {
    try {
      // Принудительно сохраняем актуальные данные перед экспортом
      await useGraphStore.getState().saveToDb();

      // Получаем переменные из хранилища
      const variables = useVariablesStore.getState().variables;

      // Собираем аналитику для экспорта
      const metricsParams = getAggregatedPlayParams(layers, variables, 'PlayBar');

      // Преобразуем layers в nodes и edges для экспорта
      const {nodes, edges} = prepareDataForHTML(layers);

      // Подготавливаем данные в формате StoryData
      const storyData = {
        title: projectName,
        data: {
          nodes,
          edges,
          variables
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          exportedAt: new Date().toISOString(),
          protocolVersion: 2
        }
      };

      // Создаем сервис экспорта и выполняем экспорт
      const exportService = ExportServiceFactory.create();
      const config = exportService.getDefaultConfig(ExportFormat.RENPY);

      // Настраиваем конфигурацию
      config.includeComments = true;
      config.generateReadme = true;

      const result = await exportService.exportStory(storyData, config);

      if (result.success) {
        if (result.metadata?.filename && result.metadata?.isBase64) {
          downloadFile(result.content, result.metadata.filename, 'application/zip', true);
        } else if (result.metadata?.filename) {
          downloadFile(result.content, result.metadata.filename, 'text/plain');
        }

        trackProjectExport(metricsParams, 'RENPY', isSidebarOpened, projectId, currentTimelineId).catch((err) => {
          console.error('Error sending analytics event:', err);
        });
      } else {
        console.error("Ren'Py export failed:", result.errors);
        window.alert(t('export_modal.errors.renpy_export_failed') + (result.errors?.join(', ') || 'Unknown error'));
      }
    } catch (error) {
      console.error("Ren'Py export error:", error);
      window.alert(t('export_modal.errors.renpy_export_error'));
    }
  };

  const exportToDialogic = async () => {
    try {
      // Принудительно сохраняем актуальные данные перед экспортом
      await useGraphStore.getState().saveToDb();

      const variables = useVariablesStore.getState().variables;
      const metricsParams = getAggregatedPlayParams(layers, variables, 'PlayBar');
      const {nodes, edges} = prepareDataForHTML(layers);

      const storyData = {
        title: projectName,
        data: {
          nodes,
          edges,
          variables
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          exportedAt: new Date().toISOString(),
          protocolVersion: 2
        }
      };

      const exportService = ExportServiceFactory.create();
      const config = exportService.getDefaultConfig(ExportFormat.DIALOGIC);
      config.includeComments = true;
      config.generateReadme = true;

      const result = await exportService.exportStory(storyData, config);

      if (result.success) {
        if (result.metadata?.filename && result.metadata?.isBase64) {
          downloadFile(result.content, result.metadata.filename, 'application/zip', true);
        } else if (result.metadata?.filename) {
          downloadFile(result.content, result.metadata.filename, 'text/plain');
        }

        trackProjectExport(metricsParams, 'DIALOGIC', isSidebarOpened, projectId, currentTimelineId).catch((err) => {
          console.error('Error sending analytics event:', err);
        });
      } else {
        console.error('Dialogic export failed:', result.errors);
        window.alert(t('export_modal.errors.dialogic_export_failed') + (result.errors?.join(', ') || 'Unknown error'));
      }
    } catch (error) {
      console.error('Dialogic export error:', error);
      window.alert(t('export_modal.errors.dialogic_export_error'));
    }
  };

  const handleExport = async () => {
    if (selectedFormat === 'json') {
      await exportToJSON();
    } else if (selectedFormat === 'html') {
      await exportToHTML();
    } else if (selectedFormat === 'renpy') {
      await exportToRenpy();
    } else if (selectedFormat === 'dialogic') {
      await exportToDialogic();
    }

    // Закрываем окно экспорта после скачивания
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialog_overlay} />
        <Dialog.Content className={styles.dialog_content}>
          <div className={styles.modal_container}>
            <div className={styles.text_container}>
              <Dialog.Title className={styles.dialog_title}>{t('export_modal.timeline_export_title', 'Экспорт таймлайна {{name}}', {name: getCurrentTimelineName()})}</Dialog.Title>
              <Dialog.Description asChild>
                <Text size='2' className={styles.description}>
                  {t('export_modal.description')}
                </Text>
              </Dialog.Description>
            </div>

            <div className={styles.slot_container}>
              <div className={styles.export_options}>
                <RadioGroup.Root className={styles.radio_group_root} defaultValue={selectedFormat} onValueChange={setSelectedFormat}>
                  {exportFormats.map((format) => (
                    <div key={format.id} className={`${styles.radio_option} ${format.disabled ? styles.disabled : ''}`}>
                      <label className={styles.radio_label} htmlFor={format.id}>
                        <RadioGroup.Item className={styles.radio_item} value={format.id} id={format.id} disabled={format.disabled}>
                          <RadioGroup.Indicator className={styles.radio_indicator}>
                            <CheckIcon className={styles.check_icon} />
                          </RadioGroup.Indicator>
                        </RadioGroup.Item>
                        <span>{format.label}</span>
                      </label>
                    </div>
                  ))}
                </RadioGroup.Root>

                <Text as='p' size='2' color='gray' className={styles.format_description}>
                  {exportFormats.find((f) => f.id === selectedFormat)?.description}
                </Text>

                {/* Чек-лист для JSON экспорта */}
                {selectedFormat === 'json' && (
                  <div className={styles.json_options}>
                    <Text as='p' size='2' weight='medium' className={styles.options_title}>
                      {t('export_modal.json_options.title')}
                    </Text>

                    <div className={styles.checkbox_group}>
                      <label className={styles.checkbox_label}>
                        <input type='checkbox' checked={jsonExportOptions.includeGraph} disabled={true} className={styles.checkbox} />
                        <span className={styles.checkbox_text}>{t('export_modal.json_options.include_graph')}</span>
                        <Text as='span' size='1' color='gray' className={styles.required_label}>
                          ({t('export_modal.json_options.required')})
                        </Text>
                      </label>

                      <label className={styles.checkbox_label}>
                        <input
                          type='checkbox'
                          checked={jsonExportOptions.includeEntities}
                          onChange={(e) =>
                            setJsonExportOptions((prev) => ({
                              ...prev,
                              includeEntities: e.target.checked
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span className={styles.checkbox_text}>{t('export_modal.json_options.include_entities')}</span>
                      </label>

                      <label className={styles.checkbox_label}>
                        <input
                          type='checkbox'
                          checked={jsonExportOptions.includeKnowledge}
                          onChange={(e) =>
                            setJsonExportOptions((prev) => ({
                              ...prev,
                              includeKnowledge: e.target.checked
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span className={styles.checkbox_text}>{t('export_modal.json_options.include_knowledge')}</span>
                      </label>

                      <label className={styles.checkbox_label}>
                        <input
                          type='checkbox'
                          checked={jsonExportOptions.includeLocalization}
                          onChange={(e) =>
                            setJsonExportOptions((prev) => ({
                              ...prev,
                              includeLocalization: e.target.checked
                            }))
                          }
                          className={styles.checkbox}
                        />
                        <span className={styles.checkbox_text}>{t('export_modal.json_options.include_localization')}</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.button_container}>
              <Button variant='soft' color='gray' onClick={() => onOpenChange(false)} className={styles.cancel_button}>
                {t('export_modal.cancel_button')}
              </Button>
              <Button variant='solid' onClick={handleExport} className={styles.export_button} disabled={exportFormats.find((f) => f.id === selectedFormat)?.disabled}>
                <div className={styles.export_button_content}>
                  <Image src='/images/download_icon.svg' alt='Download' width={20} height={20} className={styles.download_icon} />
                  <span>{t('export_modal.export_button')}</span>
                </div>
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button className={styles.dialog_close_button}>
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ExportModal;

// Экспортируем функцию prepareDataForHTML чтобы использовать в PlayBar
export {prepareDataForHTML};
