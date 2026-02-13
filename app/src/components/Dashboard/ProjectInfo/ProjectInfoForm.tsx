'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';

import {useProjectBibleAI} from '@hooks/useProjectBibleAI';
import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {trackBibleEditField, trackBibleGenerateAllLaunch, trackBibleGenerateAllOpen} from '@services/analytics';
import {api} from '@services/api';
import {BibleQualityScore, getBibleQualityColor, getBibleQualityText} from '@types-folder/bibleQuality';
import {MAX_TEXT_FIELD_LENGTH, PROJECT_FORMATS, PROJECT_GENRES, PROJECT_STATUSES, ProjectInfo, ProjectStatus} from '@types-folder/projectInfo';
import {useTranslation} from 'react-i18next';

import {BibleQualityCard} from '@components/BibleQuality/BibleQualityCard';
import {BibleQualityModal} from '@components/BibleQuality/BibleQualityModal';
import {MultiSelect} from '@components/common';
import AILoadingAnimation from '@components/common/AILoadingAnimation';
import CharacterCounter from '@components/common/CharacterCounter';
import {NoAIAccessModal} from '@components/common/NoAIAccessModal';
import SkeletonTextarea from '@components/common/SkeletonTextarea';

import {getOptimalRowsForBibleField} from '../../../utils/textareaUtils';
import {LocalizationSettingsSection} from '../../Dashboard/Localization/LocalizationSettingsSection';
import AIFieldButton from '../../ProjectBibleModal/AIFieldButton';
import AIFieldIndicator from '../../ProjectBibleModal/AIFieldIndicator';
import BaseInfoModal from '../../ProjectBibleModal/BaseInfoModal';
import FieldPipelineModal from '../../ProjectBibleModal/FieldPipelineModal';
import SynopsisRequiredModal from '../../ProjectBibleModal/SynopsisRequiredModal';
import {ComprehensiveBibleGenerationButton} from './ComprehensiveBibleGenerationButton';

import s from './ProjectInfoForm.module.css';

interface ProjectInfoFormProps {
  projectId: string;
  projectName: string;
  projectInfo?: ProjectInfo;
  onSave: (projectInfo: ProjectInfo) => void;
  onSaveProjectName?: (projectName: string) => void;
  hideHeader?: boolean;
}

