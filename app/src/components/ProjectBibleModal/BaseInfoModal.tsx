import React, {useEffect, useMemo, useRef, useState} from 'react';

import {Cross2Icon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text, TextArea} from '@radix-ui/themes';
import {MAX_TEXT_FIELD_LENGTH} from '@types-folder/projectInfo';
import {useTranslation} from 'react-i18next';

import CharacterCounter from '@components/common/CharacterCounter';

import {PipelineState, useAIPipelineProgress} from '../../hooks/useAIPipelineProgress';
import {PipelineChecklist} from './PipelineChecklist';

interface BaseInfoModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (description: string) => Promise<void>;
  isLoading?: boolean;
  isComprehensiveMode?: boolean;
  filledFields?: string[];
}

const BaseInfoModal: React.FC<BaseInfoModalProps> = ({projectId, isOpen, onClose, onGenerate, isLoading = false, isComprehensiveMode = false, filledFields = []}) => {
  const {t} = useTranslation();
  const [description, setDescription] = useState('');
  const [wasOpen, setWasOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textAreaRef.current) {
      const timer = setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const stableOptions = useMemo(
    () => ({
      onCompleted: (state: PipelineState) => {
        console.log('🎉 AI Pipeline completed in modal', state);
      },
      onError: (state: PipelineState) => {
        console.error('❌ AI Pipeline error in modal:', state);
      }
    }),
    []
  );

  const {pipelineState, isActive, clearProgress} = useAIPipelineProgress(isComprehensiveMode ? projectId : '', stableOptions);

  useEffect(() => {
    if (isOpen && !wasOpen) {
      clearProgress();
      setDescription('');
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, clearProgress]);

  const handleSubmit = async () => {
    if (pipelineState.status === 'completed') {
      handleClose();
      return;
    }
    if (description.trim()) {
      await onGenerate(description.trim());
    }
  };

  const handleClose = () => {
    setDescription('');
    clearProgress();
    setWasOpen(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Content style={{maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <Dialog.Title>
          <Flex align='center' justify='between'>
            <Text size='5' weight='bold'>
              {isComprehensiveMode ? t('project_bible.comprehensive_modal.title') : t('project_bible.base_info_modal.title')}
            </Text>
            <Dialog.Close>
              <Button variant='ghost' size='1' disabled={isLoading || isActive}>
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>
        <div style={{overflow: 'auto', flex: 1, paddingRight: '8px', marginRight: '-8px', paddingBottom: '16px'}}>
          <Flex direction='column' gap='4' style={{marginTop: '16px'}}>
            {isComprehensiveMode && filledFields.length > 0 && !isActive && pipelineState.status !== 'completed' && (
              <div style={{padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px'}}>
                <Text size='3' weight='bold' style={{color: '#dc2626', display: 'block', marginBottom: '8px'}}>
                  ⚠️ {t('project_bible.comprehensive_modal.warning_title')}
                </Text>
                <Text size='2' style={{color: '#991b1b'}}>
                  {t('project_bible.comprehensive_modal.warning_filled_fields')} <strong>{filledFields.join(', ')}</strong>
                  <br />
                  {t('project_bible.comprehensive_modal.warning_description')}
                </Text>
              </div>
            )}
            <div>
              <Text size='2' weight='medium' style={{marginBottom: '8px', display: 'block'}}>
                {t('project_bible.base_info_modal.input_label')}
              </Text>
              <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                <TextArea
                  ref={textAreaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_TEXT_FIELD_LENGTH))}
                  placeholder={t('project_bible.base_info_modal.placeholder')}
                  rows={3}
                  maxLength={MAX_TEXT_FIELD_LENGTH}
                  autoFocus
                />
                <CharacterCounter currentLength={description.length} maxLength={MAX_TEXT_FIELD_LENGTH} />
              </div>
            </div>
            {isComprehensiveMode && isActive && <PipelineChecklist pipelineState={pipelineState} isActive={isActive} />}
          </Flex>
        </div>
        <div style={{borderTop: '1px solid #e0e0e0', padding: '16px', backgroundColor: 'white', flexShrink: 0}}>
          <Flex gap='3' justify='end'>
            <Dialog.Close>
              <Button variant='soft' disabled={isLoading || isActive}>
                {t('common.cancel')}
              </Button>
            </Dialog.Close>
            <Button onClick={handleSubmit} disabled={pipelineState.status === 'completed' ? false : !description.trim() || isLoading || isActive} loading={isLoading || isActive}>
              {pipelineState.status === 'completed'
                ? t('common.save')
                : isComprehensiveMode
                  ? t('project_bible.comprehensive_modal.generate_button')
                  : t('project_bible.base_info_modal.generate_button')}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default BaseInfoModal;
