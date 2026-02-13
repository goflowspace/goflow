import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {Cross2Icon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text, TextArea} from '@radix-ui/themes';
import {MAX_TEXT_FIELD_LENGTH} from '@types-folder/projectInfo';
import {useTranslation} from 'react-i18next';

import CharacterCounter from '@components/common/CharacterCounter';

interface SynopsisRequiredModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (description: string) => Promise<void>;
  isLoading?: boolean;
  fieldName?: string; // Название поля, для которого требуется синопсис
}

const SynopsisRequiredModal: React.FC<SynopsisRequiredModalProps> = ({projectId, isOpen, onClose, onGenerate, isLoading = false, fieldName = ''}) => {
  const {t} = useTranslation();
  const [description, setDescription] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when opening modal
  useEffect(() => {
    if (isOpen && textAreaRef.current) {
      const timer = setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setDescription('');
    onClose();
  }, [onClose]);

  const handleSubmit = async () => {
    if (description.trim()) {
      try {
        await onGenerate(description.trim());
      } catch (error) {
        // Error handling is managed by the parent component
      }
    }
  };

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setDescription('');
    }
  }, [isOpen]);

  const canGenerate = description.trim().length > 0;

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
              ⚠️ {t('project_bible.synopsis_required_modal.title', 'Нужен синопсис для генерации')}
            </Text>
            <Dialog.Close>
              <Button variant='ghost' size='1' disabled={isLoading}>
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <div style={{padding: '24px'}}>
          <Flex direction='column' gap='4'>
            <div>
              <Text size='3' color='gray' style={{lineHeight: '1.5'}}>
                {t('project_bible.synopsis_required_modal.description', {
                  fieldName: fieldName,
                  defaultValue: `Для генерации поля "${fieldName}" сначала необходимо создать синопсис проекта. Синопсис поможет ИИ лучше понять контекст и создать более качественный контент.`
                })}
              </Text>
            </div>

            <div>
              <Text size='2' weight='medium' style={{marginBottom: '8px', display: 'block'}}>
                {t('project_bible.synopsis_required_modal.input_label', 'Описание идеи проекта')}
              </Text>
              <TextArea
                ref={textAreaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('project_bible.synopsis_required_modal.placeholder', 'Опишите ваш проект: жанр, основной конфликт, персонажей, сеттинг, ключевые идеи...')}
                rows={6}
                maxLength={MAX_TEXT_FIELD_LENGTH}
                disabled={isLoading}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: '120px',
                  maxHeight: '300px'
                }}
              />
              <div style={{marginTop: '8px'}}>
                <CharacterCounter currentLength={description.length} maxLength={MAX_TEXT_FIELD_LENGTH} />
              </div>
            </div>
          </Flex>
        </div>

        <Flex
          align='center'
          justify='end'
          gap='3'
          style={{
            padding: '24px',
            borderTop: '1px solid var(--gray-6)'
          }}
        >
          <Button variant='ghost' onClick={handleClose} disabled={isLoading}>
            {t('common.cancel', 'Отмена')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canGenerate || isLoading} loading={isLoading}>
            {t('project_bible.synopsis_required_modal.generate_button', 'Сгенерировать синопсис')}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SynopsisRequiredModal;
