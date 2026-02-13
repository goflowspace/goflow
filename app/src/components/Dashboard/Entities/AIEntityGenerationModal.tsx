import React, {useState} from 'react';

import {usePipelinePricing} from '@hooks/usePipelinePricing';
import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {Cross2Icon, LightningBoltIcon, MagicWandIcon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text, TextArea} from '@radix-ui/themes';
import {MAX_TEXT_FIELD_LENGTH} from '@types-folder/projectInfo';
import {useTranslation} from 'react-i18next';

import CharacterCounter from '@components/common/CharacterCounter';
import {NoAIAccessModal} from '@components/common/NoAIAccessModal';

import {useWebSocket} from '../../../contexts/WebSocketContext';
import {PipelineState, useAIPipelineProgress} from '../../../hooks/useAIPipelineProgress';
import {trackEntityCreated, trackEntityGenerationClose, trackEntityGenerationLaunch, trackEntityGenerationOpen} from '../../../services/analytics';
import {api} from '../../../services/api';
import {useTeamStore} from '../../../store/useTeamStore';
import {Entity} from '../../../types/entities';
import {AIProgressStatus} from '../../../types/websocket.types';
import {PipelineChecklist} from '../../ProjectBibleModal/PipelineChecklist';

interface AIEntityGenerationModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onEntityCreated?: (entity: Entity) => void;
}