// Компактный виджет качества библии для заголовка
const BibleQualityInfo: React.FC<{projectId: string; onClick?: () => void}> = ({projectId, onClick}) => {
  const [bibleQuality, setBibleQuality] = useState<BibleQualityScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadBibleQuality();
    }
  }, [projectId]);

  const loadBibleQuality = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const quality = await api.getBibleQuality(projectId);
      setBibleQuality(quality);
    } catch (error) {
      console.error('Failed to load bible quality:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !bibleQuality) {
    return null;
  }

  const score = bibleQuality.totalScore || 0;
  const statusText = getBibleQualityText(score);
  const importantRecommendations = bibleQuality.recommendations?.filter((r) => r.severity === 'important').length || 0;

  // Определяем цвет в зависимости от качества
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // зеленый для отличного качества
    if (score >= 60) return '#f59e0b'; // оранжевый для хорошего качества
    return '#ef4444'; // красный для плохого качества
  };

  return (
    <div
      style={{
        marginTop: '4px',
        fontSize: '14px',
        color: '#6b7280',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      <div style={{marginBottom: '2px'}}>
        Качество библии:{' '}
        <span style={{fontWeight: '500', color: getScoreColor(score)}}>
          {score}% ({statusText})
        </span>
      </div>
      {importantRecommendations > 0 && (
        <div>
          Уведомлений: <span style={{fontWeight: '500', color: '#f59e0b'}}>{importantRecommendations} важных</span>
        </div>
      )}
    </div>
  );
};

const ProjectInfoForm: React.FC<ProjectInfoFormProps> = ({projectId, projectName, projectInfo, onSave, onSaveProjectName, hideHeader = false}) => {
  const {t} = useTranslation();
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Refs для textarea полей для точного измерения размеров
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({
    logline: null,
    synopsis: null,
    setting: null,
    targetAudience: null,
    mainThemes: null,
    message: null,
    references: null,
    uniqueFeatures: null,
    atmosphere: null,
    visualStyle: null,
    constraints: null
  });

  // ИИ хук
  const aiHook = useProjectBibleAI();

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  // Состояние модального окна базовой информации
  const [isBaseInfoModalOpen, setIsBaseInfoModalOpen] = useState(false);
  const [isComprehensiveMode, setIsComprehensiveMode] = useState(false); // Флаг для режима комплексной генерации

  // Состояние модального окна качества библии
  const [isBibleQualityModalOpen, setIsBibleQualityModalOpen] = useState(false);

  // Состояние для управления модальным окном пайплайна
  const [isFieldPipelineModalOpen, setIsFieldPipelineModalOpen] = useState(false);
  const [currentPipelineField, setCurrentPipelineField] = useState<{fieldType: string; fieldName: string} | null>(null);

  // Состояние для модального окна проверки синопсиса
  const [isSynopsisRequiredModalOpen, setIsSynopsisRequiredModalOpen] = useState(false);
  const [requiredSynopsisField, setRequiredSynopsisField] = useState<{fieldType: string; fieldName: string} | null>(null);
  const createEmptyFormProjectInfo = (): ProjectInfo => {
    const now = new Date();
    return {
      id: '',
      projectId: projectId,
      logline: '',
      synopsis: '',
      genres: [],
      formats: [],
      status: 'concept',
      setting: '',
      targetAudience: '',
      mainThemes: '',
      message: '',
      references: '',
      uniqueFeatures: '',
      atmosphere: '',
      visualStyle: '',
      constraints: '',
      createdAt: now,
      updatedAt: now
    };
  };

  const [formData, setFormData] = useState<ProjectInfo>(() => projectInfo || createEmptyFormProjectInfo());
  const [currentProjectName, setCurrentProjectName] = useState<string>(projectName);
  const [isDirty, setIsDirty] = useState(false);
  const [isProjectNameDirty, setIsProjectNameDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAcceptingAI, setIsAcceptingAI] = useState(false);

  // Состояние для отслеживания динамических размеров полей
  const [fieldRows, setFieldRows] = useState<Record<string, number>>({
    logline: 2,
    synopsis: 4,
    setting: 3,
    targetAudience: 2,
    mainThemes: 3,
    message: 2,
    references: 3,
    uniqueFeatures: 3,
    atmosphere: 2,
    visualStyle: 2,
    constraints: 3
  });

  // Обновляем форму при изменении пропсов
  useEffect(() => {
    if (projectInfo) {
      // Проверяем, нужно ли обновлять форму (защита от циклических обновлений)
      const shouldUpdate = !formData.id || formData.id !== projectInfo.id || (!isDirty && !isAcceptingAI); // Обновляем только если форма не "грязная" и не принимаем AI

      if (shouldUpdate) {
        setFormData(projectInfo);
        setIsDirty(false);
      }

      // Инициализируем размеры полей на основе существующего контента
      // Используем setTimeout чтобы refs успели инициализироваться
      setTimeout(() => {
        const textFields = ['logline', 'synopsis', 'setting', 'targetAudience', 'mainThemes', 'message', 'references', 'uniqueFeatures', 'atmosphere', 'visualStyle', 'constraints'];
        const newFieldRows: Record<string, number> = {};

        textFields.forEach((fieldType) => {
          const content = (projectInfo as any)[fieldType] || '';
          const textarea = textareaRefs.current[fieldType];
          newFieldRows[fieldType] = getOptimalRowsForBibleField(fieldType, content, textarea);
        });

        setFieldRows((prev) => ({...prev, ...newFieldRows}));
      }, 0);
    } else {
      setFormData(createEmptyFormProjectInfo());
      setIsDirty(false);
    }
  }, [projectInfo, isDirty, isAcceptingAI]);

  // Обновляем имя проекта при изменении пропса
  useEffect(() => {
    setCurrentProjectName(projectName);
    setIsProjectNameDirty(false);
  }, [projectName]);

  const handleInputChange = (field: keyof ProjectInfo, value: any) => {
    // Для текстовых полей проверяем лимит символов
    if (typeof value === 'string' && value.length > MAX_TEXT_FIELD_LENGTH) {
      // Обрезаем значение до максимального лимита
      value = value.substring(0, MAX_TEXT_FIELD_LENGTH);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }));
    setIsDirty(true);

    // Автоматически обновляем размер поля если это текстовое поле
    if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(fieldRows, field)) {
      updateFieldSize(field as string, value);
    }
  };

  const handleProjectNameChange = (value: string) => {
    setCurrentProjectName(value);
    setIsProjectNameDirty(value !== projectName);
  };

  // Функция для обновления размера поля после генерации ИИ
  const updateFieldSize = (fieldType: string, content: string) => {
    // Небольшая задержка, чтобы убедиться что содержимое обновилось в DOM
    setTimeout(() => {
      const textarea = textareaRefs.current[fieldType];
      const optimalRows = getOptimalRowsForBibleField(fieldType, content, textarea);
      setFieldRows((prev) => ({
        ...prev,
        [fieldType]: optimalRows
      }));
    }, 0);
  };

  // Логика работы с ИИ
  const needsBaseInfo = !formData.logline && !formData.synopsis;

  const handleAIGenerate = async (fieldType: string, usePipeline = false) => {
    // Проверяем наличие синопсиса для всех полей кроме логлайна и синопсиса
    const needsSynopsis = !formData.synopsis?.trim() && fieldType !== 'logline' && fieldType !== 'synopsis';

    if (needsSynopsis) {
      // Показываем модальное окно с требованием создать синопсис
      setRequiredSynopsisField({fieldType, fieldName: fieldNames[fieldType] || fieldType});
      setIsSynopsisRequiredModalOpen(true);
      return;
    }

    // Для быстрой генерации логлайна через пайплайн не показываем BaseInfoModal
    if (needsBaseInfo && (fieldType === 'logline' || fieldType === 'synopsis')) {
      // Если это быстрая генерация логлайна через пайплайн и поле пустое -
      // открываем FieldPipelineModal вместо BaseInfoModal
      if (fieldType === 'logline' && usePipeline && !formData.logline?.trim()) {
        handleOpenPipelineModal('logline', fieldNames.logline);
        return;
      }

      // Для синопсиса или классической генерации показываем BaseInfoModal
      if (fieldType === 'synopsis' || !usePipeline) {
        setIsComprehensiveMode(false); // Режим обычной генерации
        setIsBaseInfoModalOpen(true);
        return;
      }
    }

    try {
      // Сохраняем оригинальное значение перед генерацией
      const currentValue = (formData[fieldType as keyof ProjectInfo] as string) || '';
      aiHook.saveOriginalContent(fieldType, currentValue);

      let content: string;

      if (usePipeline) {
        console.log(`🚀 Использую AI Pipeline для генерации ${fieldType}`);
        content = await aiHook.generateWithPipeline(projectId, fieldType);
      } else {
        console.log(`🎭 Использую классический AI для генерации ${fieldType}`);
        content = await aiHook.generateContent(projectId, fieldType);
      }

      trackBibleEditField(fieldType, 'generateFastFill', content.length, projectId);
      // Обновляем форму сгенерированным контентом
      handleInputChange(fieldType as keyof ProjectInfo, content);

      // Обновляем размер поля под содержимое
      updateFieldSize(fieldType, content);
    } catch (error) {
      console.error('AI generation failed:', error);
    }
  };

  // Функция для открытия модального окна пайплайна
  const handleOpenPipelineModal = (fieldType: string, fieldName: string) => {
    // Проверяем наличие синопсиса для всех полей кроме логлайна и синопсиса
    const needsSynopsis = !formData.synopsis?.trim() && fieldType !== 'logline' && fieldType !== 'synopsis';

    if (needsSynopsis) {
      // Показываем модальное окно с требованием создать синопсис
      setRequiredSynopsisField({fieldType, fieldName});
      setIsSynopsisRequiredModalOpen(true);
      return;
    }

    setCurrentPipelineField({fieldType, fieldName});
    setIsFieldPipelineModalOpen(true);
  };

  // Функция для генерации через модальное окно пайплайна
  const handlePipelineGenerate = async (fieldType: string, description: string, usePipeline: boolean) => {
    try {
      // Сохраняем оригинальное значение перед генерацией
      const currentValue = (formData[fieldType as keyof ProjectInfo] as string) || '';
      aiHook.saveOriginalContent(fieldType, currentValue);

      let content: string;

      if (usePipeline) {
        console.log(`🚀 Использую AI Pipeline для генерации ${fieldType} с описанием`);
        content = await aiHook.generateWithPipeline(projectId, fieldType, description);
      } else {
        console.log(`🎭 Использую классический AI для генерации ${fieldType} с описанием`);
        content = await aiHook.generateContent(projectId, fieldType, description);
      }

      trackBibleEditField(fieldType, 'generateFillWithIdea', content.length, projectId);

      // Обновляем форму сгенерированным контентом
      handleInputChange(fieldType as keyof ProjectInfo, content);

      // Обновляем размер поля под содержимое
      updateFieldSize(fieldType, content);
    } catch (error) {
      console.error('Pipeline generation failed:', error);
    }
  };

  // Функция для генерации синопсиса из модального окна проверки синопсиса
  const handleSynopsisRequiredGenerate = async (description: string) => {
    try {
      // Сохраняем оригинальное значение перед генерацией синопсиса
      const currentValue = formData.synopsis || '';
      aiHook.saveOriginalContent('synopsis', currentValue);

      console.log('🚀 Генерирую синопсис через AI Pipeline из SynopsisRequiredModal');
      const content = await aiHook.generateWithPipeline(projectId, 'synopsis', description);

      // Обновляем форму сгенерированным синопсисом
      handleInputChange('synopsis', content);

      // Обновляем размер поля под содержимое
      updateFieldSize('synopsis', content);

      // После генерации синопсиса закрываем модальное окно
      setIsSynopsisRequiredModalOpen(false);
      setRequiredSynopsisField(null);
    } catch (error) {
      console.error('Synopsis generation failed:', error);
    }
  };

  // Карта названий полей для модального окна пайплайна
  const fieldNames: Record<string, string> = {
    logline: 'Логлайн',
    synopsis: 'Синопсис',
    setting: 'Сеттинг',
    targetAudience: 'Целевая аудитория',
    mainThemes: 'Основные темы',
    atmosphere: 'Атмосфера',
    uniqueFeatures: 'Уникальные особенности',
    message: 'Посыл',
    references: 'Референсы',
    visualStyle: 'Визуальный стиль',
    constraints: 'Ограничения'
  };

  // Функция для проверки был ли сгенерирован контент AI
  const isFieldAIGenerated = (fieldType: string): boolean => {
    return aiHook.isPending(fieldType) || (aiHook as any).suggestionIds?.[fieldType];
  };

  const handleAIAccept = async (fieldType: string) => {
    setIsAcceptingAI(true);
    try {
      await aiHook.acceptContent(
        fieldType,
        (field, content) => {
          // 1. Обновляем локальное состояние формы
          handleInputChange(field as keyof ProjectInfo, content);
          // 2. Обновляем размер поля под содержимое
          updateFieldSize(field, content);
        },
        async (content) => {
          // 2. Сохраняем изменения на сервер
          const updatedFormData = {...formData, [fieldType]: content};
          await onSave(updatedFormData);
        }
      );
    } catch (error) {
      console.error('Failed to accept AI suggestion:', error);
      // Можно показать пользователю ошибку
    } finally {
      setIsAcceptingAI(false);
    }
  };

  const handleAIReject = async (fieldType: string) => {
    try {
      await aiHook.rejectContent(fieldType, (field, originalContent) => {
        handleInputChange(field as keyof ProjectInfo, originalContent);
        console.log(`Rejected AI content for ${field} and restored original`);
      });
    } catch (error) {
      console.error('Failed to reject AI suggestion:', error);
      // Можно показать пользователю ошибку
    }
  };

  const handleBaseInfoGenerate = async (description: string) => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    try {
      if (isComprehensiveMode) {
        trackBibleGenerateAllLaunch({additionalPromptLength: description.length}, projectId);

        // Сохраняем оригинальные значения всех полей
        const fieldsToSave = ['genres', 'formats', 'logline', 'synopsis', 'setting', 'targetAudience', 'mainThemes', 'atmosphere', 'uniqueFeatures', 'message', 'references', 'constraints'];
        fieldsToSave.forEach((field) => {
          aiHook.saveOriginalContent(field, (formData as any)[field] || '');
        });

        // Запускаем комплексную генерацию
        const result = await aiHook.generateComprehensiveBible(projectId, description);

        // Обновляем форму сгенерированным контентом
        const generatedContent = result.generatedContent;
        console.log('📝 Generated content (modal):', generatedContent);

        Object.entries(generatedContent).forEach(([field, content]) => {
          console.log(`🎯 Processing field ${field}:`, typeof content, content);

          if (content) {
            // Специальная обработка для массивов (жанры и форматы)
            if (Array.isArray(content)) {
              console.log(`✅ Setting array field ${field}:`, content);
              handleInputChange(field as keyof ProjectInfo, content);
            } else if (typeof content === 'string') {
              console.log(`✅ Setting string field ${field}:`, content.substring(0, 50) + '...');
              handleInputChange(field as keyof ProjectInfo, content);
              // Обновляем размер поля под содержимое
              updateFieldSize(field, content);
            } else {
              console.log(`⚠️ Unknown content type for field ${field}:`, typeof content, content);
            }
          }
        });

        // Показываем результаты пользователю
        console.log(`✅ Comprehensive bible generation completed!`);
        console.log(`📊 Generated ${result.metadata.fieldsGenerated} fields`);
        console.log(`💰 Cost: ${result.metadata.totalCost} credits`);
        console.log(`⏱️ Time: ${result.metadata.totalTime}ms`);

        // Автоматически сохраняем изменения
        if (result.metadata.fieldsGenerated > 0) {
          setIsDirty(true);
          setTimeout(handleSave, 1000); // Небольшая задержка для лучшего UX
        }
      } else {
        // Обычный режим - генерируем только логлайн и синопсис
        // Сохраняем оригинальные значения перед генерацией
        aiHook.saveOriginalContent('logline', formData.logline || '');
        aiHook.saveOriginalContent('synopsis', formData.synopsis || '');

        // Генерируем логлайн
        const logline = await aiHook.generateContent(projectId, 'logline', description);
        handleInputChange('logline', logline);
        updateFieldSize('logline', logline);

        // Затем генерируем синопсис
        const synopsis = await aiHook.generateContent(projectId, 'synopsis', description);
        handleInputChange('synopsis', synopsis);
        updateFieldSize('synopsis', synopsis);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleComprehensiveGeneration = async () => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    // TODO: добавить определение, впервые ли открывается библия для этого проекта
    trackBibleGenerateAllOpen('FirstGeneration', projectId);

    setIsComprehensiveMode(true);
    setIsBaseInfoModalOpen(true);
  };

  // Функция для определения заполненных полей
  const getFilledFields = (): string[] => {
    const fieldsToCheck = [
      {key: 'logline', label: 'Логлайн'},
      {key: 'synopsis', label: 'Синопсис'},
      {key: 'genres', label: 'Жанры'},
      {key: 'formats', label: 'Форматы'},
      {key: 'setting', label: 'Сеттинг'},
      {key: 'targetAudience', label: 'Целевая аудитория'},
      {key: 'mainThemes', label: 'Основные темы'},
      {key: 'message', label: 'Посыл'},
      {key: 'references', label: 'Референсы'},
      {key: 'uniqueFeatures', label: 'Уникальные особенности'},
      {key: 'atmosphere', label: 'Атмосфера'},
      {key: 'constraints', label: 'Ограничения'}
    ];

    return fieldsToCheck
      .filter((field) => {
        const value = (formData as any)[field.key];
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value && value.toString().trim().length > 0;
      })
      .map((field) => field.label);
  };

  const handleSave = async () => {
    if (isSaving) return; // Предотвращаем множественные вызовы

    setIsSaving(true);
    try {
      // Сохраняем информацию о проекте
      if (isDirty || !projectInfo) {
        await onSave(formData);
        setIsDirty(false);
      }

      // Сохраняем имя проекта отдельно
      if (isProjectNameDirty && onSaveProjectName) {
        await onSaveProjectName(currentProjectName);
        setIsProjectNameDirty(false);
      }
    } catch (error) {
      console.error('Failed to save project data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyChanges = isDirty || isProjectNameDirty;

  // Показываем кнопку сохранения если есть изменения ИЛИ если библия еще не создана
  const shouldShowSaveButton = hasAnyChanges || !projectInfo;

  // Автосохранение при клике вне формы или на пустое место внутри формы
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Проверяем, является ли целевой элемент активным элементом ввода
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.isContentEditable ||
        target.closest('button') !== null ||
        target.closest('.multi-select') !== null; // для MultiSelect компонента

      // Автосохранение происходит если:
      // 1. Клик вне формы, ИЛИ
      // 2. Клик внутри формы, но не по активным элементам ввода
      const shouldAutoSave = !formContainerRef.current?.contains(target) || (formContainerRef.current?.contains(target) && !isInputElement);

      if (shouldAutoSave && shouldShowSaveButton && !isSaving) {
        console.log('Auto-saving project info on click');
        handleSave();
      }
    },
    [shouldShowSaveButton, handleSave, isSaving]
  );

  // Добавляем обработчик клика по документу для автосохранения при клике вне формы
  useEffect(() => {
    if (shouldShowSaveButton && !isSaving) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [shouldShowSaveButton, handleOutsideClick, isSaving]);

  return (
    <div className={s.formContainer} ref={formContainerRef}>
      {!hideHeader && (
        <div className={s.formHeader}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
            <div>
              <div style={{display: 'flex', alignItems: 'center', marginTop: '8px', gap: '16px'}}>
                <h2 className={s.formTitle}>{t('dashboard.project_info.title', 'Библия проекта')}</h2>
                {/* Компактная кнопка генерации всей библии */}
                <ComprehensiveBibleGenerationButton isLoading={aiHook.isLoading} isActiveField={aiHook.activeField === 'comprehensive'} onClick={handleComprehensiveGeneration} />
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              {/* <BibleQualityInfo 
                projectId={projectId}
                onClick={() => setIsBibleQualityModalOpen(true)}
              /> */}
              {shouldShowSaveButton && (
                <button onClick={handleSave} className={s.saveButton} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <svg className={s.spinner} width='16' height='16' viewBox='0 0 24 24' fill='none'>
                        <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' strokeDasharray='31.416' strokeDashoffset='31.416'>
                          <animate attributeName='stroke-dasharray' dur='2s' values='0 31.416;15.708 15.708;0 31.416;0 31.416' repeatCount='indefinite' />
                          <animate attributeName='stroke-dashoffset' dur='2s' values='0;-15.708;-31.416;-31.416' repeatCount='indefinite' />
                        </circle>
                      </svg>
                      {t('dashboard.project_info.saving', 'Сохранение...')}
                    </>
                  ) : hasAnyChanges ? (
                    t('dashboard.project_info.save_changes', 'Сохранить изменения')
                  ) : (
                    t('dashboard.project_info.create_bible', 'Создать библию')
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Убираем оригинальный блок генерации всей библии */}

      <div className={s.formContent}>
        {/* Базовая информация */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>{t('dashboard.project_info.basic_info', 'Базовая информация')}</h3>

          <div className={s.field}>
            <label className={s.label}>{t('dashboard.project_info.project_name', 'Имя проекта')}</label>
            <input
              type='text'
              value={currentProjectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              className={s.input}
              placeholder={t('dashboard.project_info.project_name_placeholder', 'Введите название проекта')}
            />
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.logline', 'Logline')}</label>
                <AIFieldIndicator
                  fieldType='logline'
                  fieldName={t('dashboard.project_info.logline', 'Logline')}
                  isAIGenerated={isFieldAIGenerated('logline')}
                  explanation={aiHook.explanations.logline || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='logline'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('logline')}
                  onGenerate={(usePipeline) => handleAIGenerate('logline', usePipeline)}
                  onAccept={() => handleAIAccept('logline')}
                  onReject={() => handleAIReject('logline')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('logline', fieldNames.logline)}
                  showPipelineOption={true}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('logline') ? (
                <SkeletonTextarea key='logline-skeleton' rows={2} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.logline = el;
                  }}
                  value={formData.logline || ''}
                  onChange={(e) => handleInputChange('logline', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.logline_placeholder', 'Краткое описание проекта в одном предложении')}
                  rows={fieldRows.logline}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.logline || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.synopsis', 'Synopsis')}</label>
                <AIFieldIndicator
                  fieldType='synopsis'
                  fieldName={t('dashboard.project_info.synopsis', 'Synopsis')}
                  isAIGenerated={isFieldAIGenerated('synopsis')}
                  explanation={aiHook.explanations.synopsis || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='synopsis'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('synopsis')}
                  onGenerate={(usePipeline) => handleAIGenerate('synopsis', usePipeline)}
                  onAccept={() => handleAIAccept('synopsis')}
                  onReject={() => handleAIReject('synopsis')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('synopsis', fieldNames.synopsis)}
                  showPipelineOption={true}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('synopsis') ? (
                <SkeletonTextarea key='synopsis-skeleton' rows={4} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.synopsis = el;
                  }}
                  value={formData.synopsis || ''}
                  onChange={(e) => handleInputChange('synopsis', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.synopsis_placeholder', 'Подробное описание сюжета и основных элементов')}
                  rows={fieldRows.synopsis}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.synopsis || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>
        </section>

        {/* Категоризация */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>{t('dashboard.project_info.categorization', 'Categorization')}</h3>

          <div className={s.field}>
            <MultiSelect
              label={t('dashboard.project_info.genres_label', 'Genres')}
              options={PROJECT_GENRES}
              value={formData.genres}
              onChange={(genres) => handleInputChange('genres', genres)}
              placeholder={t('dashboard.project_info.genres_placeholder', 'Select genres...')}
              translationPrefix='project_info.genres'
            />
          </div>

          <div className={s.field}>
            <MultiSelect
              label={t('dashboard.project_info.formats_label', 'Formats')}
              options={PROJECT_FORMATS}
              value={formData.formats}
              onChange={(formats) => handleInputChange('formats', formats)}
              placeholder={t('dashboard.project_info.formats_placeholder', 'Select formats...')}
              translationPrefix='project_info.formats'
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>{t('dashboard.project_info.project_status', 'Project status')}</label>
            <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value as ProjectStatus)} className={s.select}>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`project_info.statuses.${status}`, status)}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Творческие аспекты */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>{t('dashboard.project_info.creative_aspects', 'Творческие аспекты')}</h3>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.setting', 'Setting')}</label>
                <AIFieldIndicator
                  fieldType='setting'
                  fieldName={t('dashboard.project_info.setting', 'Setting')}
                  isAIGenerated={isFieldAIGenerated('setting')}
                  explanation={aiHook.explanations.setting || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='setting'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('setting')}
                  onGenerate={(usePipeline) => handleAIGenerate('setting', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('setting')}
                  onReject={() => handleAIReject('setting')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('setting', fieldNames.setting)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('setting') ? (
                <SkeletonTextarea key='setting-skeleton' rows={3} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.setting = el;
                  }}
                  value={formData.setting || ''}
                  onChange={(e) => handleInputChange('setting', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.setting_placeholder', 'Description of the world, place and time of action')}
                  rows={fieldRows.setting}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.setting || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.target_audience', 'Target audience')}</label>
                <AIFieldIndicator
                  fieldType='targetAudience'
                  fieldName={t('dashboard.project_info.target_audience', 'Target audience')}
                  isAIGenerated={isFieldAIGenerated('targetAudience')}
                  explanation={aiHook.explanations.targetAudience || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='targetAudience'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('targetAudience')}
                  onGenerate={(usePipeline) => handleAIGenerate('targetAudience', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('targetAudience')}
                  onReject={() => handleAIReject('targetAudience')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('targetAudience', fieldNames.targetAudience)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('targetAudience') ? (
                <SkeletonTextarea key='targetAudience-skeleton' rows={2} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.targetAudience = el;
                  }}
                  value={formData.targetAudience || ''}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.target_audience_placeholder', 'Описание целевой аудитории проекта')}
                  rows={fieldRows.targetAudience}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.targetAudience || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.main_themes', 'Main themes')}</label>
                <AIFieldIndicator
                  fieldType='mainThemes'
                  fieldName={t('dashboard.project_info.main_themes', 'Main themes')}
                  isAIGenerated={isFieldAIGenerated('mainThemes')}
                  explanation={aiHook.explanations.mainThemes || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='mainThemes'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('mainThemes')}
                  onGenerate={(usePipeline) => handleAIGenerate('mainThemes', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('mainThemes')}
                  onReject={() => handleAIReject('mainThemes')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('mainThemes', fieldNames.mainThemes)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('mainThemes') ? (
                <SkeletonTextarea key='mainThemes-skeleton' rows={3} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.mainThemes = el;
                  }}
                  value={formData.mainThemes || ''}
                  onChange={(e) => handleInputChange('mainThemes', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.main_themes_placeholder', 'Ключевые темы и мотивы проекта')}
                  rows={fieldRows.mainThemes}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.mainThemes || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.message', 'Message')}</label>
                <AIFieldIndicator
                  fieldType='message'
                  fieldName={t('dashboard.project_info.message', 'Message')}
                  isAIGenerated={isFieldAIGenerated('message')}
                  explanation={aiHook.explanations.message || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='message'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('message')}
                  onGenerate={(usePipeline) => handleAIGenerate('message', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('message')}
                  onReject={() => handleAIReject('message')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('message', fieldNames.message)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('message') ? (
                <SkeletonTextarea key='message-skeleton' rows={2} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.message = el;
                  }}
                  value={formData.message || ''}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.message_placeholder', 'Основная идея и послание проекта')}
                  rows={fieldRows.message}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.message || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.references', 'References')}</label>
                <AIFieldIndicator
                  fieldType='references'
                  fieldName={t('dashboard.project_info.references', 'References')}
                  isAIGenerated={isFieldAIGenerated('references')}
                  explanation={aiHook.explanations.references || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='references'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('references')}
                  onGenerate={(usePipeline) => handleAIGenerate('references', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('references')}
                  onReject={() => handleAIReject('references')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('references', fieldNames.references)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('references') ? (
                <SkeletonTextarea key='references-skeleton' rows={3} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.references = el;
                  }}
                  value={formData.references || ''}
                  onChange={(e) => handleInputChange('references', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.references_placeholder', 'Источники вдохновения, аналоги, примеры')}
                  rows={fieldRows.references}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.references || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.unique_features', 'Unique features')}</label>
                <AIFieldIndicator
                  fieldType='uniqueFeatures'
                  fieldName={t('dashboard.project_info.unique_features', 'Unique features')}
                  isAIGenerated={isFieldAIGenerated('uniqueFeatures')}
                  explanation={aiHook.explanations.uniqueFeatures || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='uniqueFeatures'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('uniqueFeatures')}
                  onGenerate={(usePipeline) => handleAIGenerate('uniqueFeatures', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('uniqueFeatures')}
                  onReject={() => handleAIReject('uniqueFeatures')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('uniqueFeatures', fieldNames.uniqueFeatures)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('uniqueFeatures') ? (
                <SkeletonTextarea key='uniqueFeatures-skeleton' rows={3} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.uniqueFeatures = el;
                  }}
                  value={formData.uniqueFeatures || ''}
                  onChange={(e) => handleInputChange('uniqueFeatures', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.unique_features_placeholder', 'Что делает ваш проект особенным и отличает от других')}
                  rows={fieldRows.uniqueFeatures}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.uniqueFeatures || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.atmosphere', 'Atmosphere')}</label>
                <AIFieldIndicator
                  fieldType='atmosphere'
                  fieldName={t('dashboard.project_info.atmosphere', 'Atmosphere')}
                  isAIGenerated={isFieldAIGenerated('atmosphere')}
                  explanation={aiHook.explanations.atmosphere || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='atmosphere'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('atmosphere')}
                  onGenerate={(usePipeline) => handleAIGenerate('atmosphere', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('atmosphere')}
                  onReject={() => handleAIReject('atmosphere')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('atmosphere', fieldNames.atmosphere)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('atmosphere') ? (
                <SkeletonTextarea key='atmosphere-skeleton' rows={2} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.atmosphere = el;
                  }}
                  value={formData.atmosphere || ''}
                  onChange={(e) => handleInputChange('atmosphere', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.atmosphere_placeholder', 'Настроение и атмосфера проекта')}
                  rows={fieldRows.atmosphere}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.atmosphere || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.visual_style', 'Визуальный стиль')}</label>
                <AIFieldIndicator
                  fieldType='visualStyle'
                  fieldName={t('dashboard.project_info.visual_style', 'Визуальный стиль')}
                  isAIGenerated={isFieldAIGenerated('visualStyle')}
                  explanation={aiHook.explanations.visualStyle || ''}
                />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='visualStyle'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('visualStyle')}
                  onGenerate={(usePipeline) => handleAIGenerate('visualStyle', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('visualStyle')}
                  onReject={() => handleAIReject('visualStyle')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('visualStyle', fieldNames.visualStyle)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('visualStyle') ? (
                <SkeletonTextarea key='visualStyle-skeleton' rows={2} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.visualStyle = el;
                  }}
                  value={formData.visualStyle || ''}
                  onChange={(e) => handleInputChange('visualStyle', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.visual_style_placeholder', 'Описание визуального стиля: цветовая палитра, художественное направление, стилистика')}
                  rows={fieldRows.visualStyle}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.visualStyle || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>
        </section>

        {/* Технические аспекты */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>{t('dashboard.project_info.technical_aspects', 'Технические аспекты')}</h3>

          <div className={s.field}>
            <div className={s.fieldHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label className={s.label}>{t('dashboard.project_info.constraints', 'Основные ограничения проекта')}</label>
                <AIFieldIndicator fieldType='constraints' fieldName='Ограничения' isAIGenerated={isFieldAIGenerated('constraints')} explanation={aiHook.explanations.constraints || ''} />
              </div>
              <div className={s.aiButtonContainer}>
                <AIFieldButton
                  fieldType='constraints'
                  isLoading={aiHook.isLoading}
                  isPending={aiHook.isPending('constraints')}
                  onGenerate={(usePipeline) => handleAIGenerate('constraints', usePipeline)}
                  showPipelineOption={true}
                  onAccept={() => handleAIAccept('constraints')}
                  onReject={() => handleAIReject('constraints')}
                  onOpenPipelineModal={() => handleOpenPipelineModal('constraints', fieldNames.constraints)}
                  showPipelineModal={true}
                />
              </div>
            </div>
            <div className={s.fieldInputContainer}>
              {aiHook.isActiveField('constraints') ? (
                <SkeletonTextarea key='constraints-skeleton' rows={3} className={s.textarea} aiActive={true} />
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current.constraints = el;
                  }}
                  value={formData.constraints || ''}
                  onChange={(e) => handleInputChange('constraints', e.target.value)}
                  className={s.textarea}
                  placeholder={t('dashboard.project_info.constraints_placeholder', 'Технические, временные, бюджетные или другие ограничения')}
                  rows={fieldRows.constraints}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                />
              )}
              <CharacterCounter currentLength={(formData.constraints || '').length} maxLength={MAX_TEXT_FIELD_LENGTH} className={s.characterCounter} />
            </div>
          </div>
        </section>

        {/* Настройки локализации */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>{t('localization.settings.title', 'Настройки локализации')}</h3>
          <LocalizationSettingsSection projectId={projectId} />
        </section>
      </div>

      {/* Модальное окно базовой информации */}
      <BaseInfoModal
        projectId={projectId}
        isOpen={isBaseInfoModalOpen}
        onClose={() => {
          setIsBaseInfoModalOpen(false);
          setIsComprehensiveMode(false); // Сбрасываем режим при закрытии
        }}
        onGenerate={handleBaseInfoGenerate}
        isLoading={aiHook.isLoading}
        isComprehensiveMode={isComprehensiveMode}
        filledFields={getFilledFields()}
      />

      {/* Модальное окно качества библии */}
      <BibleQualityModal isOpen={isBibleQualityModalOpen} onClose={() => setIsBibleQualityModalOpen(false)} />

      {/* Модальное окно пайплайна */}
      <FieldPipelineModal
        projectId={projectId}
        isOpen={isFieldPipelineModalOpen}
        onClose={() => {
          setIsFieldPipelineModalOpen(false);
          setCurrentPipelineField(null);
        }}
        fieldType={currentPipelineField?.fieldType || ''}
        fieldName={currentPipelineField?.fieldName || ''}
        onGenerate={handlePipelineGenerate}
        isLoading={aiHook.isLoading}
        isFieldEmpty={currentPipelineField?.fieldType ? !((formData as any)[currentPipelineField.fieldType] as string)?.trim() : false}
      />

      {/* Модальное окно проверки синопсиса */}
      <SynopsisRequiredModal
        projectId={projectId}
        isOpen={isSynopsisRequiredModalOpen}
        onClose={() => {
          setIsSynopsisRequiredModalOpen(false);
          setRequiredSynopsisField(null);
        }}
        fieldName={requiredSynopsisField?.fieldName || ''}
        onGenerate={handleSynopsisRequiredGenerate}
        isLoading={aiHook.isLoading}
      />

      {/* Модальное окно для отсутствия доступа к ИИ */}
      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </div>
  );
};

export default ProjectInfoForm;
