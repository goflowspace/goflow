import React, {useEffect, useState} from 'react';

import {usePipelinePricing} from '@hooks/usePipelinePricing';
import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {DownloadIcon, LightningBoltIcon} from '@radix-ui/react-icons';
import {Button} from '@radix-ui/themes';
import {trackEntityCreated, trackEntityGenerateImageLaunch, trackEntityImageDownload, trackEntityImageUpload} from '@services/analytics';
import {api} from '@services/api';
import {CreateEntityDto, Entity, EntityParameter, EntityType, MediaValue, MultiEntityValue, PARAMETER_VALUE_TYPE_LABELS, SingleEntityValue, UpdateEntityDto} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {MultiSelect} from '@components/common';
import {NoAIAccessModal} from '@components/common/NoAIAccessModal';

import {useCurrentProject} from '../../../../hooks/useCurrentProject';
import {imageGCSService} from '../../../../services/imageGCS.service';
import {useTeamStore} from '../../../../store/useTeamStore';
import {isOSS} from '../../../../utils/edition';
import {isGCSMediaValue} from '../../../../utils/imageAdapterUtils';
import {dataUrlToFile} from '../../../../utils/imageCompression';
import ImageUploader, {TemporaryImageResult, uploadTemporaryFileToGCS} from '../../../common/ImageUploader/ImageUploader';
import EntityImagePipelineModal from './EntityImagePipelineModal';
import {EntitySelector} from './EntitySelector';

import s from './EntityForm.module.css';

interface EntityFormProps {
  projectId: string;
  entity: Entity | null;
  entityTypes: EntityType[]; // Типы сущностей с бэкенда
  onSave: (entity: Entity) => void;
  onCancel: () => void;
  defaultEntityTypeId?: string; // Тип сущности по умолчанию для новых сущностей
}

interface FormData {
  name: string;
  entityTypeId: string; // Изменено с entityType на entityTypeId
  description: string;
  image: MediaValue | undefined;
  values: Record<string, any>;
  // Временные файлы для отложенной загрузки
  temporaryImageFile?: TemporaryImageResult;
  temporaryParameterFiles: Record<string, TemporaryImageResult>;
  // Отслеживание удаленных изображений для удаления из GCS
  isMainImageDeleted: boolean;
  deletedParameterImages: Set<string>; // parameterId изображений, помеченных для удаления
}

interface FormErrors {
  name?: string;
  entityTypeId?: string; // Изменено с entityType на entityTypeId
  [key: string]: string | undefined;
}

