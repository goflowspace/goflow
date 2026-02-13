import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {usePipelinePricing} from '@hooks/usePipelinePricing';
import {Cross2Icon, LightningBoltIcon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text, TextArea} from '@radix-ui/themes';
import {MAX_TEXT_FIELD_LENGTH} from '@types-folder/projectInfo';
import {useTranslation} from 'react-i18next';

import CharacterCounter from '@components/common/CharacterCounter';

import {PipelineState, UseAIPipelineProgressOptions, useAIPipelineProgress} from '../../hooks/useAIPipelineProgress';
import {AIProgressStatus} from '../../types/websocket.types';
import {PipelineChecklist} from './PipelineChecklist';

interface FieldPipelineModalProps {
  projectId: string;
  fieldType: string;
  fieldName: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (fieldType: string, description: string, usePipeline: boolean) => Promise<void>;
  isLoading?: boolean;
  isFieldEmpty?: boolean; // Indicates if field is empty
}

// Simple function to get emoji by field type
const getFieldEmoji = (fieldType: string): string => {
  const type = fieldType.toLowerCase();

  if (type.includes('logline')) return '⚡';
  if (type.includes('synopsis')) return '📝';
  if (type.includes('genre')) return '🎭';
  if (type.includes('format')) return '📐';
  if (type.includes('setting')) return '🌍';
  if (type.includes('audience')) return '👥';
  if (type.includes('themes')) return '💭';
  if (type.includes('atmosphere')) return '🌟';
  if (type.includes('features')) return '✨';
  if (type.includes('message')) return '💫';
  if (type.includes('references')) return '🎨';
  if (type.includes('constraints')) return '🏗️';

  return '📄';
};

// Function to translate field names from English to current language
const getLocalizedFieldName = (fieldName: string, t: any): string => {
  const fieldMapping: Record<string, string> = {
    logline: t('dashboard.project_info.logline', 'Logline'),
    synopsis: t('dashboard.project_info.synopsis', 'Synopsis'),
    genres: t('dashboard.project_info.genres', 'Genres'),
    formats: t('dashboard.project_info.formats', 'Formats'),
    setting: t('dashboard.project_info.setting', 'Setting'),
    targetAudience: t('dashboard.project_info.target_audience', 'Target audience'),
    mainThemes: t('dashboard.project_info.main_themes', 'Main themes'),
    atmosphere: t('dashboard.project_info.atmosphere', 'Atmosphere'),
    uniqueFeatures: t('dashboard.project_info.unique_features', 'Unique features'),
    message: t('dashboard.project_info.message', 'Message'),
    references: t('dashboard.project_info.references', 'References'),
    constraints: t('dashboard.project_info.constraints', 'Constraints')
  };

  return fieldMapping[fieldName] || fieldName;
};

