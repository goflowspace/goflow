import React, {useState} from 'react';

import {usePipelinePricing} from '@hooks/usePipelinePricing';
import {Cross2Icon, LightningBoltIcon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text, TextArea} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import CharacterCounter from '@components/common/CharacterCounter';

import {useAIPipelineProgress} from '../../../../hooks/useAIPipelineProgress';
import {AIProgressStatus} from '../../../../types/websocket.types';
import {PipelineChecklist} from '../../../ProjectBibleModal/PipelineChecklist';

interface EntityImagePipelineModalProps {
  projectId: string;
  entityId: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (customPromptRequirements?: string[], imageProvider?: 'gemini' | 'openai', imageQuality?: 'low' | 'medium' | 'high' | 'auto') => Promise<void>;
  isLoading?: boolean;
}

const EntityImagePipelineModal: React.FC<EntityImagePipelineModalProps> = ({projectId, entityId, entityName, isOpen, onClose, onGenerate, isLoading = false}) => {
  const {t} = useTranslation();
  const [customRequirements, setCustomRequirements] = useState('');
  const [wasOpen, setWasOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const {getFormattedPrice} = usePipelinePricing();
  const pipelinePrice = getFormattedPrice('entity-image-generation-pipeline-v2');

  // Auto-focus when opening modal
  React.useEffect(() => {
    if (isOpen && textAreaRef.current) {
      const timer = setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Memoize options for stability
  const stableOptions = React.useMemo(
    () => ({
      onCompleted: () => {
        setIsCompleted(true);
      },
      onError: (state: any) => {
        setIsCompleted(false);
      }
    }),
    []
  );

  // Track AI pipeline progress
  const {pipelineState: progress, isActive, clearProgress} = useAIPipelineProgress(projectId, stableOptions);

  const handleClose = React.useCallback(() => {
    if (isLoading || isActive) return;
    onClose();
  }, [isLoading, isActive, onClose]);

  // Reset state only when opening modal (false -> true transition)
  React.useEffect(() => {
    if (isOpen && !wasOpen) {
      clearProgress();
      setCustomRequirements('');
      setIsCompleted(false);
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, clearProgress]);

  // Auto-close modal on completion
  React.useEffect(() => {
    if (progress?.status === 'completed') {
      // Give user time to see result, then close
      const timer = setTimeout(() => {
        handleClose();
      }, 1000); // 2 seconds to view result

      return () => clearTimeout(timer);
    }
  }, [progress?.status, handleClose]);

  const handleSubmit = async (imageProvider: 'gemini' | 'openai' = 'gemini', imageQuality: 'low' | 'medium' | 'high' | 'auto' = 'low') => {
    if (isLoading || isActive) return;

    try {
      const requirements = customRequirements
        .split('\n')
        .map((req) => req.trim())
        .filter((req) => req.length > 0);

      await onGenerate(requirements.length > 0 ? requirements : undefined, imageProvider, imageQuality);
    } catch (error) {
      // Error handling is done at the higher level
    }
  };

  const canGenerate = !isLoading && !isActive && !isCompleted;
  const showProgress = isActive || (progress && ['started', 'processing', 'completed'].includes(progress.status));

  const maxLength = 1000; // Maximum length for custom requirements

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Content
        style={{
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Dialog.Title>
          <Flex align='center' justify='between'>
            <Text size='5' weight='bold'>
              🎨 {t('dashboard.entities.image_pipeline.title', 'Генерация изображения для "{{entityName}}"', {entityName})}
            </Text>
            <Dialog.Close>
              <Button variant='ghost' size='1' disabled={isLoading || isActive}>
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflow: 'hidden'
          }}
        >
          {/* Description Section */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}
          >
            <Text size='2' color='gray' style={{display: 'block', marginBottom: '12px'}}>
              {t(
                'dashboard.entities.image_pipeline.description',
                'ИИ создаст изображение сущности на основе всех её полей и контекста проекта. Процесс включает анализ данных, создание оптимального промпта и генерацию изображения.'
              )}
            </Text>
          </div>

          {/* Custom Requirements Input */}
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <label
              style={{
                marginBottom: '8px',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              {t('dashboard.entities.image_pipeline.custom_requirements', 'Дополнительные требования (опционально)')}
            </label>

            <TextArea
              ref={textAreaRef}
              value={customRequirements}
              onChange={(e) => setCustomRequirements(e.target.value)}
              placeholder={t(
                'dashboard.entities.image_pipeline.requirements_placeholder',
                'Например:\n- Подчеркнуть героический характер\n- Добавить магические эффекты\n- Сделать более детализированным\n- Избегать темных тонов'
              )}
              disabled={isLoading || isActive}
              style={{
                minHeight: '120px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              autoFocus
            />

            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text size='2' color='gray'>
                {t('dashboard.entities.image_pipeline.requirements_hint', 'Каждое требование с новой строки')}
              </Text>
              <CharacterCounter currentLength={customRequirements.length} maxLength={maxLength} />
            </div>
          </div>

          {/* Progress Section */}
          {showProgress && (
            <div
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                overflow: 'hidden',
                maxHeight: '300px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  borderBottom: '1px solid #e9ecef'
                }}
              >
                <Text size='3' weight='medium'>
                  🔄 {t('dashboard.entities.image_pipeline.progress_title', 'Прогресс генерации')}
                </Text>
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '16px'
                }}
              >
                <PipelineChecklist pipelineState={progress} isActive={isActive} pipelineType='entity_image_generation' />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <Flex gap='3' mt='4' justify='end'>
          <Button size='3' variant='soft' color='gray' onClick={handleClose} disabled={isLoading || isActive}>
            {t('common.cancel', 'Отмена')}
          </Button>

          {/* Быстрая генерация - Gemini */}
          <Button size='3' variant='soft' color='violet' onClick={() => handleSubmit('gemini', 'low')} disabled={!canGenerate || customRequirements.length > maxLength} loading={isLoading || isActive}>
            {isActive ? (
              t('dashboard.entities.image_pipeline.generating', 'Генерирую...')
            ) : (
              <>
                {t('dashboard.entities.image_pipeline.quick_generation', '⚡ Generate')}
                {pipelinePrice && pipelinePrice !== '—' && (
                  <span style={{marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px'}}>
                    <LightningBoltIcon style={{width: '12px', height: '12px', color: '#8b5cf6'}} />
                    {pipelinePrice}
                  </span>
                )}
              </>
            )}
          </Button>

          {/* HQ генерация - OpenAI */}
          {/* <Button
            onClick={() => handleSubmit('openai', 'high')}
            disabled={!canGenerate || customRequirements.length > maxLength}
            loading={isLoading || isActive}
            style={{
              background: canGenerate ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' : undefined,
              color: 'white'
            }}
          >
            {isActive ? t('entities.image_pipeline.generating', 'Генерирую...') : t('entities.image_pipeline.hq_generation', '🎨 HQ генерация')}
          </Button> */}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default EntityImagePipelineModal;