const AIEntityGenerationModal: React.FC<AIEntityGenerationModalProps> = ({projectId, isOpen, onClose, onEntityCreated}) => {
  const {t} = useTranslation();
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedEntity, setGeneratedEntity] = useState<Entity | null>(null);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const [closeMethod, setCloseMethod] = useState<'CloseButton' | 'CancelButton'>('CloseButton');
  const [hasTrackedCreation, setHasTrackedCreation] = useState(false);
  const {getFormattedPrice} = usePipelinePricing();
  const pipelinePrice = getFormattedPrice('adapted-entity-generation');

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  // Получаем teamId и доступ к WebSocket
  const {currentTeam} = useTeamStore();
  const {joinProject, isConnected} = useWebSocket();

  // Загрузка обновленного списка сущностей и поиск новой сущности
  const loadLatestEntity = React.useCallback(async () => {
    try {
      const result = await api.getEntities(projectId, {includeOriginalImages: false});
      // Берем первую сущность из списка (самую последнюю созданную)
      if (result.entities && result.entities.length > 0) {
        const latestEntity = result.entities[0];
        setGeneratedEntity(latestEntity);
        return latestEntity;
      }
    } catch (error) {
      console.error('❌ Failed to load latest entity:', error);
    }
    return null;
  }, [projectId]);

  // Create stable completion handler
  const handleCompletion = React.useCallback(
    async (state: PipelineState) => {
      console.log('🎉 AI Entity Generation completed', state);

      // Защита от дублирования - если уже обработали завершение, не делаем это снова
      if (hasTrackedCreation) {
        console.log('⚠️ handleCompletion called again, but already processed - skipping');
        return;
      }

      setIsGenerating(false);
      setIsCompleted(true);

      let entityToSave: Entity | null = null;

      // Проверяем, есть ли результаты в state
      if (state.results && state.results.entity_creation && state.results.entity_creation.createdEntity) {
        const createdEntity = state.results.entity_creation.createdEntity;
        console.log('✅ Found created entity in pipeline results:', createdEntity);

        // Создаем Entity объект из результатов пайплайна
        const entityFromPipeline: Entity = {
          id: createdEntity.id,
          name: createdEntity.name,
          description: createdEntity.description || '',
          entityTypeId: createdEntity.entityTypeId,
          createdAt: createdEntity.createdAt,
          updatedAt: createdEntity.createdAt,
          projectId: projectId,
          image: createdEntity.image || undefined, // Используем image из результатов если есть
          entityType: undefined, // Заполним базовыми данными
          values: []
        };

        setGeneratedEntity(entityFromPipeline);
        entityToSave = entityFromPipeline;
      } else {
        // Fallback: загружаем актуальные данные с бэкенда
        console.log('📥 No entity data in pipeline results, loading from backend...');
        entityToSave = await loadLatestEntity();
      }

      // Трекинг создания сущности через ИИ (для любого успешного пути)
      if (entityToSave) {
        console.log('🎯 Tracking entity creation via AI:', {
          id: entityToSave.id,
          typeName: entityToSave.entityType?.name || 'unknown',
          projectId
        });
        trackEntityCreated(entityToSave.id, entityToSave.entityType?.name || 'unknown', 'Generation', 'Workspace', projectId);

        // Устанавливаем флаг, что трекинг уже выполнен
        setHasTrackedCreation(true);
      }

      // Автоматическое сохранение и закрытие модального окна через небольшую задержку
      if (entityToSave && onEntityCreated) {
        setTimeout(() => {
          console.log('🚀 Auto-saving and closing modal after successful generation');
          onEntityCreated(entityToSave!);

          // Сбрасываем состояние и закрываем модальное окно
          setIsCompleted(false);
          setGeneratedEntity(null);
          setDescription('');
          clearProgressRef.current();
          onClose();
        }, 500);
      }
    },
    [loadLatestEntity, projectId, onEntityCreated, onClose, hasTrackedCreation]
  );

  // Create stable error handler
  const handleError = React.useCallback((state: PipelineState) => {
    console.error('❌ AI Entity Generation error:', state);
    setIsGenerating(false);
    setIsCompleted(false);
    setGeneratedEntity(null);
  }, []);

  // Memoize options for stability
  const stableOptions = React.useMemo(
    () => ({
      onCompleted: handleCompletion,
      onError: handleError
    }),
    [handleCompletion, handleError]
  );

  // Track AI pipeline progress
  const {pipelineState, isActive, clearProgress} = useAIPipelineProgress(projectId, stableOptions);

  // Create ref to access clearProgress in async operations
  const clearProgressRef = React.useRef(clearProgress);
  React.useEffect(() => {
    clearProgressRef.current = clearProgress;
  }, [clearProgress]);

  // Auto-focus when opening modal
  React.useEffect(() => {
    if (isOpen && textAreaRef.current) {
      const timer = setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form only when modal transitions from closed to open
  React.useEffect(() => {
    if (isOpen && !wasOpen) {
      // Only reset when opening for the first time
      setDescription('');
      setIsGenerating(false);
      setIsCompleted(false);
      setGeneratedEntity(null);
      setHasTrackedCreation(false); // Сбрасываем флаг трекинга
      clearProgress();
      setWasOpen(true);

      // Трекинг открытия окна ИИ генерации сущности
      trackEntityGenerationOpen(projectId);
    } else if (!isOpen && wasOpen) {
      // Reset wasOpen flag when modal closes
      setWasOpen(false);

      // Трекинг закрытия окна ИИ генерации сущности
      trackEntityGenerationClose(projectId, closeMethod);
    }
  }, [isOpen, wasOpen, clearProgress, projectId, closeMethod]);

  // Clear active state only when modal opens (not during generation)
  React.useEffect(() => {
    if (isOpen && !wasOpen && isActive) {
      console.log('🔄 Force clearing active state on modal first open');
      clearProgress();
    }
  }, [isOpen, wasOpen, isActive, clearProgress]);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    try {
      setIsGenerating(true);

      // Проверяем подключение к WebSocket
      if (!isConnected) {
        console.warn('⚠️ WebSocket not connected, cannot receive progress updates');
        // Продолжаем выполнение, но без real-time обновлений
      }

      // Убеждаемся, что подключены к комнате проекта для получения событий прогресса
      console.log('🔗 Ensuring connection to project room before AI generation...');
      if (currentTeam?.id) {
        try {
          const joinResult = await joinProject(projectId, currentTeam.id, 3000);
          if (joinResult.success) {
            console.log('✅ Successfully joined project room for AI generation');
          } else {
            console.warn('⚠️ Failed to join project room, progress updates may not work:', joinResult.error);
          }
        } catch (joinError) {
          console.warn('⚠️ Error joining project room:', joinError);
          // Продолжаем выполнение даже если не удалось присоединиться
        }
      } else {
        console.error('❌ No current team found, cannot join project room for AI generation');
      }

      // Трекинг запуска ИИ генерации сущности
      trackEntityGenerationLaunch(projectId, description.trim().length);

      // Call API to start entity generation via centralized service
      const result = await api.generateEntityWithAI(projectId, description.trim());
      console.log('🎯 Entity generation started:', result);
    } catch (error) {
      console.error('❌ Failed to start entity generation:', error);
      setIsGenerating(false);
      // Error is already handled by api.handleAIError (notifications, etc.)
    }
  };

  const handleSave = () => {
    if (generatedEntity && onEntityCreated) {
      console.log('💾 Saving created entity:', generatedEntity);
      onEntityCreated(generatedEntity);

      // Сбрасываем состояние и закрываем модальное окно
      setIsCompleted(false);
      setGeneratedEntity(null);
      setDescription('');
      clearProgress();
      onClose();
    }
  };

  const canGenerate = description.trim().length > 0 && !isGenerating && !isActive && !isCompleted;
  const canSave = isCompleted && generatedEntity;

  const handleClose = () => {
    if (isGenerating || isActive) {
      return; // Don't allow closing during generation
    }
    setCloseMethod('CancelButton');
    onClose();
  };

  const handleCloseButtonClick = () => {
    if (isGenerating || isActive) {
      return; // Don't allow closing during generation
    }
    setCloseMethod('CloseButton');
    onClose();
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Content maxWidth='600px' style={{padding: '24px'}}>
          <Dialog.Title>
            <Flex align='center' gap='2' mb='4'>
              <MagicWandIcon width='20' height='20' style={{color: '#667eea'}} />
              <Text size='5' weight='bold'>
                {t('dashboard.entities.ai_generation_title', 'Создание сущности с ИИ')}
              </Text>
            </Flex>
          </Dialog.Title>

          <Dialog.Close>
            <Button variant='ghost' size='2' style={{position: 'absolute', top: '16px', right: '16px'}} disabled={isGenerating || isActive} onClick={handleCloseButtonClick}>
              <Cross2Icon />
            </Button>
          </Dialog.Close>

          <Flex direction='column' gap='4'>
            {/* Description input */}
            <div>
              <Text size='2' weight='medium' mb='2' as='label' htmlFor='entity-description'>
                {t('dashboard.entities.ai_description_label', 'Опишите сущность, которую хотите создать:')}
              </Text>
              <TextArea
                id='entity-description'
                ref={textAreaRef}
                placeholder={t('dashboard.entities.ai_description_placeholder', 'Например: "Злой волшебник с магическим посохом, живущий в темной башне"')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{width: '100%'}}
                disabled={isGenerating}
                maxLength={MAX_TEXT_FIELD_LENGTH}
                autoFocus
              />
              <CharacterCounter currentLength={description.length} maxLength={MAX_TEXT_FIELD_LENGTH} className='mt-2' />
            </div>

            {/* Pipeline progress */}
            {(isGenerating || isActive || pipelineState.progress) && (
              <div
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <Text size='2' weight='medium' mb='3' style={{display: 'block'}}>
                  {t('dashboard.entities.ai_generation_progress', 'Прогресс генерации:')}
                </Text>
                <PipelineChecklist pipelineState={pipelineState} isActive={isActive || isGenerating} pipelineType='entity_generation' />
              </div>
            )}

            {/* Actions */}
            <Flex justify='end' gap='3' mt='4'>
              <Button variant='soft' color='gray' onClick={handleClose} disabled={isGenerating || isActive}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button
                onClick={isCompleted ? handleSave : handleGenerate}
                disabled={isCompleted ? !canSave : !canGenerate}
                style={{
                  background: canGenerate || canSave ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined
                }}
              >
                <MagicWandIcon width='16' height='16' />
                {isGenerating || isActive ? (
                  t('dashboard.entities.ai_generating', 'Генерирую...')
                ) : isCompleted ? (
                  t('common.save', 'Сохранить')
                ) : (
                  <>
                    {t('dashboard.entities.ai_generate', 'Создать с ИИ')}
                    {pipelinePrice && pipelinePrice !== '—' && (
                      <span style={{marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px'}}>
                        <LightningBoltIcon style={{width: '12px', height: '12px', color: '#ffffff'}} />
                        {pipelinePrice}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Модальное окно для отсутствия доступа к ИИ */}
      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </>
  );
};

export default AIEntityGenerationModal;