const FieldPipelineModal: React.FC<FieldPipelineModalProps> = ({projectId, fieldType, fieldName, isOpen, onClose, onGenerate, isLoading = false, isFieldEmpty = false}) => {
  const {t} = useTranslation();
  const localizedFieldName = getLocalizedFieldName(fieldName, t);
  const [description, setDescription] = useState('');
  const [wasOpen, setWasOpen] = useState(false);
  const [wasGenerating, setWasGenerating] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const {getFormattedPrice} = usePipelinePricing();
  const pipelinePrice = getFormattedPrice('single-field-bible-v2');

  // Auto-focus when opening modal
  useEffect(() => {
    if (isOpen && textAreaRef.current) {
      const timer = setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Memoize options for stability
  const stableOptions: UseAIPipelineProgressOptions = useMemo(
    () => ({
      onCompleted: () => {
        // Generation completed
      },
      onError: (state: PipelineState) => {
        // Generation error
      }
    }),
    []
  );

  // Track AI pipeline progress
  const {progress, isActive, clearProgress} = useAIPipelineProgress(projectId, stableOptions);

  // Determine if description is required for this field
  const isDescriptionRequired = isFieldEmpty && (fieldType === 'logline' || fieldType === 'synopsis');
  const fieldEmoji = getFieldEmoji(fieldType);

  // Define handleClose first so it can be used in useEffect
  const handleClose = useCallback(() => {
    setDescription('');
    setWasGenerating(false);
    clearProgress();
    setWasOpen(false);
    onClose();
  }, [clearProgress, onClose]);

  const handleSubmit = async () => {
    // If generation is completed, this is the "Save" button - close modal
    if (progress?.status === 'completed') {
      handleClose();
      return;
    }

    // Otherwise this is generation button - start generation via pipeline
    if (!isDescriptionRequired || description.trim()) {
      try {
        await onGenerate(fieldType, description.trim(), true); // usePipeline = true
      } catch (error) {
        // Error handling is managed by the parent component
      }
    }
  };

  // Reset state only when opening modal (false -> true transition)
  useEffect(() => {
    if (isOpen && !wasOpen) {
      clearProgress();
      setDescription('');
      setWasGenerating(false);
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, clearProgress]);

  // Track loading state for auto-close
  useEffect(() => {
    if (isLoading) {
      setWasGenerating(true);
    } else if (wasGenerating && !isLoading) {
      // Generation completed, close modal after delay
      const timer = setTimeout(() => {
        handleClose();
      }, 1500); // 1.5 seconds to view result

      return () => clearTimeout(timer);
    }
  }, [isLoading, wasGenerating, handleClose]);

  // Also handle WebSocket completion for backward compatibility
  useEffect(() => {
    if (progress?.status === 'completed') {
      // Give user time to see result, then close
      const timer = setTimeout(() => {
        handleClose();
      }, 1500); // 1.5 seconds to view result

      return () => clearTimeout(timer);
    }
  }, [progress?.status, handleClose]);

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
              {fieldEmoji} {t('project_bible.field_pipeline_modal.title_template', {fieldName: localizedFieldName, defaultValue: `Генерация поля "${localizedFieldName}"`})}
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
            overflow: 'auto',
            flex: 1,
            paddingRight: '8px',
            marginRight: '-8px',
            paddingBottom: '16px'
          }}
        >
          <Flex direction='column' gap='4' style={{marginTop: '16px'}}>
            {/* Description of what will be generated */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #e0f2fe',
                borderRadius: '8px',
                marginBottom: '8px'
              }}
            >
              <Text size='2' style={{color: '#0066cc', display: 'block', marginBottom: '4px'}}>
                🚀 <strong>{t('project_bible.field_pipeline_modal.ai_pipeline_title')}</strong>
              </Text>
              <Text size='2' style={{color: '#333'}}>
                {t('project_bible.field_pipeline_modal.ai_pipeline_description', {fieldName: localizedFieldName})}
              </Text>
            </div>

            {/* Input field */}
            <div>
              <Text size='2' weight='medium' style={{marginBottom: '8px', display: 'block'}}>
                {isFieldEmpty && (fieldType === 'logline' || fieldType === 'synopsis')
                  ? t('project_bible.field_pipeline_modal.input_label_required')
                  : t('project_bible.field_pipeline_modal.input_label_optional')}
                {isFieldEmpty && (fieldType === 'logline' || fieldType === 'synopsis') && <span style={{color: '#dc2626', marginLeft: '4px'}}>*</span>}
              </Text>
              <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                <TextArea
                  ref={textAreaRef}
                  value={description}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Truncate to maximum limit
                    const truncatedValue = value.length > MAX_TEXT_FIELD_LENGTH ? value.substring(0, MAX_TEXT_FIELD_LENGTH) : value;
                    setDescription(truncatedValue);
                  }}
                  placeholder={
                    isFieldEmpty && (fieldType === 'logline' || fieldType === 'synopsis')
                      ? t('project_bible.field_pipeline_modal.placeholder_required')
                      : t('project_bible.field_pipeline_modal.placeholder_optional', {fieldName: localizedFieldName})
                  }
                  rows={3}
                  style={{width: '100%'}}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                  autoFocus
                />
                <CharacterCounter currentLength={description.length} maxLength={MAX_TEXT_FIELD_LENGTH} />
              </div>
            </div>

            {/* AI Progress */}
            {progress && <PipelineChecklist pipelineState={progress} isActive={isActive} />}
          </Flex>
        </div>

        {/* Fixed buttons at bottom */}
        <div
          style={{
            borderTop: '1px solid #e0e0e0',
            padding: '16px',
            backgroundColor: 'white',
            flexShrink: 0
          }}
        >
          <Flex gap='3' justify='end'>
            <Dialog.Close>
              <Button variant='soft' color='gray' disabled={isLoading || isActive}>
                {t('common.cancel', 'Отмена')}
              </Button>
            </Dialog.Close>
            <Button
              variant='soft'
              color='violet'
              onClick={handleSubmit}
              disabled={
                progress?.status === 'completed'
                  ? false // "Save" button is always active after completion
                  : isLoading || isActive || (isDescriptionRequired && !description.trim())
              }
              loading={isLoading || isActive}
            >
              {progress?.status === 'completed' ? (
                t('common.save', 'Сохранить')
              ) : (
                <>
                  🚀 {t('project_bible.field_pipeline_modal.generate_button', {fieldName: localizedFieldName})}
                  {pipelinePrice && pipelinePrice !== '—' && (
                    <span style={{marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px'}}>
                      <LightningBoltIcon style={{width: '12px', height: '12px', color: '#8b5cf6'}} />
                      {pipelinePrice}
                    </span>
                  )}
                </>
              )}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default FieldPipelineModal;
