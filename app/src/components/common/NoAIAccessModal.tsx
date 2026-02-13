import React from 'react';

import {Cross2Icon, ExclamationTriangleIcon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {isOSS} from 'src/utils/edition';

interface NoAIAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Модальное окно для отображения сообщения об отсутствии доступа к ИИ функциям
 */
export const NoAIAccessModal: React.FC<NoAIAccessModalProps> = ({isOpen, onClose}) => {
  const {t} = useTranslation();
  const ossEdition = isOSS();

  const title = ossEdition ? t('ai_access.modal.oss_title', 'AI features are not available') : t('ai_access.modal.title', 'Доступ к ИИ ограничен');

  const description = ossEdition
    ? t('ai_access.modal.oss_description', 'AI features are only available in Go Flow Cloud. Visit goflow.space to learn more.')
    : t('ai_access.modal.description', 'У вас нет доступа к функциям искусственного интеллекта в этой команде. Для получения доступа обратитесь к администратору команды.');

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content maxWidth='450px'>
        <Dialog.Title style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--orange-11)'}}>
          <ExclamationTriangleIcon width='20' height='20' />
          {title}
        </Dialog.Title>

        <Dialog.Description style={{marginTop: '16px', lineHeight: '1.5'}}>
          <Text size='2' color='gray'>
            {description}
          </Text>
        </Dialog.Description>

        <Flex gap='3' justify='end' style={{marginTop: '24px'}}>
          <Dialog.Close>
            <Button variant='soft' color='gray' onClick={onClose}>
              {t('common.understood', 'Понятно')}
            </Button>
          </Dialog.Close>
        </Flex>

        <Dialog.Close>
          <Button
            variant='ghost'
            size='1'
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              color: 'var(--gray-11)'
            }}
            onClick={onClose}
            aria-label={t('common.close', 'Закрыть')}
          >
            <Cross2Icon />
          </Button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
};
