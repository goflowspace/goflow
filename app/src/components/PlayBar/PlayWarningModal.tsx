'use client';

import React from 'react';

import {ExclamationTriangleIcon, PlayIcon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

interface PlayWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayAnyway: () => void;
}

export const PlayWarningModal: React.FC<PlayWarningModalProps> = ({open, onOpenChange, onPlayAnyway}) => {
  const {t} = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{maxWidth: '500px'}}>
        <Flex direction='column' gap='4'>
          <Flex align='center' gap='2'>
            <ExclamationTriangleIcon width='24' height='24' color='#F59E0B' />
            <Dialog.Title style={{margin: 0}}>{t('conditions_play.warning_heading', 'Playback warning')}</Dialog.Title>
          </Flex>

          <Text size='2' style={{lineHeight: '1.5'}}>
            {t('conditions_play.warning_text', 'Your story contains missing conditions on links where it should be. Playback can be unpredictable.')}
          </Text>

          <Flex gap='3' justify='end' mt='4'>
            <Button variant='soft' color='gray' onClick={() => onOpenChange(false)} size='2'>
              {t('conditions_play.warning_cancel_button', 'Cancel')}
            </Button>
            <Button variant='solid' color='amber' onClick={onPlayAnyway} size='2'>
              <PlayIcon />
              {t('conditions_play.warning_play_button', 'Play anyway')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