export const EntityForm: React.FC<EntityFormProps> = ({projectId, entity, entityTypes, onSave, onCancel, defaultEntityTypeId}) => {
  const {t} = useTranslation();
  const {getFormattedPrice} = usePipelinePricing();
  const {projectId: currentProjectId} = useCurrentProject();
  const {currentTeam} = useTeamStore();
  const [parameters, setParameters] = useState<EntityParameter[]>([]);
  const [_loadingParameters, setLoadingParameters] = useState(false);

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  // Функция для загрузки параметров типа
  const loadParametersForType = async (typeId: string) => {
    if (!typeId) {
      setParameters([]);
      return;
    }

    setLoadingParameters(true);
    try {
      const entityType = await api.getEntityType(projectId, typeId);
      // Извлекаем параметры из связки EntityTypeParameter
      const typeParameters = entityType.parameters?.map((tp) => tp.parameter).filter(Boolean) || [];
      setParameters(typeParameters as EntityParameter[]);
    } catch (error) {
      console.error(t('dashboard.entities.errors.failed_load_parameters', 'Не удалось загрузить параметры для типа:'), error);
      setParameters([]);
    } finally {
      setLoadingParameters(false);
    }
  };

  // Инициализируем данные формы
  const [formData, setFormData] = useState<FormData>(() => {
    const initialValues: Record<string, any> = {};

    if (entity) {
      // Загружаем существующие значения
      entity.values?.forEach((value) => {
        initialValues[value.parameterId] = value.value;
      });
    }

    return {
      name: entity?.name || '',
      entityTypeId: entity?.entityTypeId || defaultEntityTypeId || entityTypes[0]?.id || '',
      description: entity?.description || '',
      image: entity?.image || undefined,
      values: initialValues,
      temporaryImageFile: undefined,
      temporaryParameterFiles: {},
      isMainImageDeleted: false,
      deletedParameterImages: new Set<string>()
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptComment, setPromptComment] = useState('');
  const [showImagePipelineModal, setShowImagePipelineModal] = useState(false);
  const [forceImageRefresh, setForceImageRefresh] = useState(0); // Для принудительного обновления изображений

  // Функция для очистки временных файлов при отмене
  const cleanupTemporaryFiles = () => {
    // Очищаем главное изображение
    if (formData.temporaryImageFile) {
      URL.revokeObjectURL(formData.temporaryImageFile.previewUrl);
    }

    // Очищаем изображения параметров
    Object.values(formData.temporaryParameterFiles).forEach((tempFile) => {
      if (tempFile) {
        URL.revokeObjectURL(tempFile.previewUrl);
      }
    });

    // Сбрасываем флаги удаления (пользователь отменил изменения)
    setFormData((prev) => ({
      ...prev,
      temporaryImageFile: undefined,
      temporaryParameterFiles: {},
      isMainImageDeleted: false,
      deletedParameterImages: new Set<string>()
    }));
  };

  // Обработчик отмены с очисткой временных файлов
  const handleCancel = () => {
    cleanupTemporaryFiles();
    onCancel();
  };

  // Получаем цену генерации изображения
  const imageGenerationPrice = getFormattedPrice('entity-image-generation-pipeline-v2');

  // Загружаем параметры при изменении типа
  useEffect(() => {
    loadParametersForType(formData.entityTypeId);
  }, [formData.entityTypeId, projectId]);

  // Очищаем временные файлы при размонтировании компонента
  useEffect(() => {
    return () => {
      cleanupTemporaryFiles();
    };
  }, []);

  // Функция генерации изображения с помощью ИИ (открывает модальное окно пайплайна)
  const handleGenerateImage = async () => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    if (!entity?.id) {
      window.alert(t('dashboard.entities.errors.save_entity_first', 'Сначала сохраните сущность, чтобы сгенерировать изображение'));
      return;
    }

    // Открываем модальное окно пайплайна
    setShowImagePipelineModal(true);
  };

  // Функция для выполнения генерации через пайплайн
  const handleGenerateImageWithPipeline = async (customPromptRequirements?: string[], imageProvider: 'gemini' | 'openai' = 'gemini', imageQuality: 'low' | 'medium' | 'high' | 'auto' = 'low') => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    if (!entity?.id) {
      return;
    }

    try {
      setIsGeneratingImage(true);

      // Трекинг запуска генерации изображения сущности
      const selectedEntityType = entityTypes.find((et) => et.id === entity.entityTypeId);
      const totalPromptLength = (customPromptRequirements || []).join(' ').length;
      trackEntityGenerateImageLaunch(entity.id, selectedEntityType?.name || 'unknown', totalPromptLength, projectId);

      // Генерируем изображение через новый пайплайн API
      const result = await api.generateEntityImageWithPipeline(projectId, entity.id, {
        customPromptRequirements,
        imageProvider,
        imageQuality,
        userSettings: {
          preferredProvider: 'anthropic',
          preferredModel: 'claude-3-5-sonnet-latest',
          creativityLevel: 0.8
        }
      });

      if (result.success && result.data?.finalImage?.processedImage) {
        // Преобразуем сгенерированное ИИ изображение в TemporaryImageResult для корректной обработки ImageUploader
        const processedImageData = result.data.finalImage.processedImage;

        // Проверяем что это LegacyMediaValue с dataUrl
        if (processedImageData && processedImageData.original && processedImageData.original.dataUrl) {
          try {
            // Конвертируем dataUrl в File объект
            const generatedFile = dataUrlToFile(processedImageData.original.dataUrl, `ai-generated-${entity.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`);

            // Создаем TemporaryImageResult с AI метаданными
            const temporaryResult: TemporaryImageResult = {
              file: generatedFile,
              previewUrl: processedImageData.original.dataUrl,
              filename: generatedFile.name,
              isAIGenerated: true,
              aiProvider: (result.data.finalImage?.metadata?.provider || imageProvider) as 'openai' | 'gemini' | 'anthropic',
              aiModel: result.data.finalImage?.metadata?.model || 'imagen-3.0-generate-002',
              generatedAt: new Date()
            };

            // Сохраняем как временный файл для загрузки при сохранении
            setFormData((prev) => ({
              ...prev,
              temporaryImageFile: temporaryResult,
              isMainImageDeleted: false
            }));

            console.log(`🎨 AI Pipeline Image converted to temporary file! Entity: ${entity.name}, Cost: ${result.data.metadata?.totalCost}, Time: ${result.data.metadata?.executionTime}ms`);
          } catch (conversionError) {
            console.error('Failed to convert AI generated image to temporary file:', conversionError);
            throw new Error('Failed to process AI generated image');
          }
        } else {
          throw new Error('AI generated image has invalid format');
        }
      } else {
        throw new Error(result.message || 'Image generation pipeline failed');
      }
    } catch (error) {
      console.error('Error generating image with pipeline:', error);
      const errorMessage = error instanceof Error ? error.message : t('dashboard.entities.errors.unknown', 'Неизвестная ошибка');
      window.alert(t('dashboard.entities.errors.image_generation_failed', 'Ошибка генерации изображения: {{error}}', {error: errorMessage}));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Функция для подтверждения генерации с комментарием (использует старое API)
  const handleConfirmGenerateWithPrompt = async () => {
    if (!entity?.id) {
      return;
    }

    setShowPromptModal(false);

    try {
      setIsGeneratingImage(true);

      // Используем старое API для генерации с пользовательским промптом
      const result = await api.generateEntityImage(projectId, entity.id, {
        aspectRatio: '1:1',
        safetyFilterLevel: 'standard',
        customPrompt: promptComment.trim() || undefined
      });

      if (result.success && result.data?.processedImage) {
        // Старое API возвращает только dataUrl строку, конвертируем в TemporaryImageResult
        try {
          // Конвертируем dataUrl в File объект
          const generatedFile = dataUrlToFile(result.data.processedImage, `ai-generated-${entity.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`);

          // Создаем TemporaryImageResult с AI метаданными
          const temporaryResult: TemporaryImageResult = {
            file: generatedFile,
            previewUrl: result.data.processedImage,
            filename: generatedFile.name,
            isAIGenerated: true,
            aiProvider: 'gemini', // старое API использует только Gemini
            aiModel: 'imagen-3.0-generate-002',
            generatedAt: new Date()
          };

          // Сохраняем как временный файл для загрузки при сохранении
          setFormData((prev) => ({
            ...prev,
            temporaryImageFile: temporaryResult,
            isMainImageDeleted: false
          }));

          console.log(`🎨 AI Image with custom prompt converted to temporary file! Model: ${result.data.metadata?.model}`);
        } catch (conversionError) {
          console.error('Failed to convert AI generated image to temporary file:', conversionError);
          throw new Error('Failed to process AI generated image');
        }
      } else {
        throw new Error(result.message || 'Image generation failed');
      }
    } catch (error) {
      console.error('Error generating image with custom prompt:', error);
      const errorMessage = error instanceof Error ? error.message : t('dashboard.entities.errors.unknown', 'Неизвестная ошибка');
      window.alert(t('dashboard.entities.errors.image_generation_failed', 'Ошибка генерации изображения: {{error}}', {error: errorMessage}));
    } finally {
      setIsGeneratingImage(false);
    }

    setPromptComment('');
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('dashboard.entities.errors.name_required', 'Имя сущности обязательно');
    }

    if (!formData.entityTypeId) {
      newErrors.entityTypeId = t('dashboard.entities.errors.type_required', 'Тип сущности обязателен');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработка изменения основных полей
  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));

    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Обработка изменения значений параметров
  const handleParameterChange = (parameterId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [parameterId]: value
      }
    }));
  };

  // Функция для скачивания GCS изображения
  const downloadGCSImage = async (mediaValue: MediaValue, parameterName: string, version: 'original' | 'optimized' = 'optimized') => {
    const teamId = currentTeam?.id || (isOSS() ? 'local' : null);
    if (!entity?.id || !teamId || !currentProjectId) return;

    try {
      console.log('Downloading GCS image:', mediaValue);

      if (!isGCSMediaValue(mediaValue)) {
        window.alert(t('dashboard.entities.errors.invalid_image_format', 'Неподдерживаемый формат изображения'));
        return;
      }

      // Получаем signed URL для скачивания
      const signedUrl = await imageGCSService.getSignedUrl(
        teamId,
        currentProjectId,
        entity.id,
        'entity-avatar', // или parameterId для параметров
        version
      );

      // Открываем изображение в новой вкладке для скачивания
      window.open(signedUrl, '_blank');

      // Трекинг скачивания изображения сущности
      trackEntityImageDownload(entity.id, entity.entityType?.name || 'unknown', projectId);

      console.log('GCS image download initiated');
    } catch (error) {
      console.error('Ошибка при скачивании GCS изображения:', error);
      window.alert(t('dashboard.entities.errors.download_error', 'Ошибка при скачивании изображения'));
    }
  };

  // Сохранение формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const teamId = currentTeam?.id || (isOSS() ? 'local' : null);
    if (!teamId) {
      console.error('Missing team information');
      return;
    }

    setIsLoading(true);

    try {
      // Сначала создаем или обновляем сущность без изображений
      let savedEntity: Entity;

      const entityData: CreateEntityDto | UpdateEntityDto = {
        name: formData.name.trim(),
        entityTypeId: formData.entityTypeId,
        description: formData.description.trim() || undefined,
        image: formData.image || undefined,
        values: formData.values
      };

      if (entity) {
        // Обновляем существующую сущность
        savedEntity = await api.updateEntity(projectId, entity.id, entityData as UpdateEntityDto);
      } else {
        // Создаем новую сущность
        savedEntity = await api.createEntity(projectId, entityData as CreateEntityDto);

        // Трекинг создания сущности вручную
        const selectedEntityType = entityTypes.find((et) => et.id === savedEntity.entityTypeId);
        trackEntityCreated(savedEntity.id, selectedEntityType?.name || 'unknown', 'Manual', 'Workspace', projectId);
      }

      console.log('🔄 Entity saved, now handling image operations...');

      // 1. Сначала удаляем помеченные для удаления изображения из GCS
      if (entity?.id) {
        // Удаляем главное изображение, если помечено
        if (formData.isMainImageDeleted && entity.image) {
          try {
            await imageGCSService.deleteImage(teamId, projectId, entity.id, 'entity-avatar');
            console.log('✅ Main entity image deleted from GCS');
          } catch (error) {
            console.error('❌ Failed to delete main entity image:', error);
          }
        }

        // Удаляем изображения параметров, если помечены
        for (const parameterId of formData.deletedParameterImages) {
          try {
            await imageGCSService.deleteImage(teamId, projectId, entity.id, parameterId);
            console.log(`✅ Parameter image deleted from GCS for parameter ${parameterId}`);
          } catch (error) {
            console.error(`❌ Failed to delete parameter image for ${parameterId}:`, error);
          }
        }
      }

      // 2. Теперь загружаем новые временные файлы в GCS
      let finalEntityData = {...savedEntity};

      // 3. Загружаем главное изображение сущности, если есть
      if (formData.temporaryImageFile) {
        try {
          const uploadedImageMediaValue = await uploadTemporaryFileToGCS(formData.temporaryImageFile, savedEntity.id, 'entity-avatar', projectId, teamId);

          // Обновляем сущность с загруженным изображением
          const updatedEntityWithImage = await api.updateEntity(projectId, savedEntity.id, {
            ...entityData,
            image: uploadedImageMediaValue
          } as UpdateEntityDto);

          finalEntityData = updatedEntityWithImage;

          trackEntityImageUpload(savedEntity.id, savedEntity.entityType?.name || 'unknown', projectId);
          console.log('✅ Entity main image uploaded to GCS');
        } catch (error) {
          console.error('❌ Failed to upload entity main image:', error);
          window.alert(t('dashboard.entities.errors.image_upload_failed', 'Не удалось загрузить главное изображение сущности'));
        }
      }

      // 4. Подготавливаем значения параметров с учетом удалений
      const updatedValues = {...formData.values};

      // Очищаем значения удаленных изображений параметров
      for (const deletedParameterId of formData.deletedParameterImages) {
        updatedValues[deletedParameterId] = null; // Устанавливаем null для удаленных изображений
      }

      // 5. Загружаем новые изображения параметров
      for (const [parameterId, temporaryFile] of Object.entries(formData.temporaryParameterFiles)) {
        if (temporaryFile) {
          try {
            const uploadedParameterMediaValue = await uploadTemporaryFileToGCS(temporaryFile, savedEntity.id, parameterId, projectId, teamId);

            updatedValues[parameterId] = uploadedParameterMediaValue;

            trackEntityImageUpload(savedEntity.id, savedEntity.entityType?.name || 'unknown', projectId);
            console.log(`✅ Parameter image uploaded to GCS for parameter ${parameterId}`);
          } catch (error) {
            console.error(`❌ Failed to upload parameter image for ${parameterId}:`, error);
            window.alert(t('dashboard.entities.errors.parameter_image_upload_failed', 'Не удалось загрузить изображение для параметра: {{parameter}}', {parameter: parameterId}));
          }
        }
      }

      // 5. Финальное обновление сущности со всеми изменениями
      const needsUpdate = Object.keys(updatedValues).some((key) => updatedValues[key] !== formData.values[key]) || formData.isMainImageDeleted || formData.deletedParameterImages.size > 0;

      if (needsUpdate) {
        const updatePayload = {
          ...entityData,
          image: formData.isMainImageDeleted ? null : finalEntityData.image, // Явно устанавливаем null для удаления
          values: updatedValues
        } as UpdateEntityDto;

        const finalEntityData2 = await api.updateEntity(projectId, savedEntity.id, updatePayload);

        finalEntityData = finalEntityData2;
        console.log('✅ Entity updated with all image changes');
      }

      // Принудительно обновляем локальное состояние формы для корректного отображения
      if (formData.isMainImageDeleted || formData.deletedParameterImages.size > 0) {
        setFormData((prev) => ({
          ...prev,
          image: formData.isMainImageDeleted ? undefined : prev.image,
          isMainImageDeleted: false,
          deletedParameterImages: new Set<string>(), // Сбрасываем флаги удаления
          temporaryImageFile: undefined,
          temporaryParameterFiles: {}
        }));

        // Принудительно обновляем все изображения в UI
        setForceImageRefresh((prev) => prev + 1);
      }

      onSave(finalEntityData);
    } catch (error) {
      console.error(t('dashboard.entities.errors.save_failed', 'Не удалось сохранить сущность:'), error);
      // TODO: Показать уведомление об ошибке
    } finally {
      setIsLoading(false);
    }
  };

  // Рендер поля параметра в зависимости от типа
  const renderParameterField = (parameter: EntityParameter) => {
    const value = formData.values[parameter.id];

    switch (parameter.valueType) {
      case 'SHORT_TEXT':
        return (
          <input
            type='text'
            value={value || ''}
            onChange={(e) => handleParameterChange(parameter.id, e.target.value)}
            className={s.input}
            placeholder={t('dashboard.entities.parameter_placeholder', 'Введите значение...')}
          />
        );

      case 'TEXT':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleParameterChange(parameter.id, e.target.value)}
            className={s.textarea}
            placeholder={t('dashboard.entities.parameter_placeholder', 'Введите значение...')}
          />
        );

      case 'NUMBER':
        return (
          <input
            type='number'
            value={value || ''}
            onChange={(e) => handleParameterChange(parameter.id, e.target.value ? Number(e.target.value) : null)}
            className={s.input}
            placeholder={t('dashboard.entities.parameter_number_placeholder', 'Введите число...')}
          />
        );

      case 'BOOLEAN':
        return (
          <div className={s.booleanField}>
            <label className={s.checkboxLabel}>
              <input type='checkbox' checked={Boolean(value)} onChange={(e) => handleParameterChange(parameter.id, e.target.checked)} className={s.checkbox} />
              <span className={s.checkboxText}>{value ? t('dashboard.entities.yes', 'Да') : t('dashboard.entities.no', 'Нет')}</span>
            </label>
          </div>
        );

      case 'SINGLE_SELECT':
        return (
          <select value={value || ''} onChange={(e) => handleParameterChange(parameter.id, e.target.value)} className={s.select}>
            <option value=''>{t('dashboard.entities.select_option', 'Выберите опцию...')}</option>
            {parameter.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'MULTI_SELECT':
        return (
          <MultiSelect
            options={parameter.options}
            value={Array.isArray(value) ? value : []}
            onChange={(newValue) => handleParameterChange(parameter.id, newValue)}
            placeholder={t('dashboard.entities.select_multiple', 'Выберите опции...')}
          />
        );

      case 'MEDIA':
        return (
          <div className={s.mediaFieldContainer}>
            <ImageUploader
              key={`param-image-${parameter.id}-${forceImageRefresh}`}
              entityId={entity?.id}
              parameterId={parameter.id}
              onTemporaryImageSelected={(result: TemporaryImageResult | null) => {
                try {
                  if (result === null) {
                    // Удаление временного изображения
                    setFormData((prev) => {
                      const newTemporaryFiles = {...prev.temporaryParameterFiles};
                      delete newTemporaryFiles[parameter.id];
                      return {
                        ...prev,
                        temporaryParameterFiles: newTemporaryFiles
                      };
                    });
                  } else {
                    // Сохранение временного изображения
                    setFormData((prev) => {
                      const newDeletedImages = new Set(prev.deletedParameterImages);
                      newDeletedImages.delete(parameter.id); // Убираем из удаленных при загрузке нового

                      return {
                        ...prev,
                        temporaryParameterFiles: {
                          ...prev.temporaryParameterFiles,
                          [parameter.id]: result
                        },
                        deletedParameterImages: newDeletedImages
                      };
                    });
                  }
                } catch (error) {
                  console.error('Ошибка обработки временного изображения:', error);
                  window.alert(
                    t('dashboard.entities.errors.image_upload_error', 'Ошибка загрузки изображения: {{error}}', {
                      error: error instanceof Error ? error.message : t('dashboard.entities.errors.unknown', 'Неизвестная ошибка')
                    })
                  );
                }
              }}
              onImageDeleted={(parameterId: string) => {
                // Помечаем изображение параметра для удаления
                setFormData((prev) => {
                  const newDeletedImages = new Set(prev.deletedParameterImages);
                  newDeletedImages.add(parameterId);

                  const newValues = {...prev.values};
                  newValues[parameterId] = undefined; // Убираем значение из формы

                  const newTemporaryFiles = {...prev.temporaryParameterFiles};
                  delete newTemporaryFiles[parameterId]; // Также очищаем временный файл, если был

                  return {
                    ...prev,
                    values: newValues,
                    temporaryParameterFiles: newTemporaryFiles,
                    deletedParameterImages: newDeletedImages
                  };
                });
              }}
              onError={(error: string) => {
                console.error(t('dashboard.entities.errors.image_processing', 'Ошибка обработки изображения:'), error);
                window.alert(t('dashboard.entities.errors.image_processing_error', 'Ошибка обработки изображения: {{error}}', {error}));
              }}
              currentMediaValue={isGCSMediaValue(value) ? value : undefined}
              currentTemporaryFile={formData.temporaryParameterFiles[parameter.id]}
              placeholder={t('dashboard.entities.drag_image_here', 'Перетащите изображение сюда или нажмите для выбора')}
              className={s.mediaUploader}
            />
            {/* Кнопка скачивания для медиа полей */}
            {isGCSMediaValue(value) && entity?.id && (
              <button
                type='button'
                onClick={() => downloadGCSImage(value as MediaValue, parameter.name, 'optimized')}
                className={s.downloadButton}
                title={t('dashboard.entities.download_image', 'Скачать изображение')}
              >
                <DownloadIcon />
                {t('dashboard.entities.download', 'Скачать')}
              </button>
            )}
          </div>
        );

      case 'SINGLE_ENTITY':
        return (
          <EntitySelector
            projectId={projectId}
            value={value as SingleEntityValue}
            isMultiple={false}
            onChange={(newValue) => handleParameterChange(parameter.id, newValue)}
            placeholder={t('dashboard.entities.select_entity', 'Выберите сущность...')}
            excludeEntityId={entity?.id} // Исключаем текущую редактируемую сущность
          />
        );

      case 'MULTI_ENTITY':
        return (
          <EntitySelector
            projectId={projectId}
            value={value as MultiEntityValue}
            isMultiple={true}
            onChange={(newValue) => handleParameterChange(parameter.id, newValue)}
            placeholder={t('dashboard.entities.select_entities', 'Выберите сущности...')}
            excludeEntityId={entity?.id} // Исключаем текущую редактируемую сущность
          />
        );

      default:
        return (
          <input
            type='text'
            value={value || ''}
            onChange={(e) => handleParameterChange(parameter.id, e.target.value)}
            className={s.input}
            placeholder={t('dashboard.entities.parameter_placeholder', 'Введите значение...')}
          />
        );
    }
  };

  return (
    <div className={s.container}>
      <form onSubmit={handleSubmit} className={s.form}>
        {/* Основная информация */}
        <div className={s.formSection}>
          <h2 className={s.sectionTitle}>{t('dashboard.entities.basic_info', 'Основная информация')}</h2>

          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.label}>
                {t('dashboard.entities.entity_name', 'Имя сущности')}
                <span className={s.required}>*</span>
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={`${s.input} ${errors.name ? s.error : ''}`}
                placeholder={t('dashboard.entities.name_placeholder', 'Введите имя сущности...')}
              />
              {errors.name && <div className={s.errorMessage}>{errors.name}</div>}
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>
                {t('dashboard.entities.entity_type', 'Тип сущности')}
                <span className={s.required}>*</span>
              </label>
              <select value={formData.entityTypeId} onChange={(e) => handleFieldChange('entityTypeId', e.target.value)} className={`${s.select} ${errors.entityTypeId ? s.error : ''}`}>
                {entityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.entityTypeId && <div className={s.errorMessage}>{errors.entityTypeId}</div>}
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>{t('dashboard.entities.entity_description', 'Описание')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className={s.textarea}
              placeholder={t('dashboard.entities.description_placeholder', 'Краткое описание сущности...')}
            />
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>{t('dashboard.entities.entity_image', 'Изображение')}</label>
            <div className={s.imageSection}>
              <div className={s.aiImageActions}>
                <div className={s.aiButtonsRow}>
                  <Button
                    type='button'
                    variant='soft'
                    color='violet'
                    size='3'
                    onClick={() => handleGenerateImage()}
                    disabled={!entity?.id || isGeneratingImage || isLoading}
                    className={`${isGeneratingImage ? s.generating : ''}`}
                    title={
                      !entity?.id
                        ? t('dashboard.entities.save_entity_first_tooltip', 'Сначала сохраните сущность')
                        : t('dashboard.entities.generate_image_tooltip', 'Генерирует изображение на основе данных сущности')
                    }
                  >
                    {isGeneratingImage ? (
                      <>
                        <div className={s.loadingSpinner} />
                        <span className={s.buttonText}>✨ {t('dashboard.entities.generating_image', 'Создаю магию...')}</span>
                      </>
                    ) : (
                      <>
                        <span className={s.buttonText}>🎨 {t('dashboard.entities.generate_image', 'Сгенерировать изображение ИИ')}</span>
                        {imageGenerationPrice && imageGenerationPrice !== '—' && (
                          <span style={{marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px'}}>
                            <LightningBoltIcon style={{width: '12px', height: '12px', color: '#ffffff'}} />
                            {imageGenerationPrice}
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                  {/* Кнопка скачивания для основного изображения */}
                  {isGCSMediaValue(formData.image) && entity?.id && (
                    <Button
                      type='button'
                      variant='soft'
                      color='jade'
                      size='3'
                      onClick={() => {
                        console.log('Entity image:', formData.image); // Для отладки
                        downloadGCSImage(formData.image as MediaValue, 'entity');
                      }}
                      title={t('dashboard.entities.download_image', 'Скачать изображение')}
                    >
                      <DownloadIcon />
                      {t('dashboard.entities.download', 'Скачать')}
                    </Button>
                  )}
                </div>

                {entity?.id && <div className={s.aiImageHint}>{t('dashboard.entities.ai_image_hint', 'ИИ создаст изображение на основе всех полей сущности')}</div>}
              </div>
              <ImageUploader
                key={`main-image-${forceImageRefresh}`}
                entityId={entity?.id}
                parameterId='entity-avatar'
                onTemporaryImageSelected={(result: TemporaryImageResult | null) => {
                  try {
                    if (result === null) {
                      // Удаление временного изображения
                      setFormData((prev) => ({
                        ...prev,
                        temporaryImageFile: undefined
                      }));
                    } else {
                      // Сохранение временного изображения
                      setFormData((prev) => ({
                        ...prev,
                        temporaryImageFile: result,
                        isMainImageDeleted: false // Сбрасываем флаг удаления при загрузке нового
                      }));
                    }
                  } catch (error) {
                    console.error('Ошибка обработки временного изображения:', error);
                    window.alert(
                      t('dashboard.entities.errors.image_upload_error', 'Ошибка загрузки изображения: {{error}}', {
                        error: error instanceof Error ? error.message : t('dashboard.entities.errors.unknown', 'Неизвестная ошибка')
                      })
                    );
                  }
                }}
                onImageDeleted={(parameterId: string) => {
                  // Помечаем главное изображение для удаления
                  setFormData((prev) => ({
                    ...prev,
                    isMainImageDeleted: true,
                    temporaryImageFile: undefined, // Также очищаем временный файл, если был
                    imageUrl: undefined // Убираем из формы
                  }));
                }}
                onError={(error: string) => {
                  console.error(t('dashboard.entities.errors.image_upload', 'Ошибка загрузки изображения:'), error);
                  window.alert(t('dashboard.entities.errors.image_upload_error', 'Ошибка загрузки изображения: {{error}}', {error}));
                }}
                currentMediaValue={isGCSMediaValue(formData.image) ? formData.image : undefined}
                currentTemporaryFile={formData.temporaryImageFile}
                placeholder={t('dashboard.entities.drag_entity_image_here', 'Перетащите изображение сущности сюда или нажмите для выбора')}
                className={s.mediaUploader}
              />
            </div>
          </div>
        </div>

        {/* Параметры сущности */}
        {parameters.length > 0 && (
          <div className={s.formSection}>
            <h2 className={s.sectionTitle}>{t('dashboard.entities.parameters_title', 'Параметры сущности')}</h2>

            <div className={s.parametersGrid}>
              {parameters.map((parameter) => (
                <div key={parameter.id} className={s.parameterField}>
                  <label className={s.parameterLabel}>
                    {t(`dashboard.entities.parameters.${parameter.name}`, parameter.name)}
                    <span className={s.parameterType}>{t(`dashboard.entities.value_types.${parameter.valueType}`, PARAMETER_VALUE_TYPE_LABELS[parameter.valueType])}</span>
                  </label>
                  {renderParameterField(parameter)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Действия */}
        <div className={s.actions}>
          <Button type='button' onClick={handleCancel} disabled={isLoading} size='3' variant='soft' color='gray'>
            {t('dashboard.entities.cancel', 'Отмена')}
          </Button>
          <Button type='submit' disabled={isLoading} size='3' variant='solid'>
            {isLoading && <div className={s.loadingSpinner} />}
            {entity ? t('dashboard.entities.save_changes', 'Сохранить изменения') : t('dashboard.entities.create_entity', 'Создать сущность')}
          </Button>
        </div>
      </form>

      {/* Модальное окно для ввода комментария к промпту */}
      {showPromptModal && (
        <div className={s.modalOverlay} onClick={() => setShowPromptModal(false)}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>{t('dashboard.entities.prompt_modal_title', 'Дополнительный комментарий к промпту')}</h3>
              <button type='button' className={s.modalCloseButton} onClick={() => setShowPromptModal(false)}>
                ✕
              </button>
            </div>

            <div className={s.modalBody}>
              <p className={s.modalDescription}>{t('dashboard.entities.prompt_modal_description', 'Добавьте дополнительные детали, стиль или уточнения для генерации изображения:')}</p>

              <textarea
                value={promptComment}
                onChange={(e) => setPromptComment(e.target.value)}
                placeholder={t('dashboard.entities.prompt_placeholder', 'Например: в стиле аниме, темные тона, средневековый стиль, крупный план...')}
                className={s.promptTextarea}
                rows={4}
                maxLength={500}
              />

              <div className={s.characterCount}>{promptComment.length}/500</div>
            </div>

            <div className={s.modalFooter}>
              <button type='button' onClick={() => setShowPromptModal(false)} className={s.modalCancelButton}>
                {t('dashboard.entities.cancel', 'Отмена')}
              </button>

              <button type='button' onClick={handleConfirmGenerateWithPrompt} disabled={isGeneratingImage} className={s.modalConfirmButton}>
                🎨 {t('dashboard.entities.generate_with_comment', 'Сгенерировать с комментарием')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно пайплайна для генерации изображения */}
      <EntityImagePipelineModal
        projectId={projectId}
        entityId={entity?.id || ''}
        entityName={entity?.name || formData.name}
        isOpen={showImagePipelineModal}
        onClose={() => setShowImagePipelineModal(false)}
        onGenerate={handleGenerateImageWithPipeline}
        isLoading={isGeneratingImage}
      />

      {/* Модальное окно для отсутствия доступа к ИИ */}
      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </div>
  );
};
