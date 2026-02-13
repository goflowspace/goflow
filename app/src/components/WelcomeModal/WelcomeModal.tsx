'use client';

import React, {useEffect} from 'react';

import {usePathname} from 'next/navigation';

import {Cross2Icon} from '@radix-ui/react-icons';
import {Box, Button, Dialog, Flex, Switch, Text} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {useTranslation} from 'react-i18next';

import {useEditorSettingsStore} from '@store/useEditorSettingsStore';
import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';

import {useInputDeviceSettings} from '../../hooks/useInputDeviceSettings';
import {trackWelcomeWindowClosed} from '../../services/analytics';
import {InputDeviceType} from '../../utils/inputDetection';

const WelcomeModal = () => {
  const {t} = useTranslation();
  const pathname = usePathname();
  const {showWelcomeModal, setShowWelcomeModal, includeWelcomeStory, setIncludeWelcomeStory} = useProjectStore();
  const {inputDevice, setManualInputDevice} = useInputDeviceSettings();
  const setEditorControls = useEditorSettingsStore((state) => state.setControls);
  const editorControls = useEditorSettingsStore((state) => state.controls);
  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  const isAppPage = pathname.includes('/editor');

  useEffect(() => {
    if (showWelcomeModal && isAppPage) {
      setShowWelcomeModal(true);
    }
  }, []);

  useEffect(() => {
    if (showWelcomeModal && isAppPage && (inputDevice === 'unknown' || editorControls === 'auto')) {
      setManualInputDevice('mouse');
      setEditorControls('mouse');
    }
  }, [showWelcomeModal, isAppPage, inputDevice, editorControls, setManualInputDevice, setEditorControls]);

  const handleContinue = () => {
    setShowWelcomeModal(false);
    trackWelcomeWindowClosed(includeWelcomeStory, projectId, timelineId);
  };

  const handleOpenChange = (open: boolean) => {
    setShowWelcomeModal(open);
    if (!open) {
      trackWelcomeWindowClosed(includeWelcomeStory, projectId, timelineId);
    }
  };

  const handleInputDeviceChange = (checked: boolean) => {
    const deviceType = checked ? 'touchpad' : 'mouse';
    setManualInputDevice(deviceType as InputDeviceType);

    // Обновляем настройки в хранилище редактора
    setEditorControls(deviceType);
  };

  if (!showWelcomeModal || !isAppPage) {
    return null;
  }

  return (
    <Dialog.Root open={showWelcomeModal} onOpenChange={handleOpenChange}>
      <Dialog.Content style={{maxWidth: '500px'}}>
        <Flex direction='column' gap='4'>
          <Dialog.Title>{t('welcome_window.heading')}</Dialog.Title>
          <Text size='2'>{t('welcome_window.text')}</Text>

          <Box>
            <Text as='p' weight='medium'>
              {t('welcome_window.set_hint')}
            </Text>
            <Flex align='center' justify='between' gap='3' mt='3' p='3' style={{background: 'var(--gray-2)', borderRadius: 8}}>
              <label htmlFor='welcome-story-switch'>
                <Text>{t('welcome_window.set_welcome_story_hint')}</Text>
              </label>
              <Switch size='3' checked={includeWelcomeStory} onCheckedChange={setIncludeWelcomeStory} />
            </Flex>
          </Box>

          <Box>
            <Text as='p' weight='medium'>
              {t('editor_settings.controls_section', 'Controls')}
            </Text>
            <Flex align='center' justify='between' gap='3' mt='3' p='3' style={{background: 'var(--gray-2)', borderRadius: 8}}>
              <Text>{t('editor_settings.controls_section_mouse', 'Mouse')}</Text>
              <Switch size='3' checked={inputDevice === 'touchpad'} onCheckedChange={handleInputDeviceChange} />
              <Text>{t('editor_settings.controls_section_touchpad', 'Touchpad')}</Text>
            </Flex>
            <Text size='1' color='gray' mt='2' style={{textAlign: 'center'}}>
              {t('welcome_window.controls_change_hint', 'You can change the controls later in the settings')}
            </Text>
          </Box>

          <Flex justify='center' mt='4'>
            <Button variant='soft' size='3' onClick={handleContinue}>
              {t('welcome_window.continue_button')}
            </Button>
          </Flex>
        </Flex>

        <Dialog.Close>
          <Button variant='ghost' style={{position: 'absolute', top: 8, right: 8}}>
            <Cross2Icon width='18' height='18' />
          </Button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default WelcomeModal;
