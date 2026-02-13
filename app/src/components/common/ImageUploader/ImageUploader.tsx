import React, {useCallback, useEffect, useRef, useState} from 'react';

import {ImageUploadGCSRequest, MediaValue} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {useCurrentProject} from '../../../hooks/useCurrentProject';
import {imageGCSService} from '../../../services/imageGCS.service';
import {useTeamStore} from '../../../store/useTeamStore';
import {isOSS} from '../../../utils/edition';
import {isGCSMediaValue} from '../../../utils/imageAdapterUtils';
import {fileToDataUrl, validateImageFile} from '../../../utils/imageCompression';

import styles from './ImageUploader.module.scss';

// Интерфейс для временного хранения файла
export interface TemporaryImageResult {
  file: File;
  previewUrl: string;
  filename: string;
  // AI generation metadata
  isAIGenerated?: boolean;
  aiProvider?: 'openai' | 'gemini' | 'anthropic';
  aiModel?: string;
  generatedAt?: Date;
}

// Для совместимости (используется в EntityForm)
export interface ImageUploadGCSResult {
  mediaValue: MediaValue;
  filename: string;
}

interface ImageUploaderProps {
  entityId?: string; // Опциональный только для новых сущностей
  parameterId: string;
  onTemporaryImageSelected: (result: TemporaryImageResult | null) => void; // Единственная логика для временного хранения
  onImageDeleted?: (parameterId: string) => void; // Вызывается при удалении существующего изображения
  onError: (error: string) => void;
  disabled?: boolean;
  currentMediaValue?: MediaValue; // GCS MediaValue для превью сохраненных файлов
  currentTemporaryFile?: TemporaryImageResult; // Временный файл для превью
  placeholder?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  entityId,
  parameterId,
  onTemporaryImageSelected,
  onImageDeleted,
  onError,
  disabled = false,
  currentMediaValue,
  currentTemporaryFile,
  placeholder,
  className
}) => {
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();
  const {currentTeam} = useTeamStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронизируем превью с GCS MediaValue или временным файлом
  useEffect(() => {
    if (currentTemporaryFile) {
      // Показываем превью временного файла
      setPreviewUrl(currentTemporaryFile.previewUrl);
    } else if (isGCSMediaValue(currentMediaValue) && (currentTeam?.id || isOSS()) && projectId && entityId && parameterId) {
      // Генерируем thumbnail proxy URL для превью сохраненного файла с cache busting
      const teamId = currentTeam?.id || 'local';
      const thumbnailUrl = imageGCSService.getThumbnailProxyUrl(teamId, projectId, entityId, parameterId, currentMediaValue);
      setPreviewUrl(thumbnailUrl);
    } else {
      // Нет валидного изображения - показываем placeholder
      setPreviewUrl(null);
    }
  }, [currentMediaValue, currentTemporaryFile, currentTeam?.id, projectId, entityId, parameterId]);

  const defaultPlaceholder = placeholder || t('image_uploader.placeholder', 'Перетащите изображение сюда или нажмите для выбора');

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (disabled) return;

      // Валидация файла
      const validation = validateImageFile(file);
      if (!validation.valid) {
        onError(validation.error || t('image_uploader.invalid_file', 'Некорректный файл'));
        return;
      }

      // Сохраняем файл временно для загрузки при сохранении
      try {
        setIsProcessing(true);

        // Создаем URL для превью
        const previewUrl = URL.createObjectURL(file);

        const temporaryResult: TemporaryImageResult = {
          file,
          previewUrl,
          filename: file.name
        };

        onTemporaryImageSelected(temporaryResult);

        console.log('📁 Image selected for deferred upload:', file.name);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('image_uploader.processing_error', 'Ошибка обработки изображения');
        onError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [disabled, onTemporaryImageSelected, onError, t]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [disabled, handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
      // Сбрасываем значение input для возможности повторной загрузки того же файла
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const clearImage = useCallback(() => {
    // Очищаем временный файл
    if (currentTemporaryFile) {
      URL.revokeObjectURL(currentTemporaryFile.previewUrl); // Освобождаем память
      onTemporaryImageSelected(null); // Сигнализируем об удалении временного файла
    }

    // Если есть существующее валидное изображение в GCS, помечаем для удаления
    if (isGCSMediaValue(currentMediaValue) && onImageDeleted) {
      onImageDeleted(parameterId);
    }

    setPreviewUrl(null);
  }, [onTemporaryImageSelected, onImageDeleted, currentTemporaryFile, currentMediaValue, parameterId]);

  return (
    <div
      className={`${styles.imageUploader} ${className || ''} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp' onChange={handleFileInputChange} style={{display: 'none'}} disabled={disabled} />

      {isProcessing ? (
        <div className={styles.processing}>
          <div className={styles.spinner}></div>
          <span>{t('image_uploader.uploading_gcs', 'Загрузка в облако...')}</span>
        </div>
      ) : previewUrl ? (
        <div className={styles.preview}>
          <img src={previewUrl} alt='Preview' className={styles.previewImage} />

          {/* AI Badge */}
          {(currentTemporaryFile?.isAIGenerated || currentMediaValue?.thumbnail?.metadata?.isAIGenerated || currentMediaValue?.original?.metadata?.isAIGenerated) && (
            <div className={styles.aiBadge} title={t('image_uploader.ai_generated', 'Сгенерировано ИИ')}>
              🤖 AI
            </div>
          )}

          <div className={styles.previewOverlay}>
            <button
              type='button'
              className={styles.clearButton}
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              disabled={disabled}
              title={t('image_uploader.remove', 'Удалить изображение')}
            >
              ✕
            </button>
            <button type='button' className={styles.changeButton} onClick={handleClick} disabled={disabled}>
              {t('image_uploader.change', 'Изменить')}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.uploadIcon}>📷</div>
          <p>{defaultPlaceholder}</p>
          <p className={styles.supportedFormats}>{t('image_uploader.supported_formats_gcs', 'Поддерживаемые форматы: JPEG, PNG, WebP (до 10MB)')}</p>
          <p className={styles.info}>{t('image_uploader.deferred_info', 'Изображение будет загружено при сохранении формы')}</p>
        </div>
      )}
    </div>
  );
};

// Функция для загрузки временного файла (используется извне при сохранении)
export const uploadTemporaryFileToGCS = async (temporaryFile: TemporaryImageResult, targetEntityId: string, parameterId: string, projectId: string, teamId: string): Promise<MediaValue> => {
  // Конвертируем файл в base64 для отправки
  const base64Data = await fileToDataUrl(temporaryFile.file);

  const uploadRequest: ImageUploadGCSRequest = {
    teamId,
    projectId,
    entityId: targetEntityId,
    parameterId,
    imageData: base64Data,
    filename: temporaryFile.filename,
    // Передаем AI метаданные если есть
    aiMetadata: temporaryFile.isAIGenerated
      ? {
          isAIGenerated: temporaryFile.isAIGenerated,
          aiProvider: temporaryFile.aiProvider,
          aiModel: temporaryFile.aiModel,
          generatedAt: temporaryFile.generatedAt
        }
      : undefined
  };

  // Загружаем в GCS
  const mediaValue = await imageGCSService.uploadImage(uploadRequest);

  console.log('🖼️ Deferred GCS Upload Result:', {
    uploadRequest,
    mediaValue,
    hasGCSPath: !!mediaValue.thumbnail?.gcsPath,
    isAIGenerated: temporaryFile.isAIGenerated
  });

  // Освобождаем память от временного URL
  URL.revokeObjectURL(temporaryFile.previewUrl);

  return mediaValue;
};

export default ImageUploader;
