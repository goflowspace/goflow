'use client';

import React, {Suspense} from 'react';

import {useTeamSwitch} from '@hooks/useTeamSwitch';
import {Container, Flex, Text} from '@radix-ui/themes';

import AuthGuard from '@components/AuthGuard/AuthGuard';

import {StoryPlayer} from '../../../../playback/ui/StoryPlayer';

/**
 * Страница воспроизведения истории
 * Использует модульную архитектуру с выделенным движком и рендерером
 */
const PlayPage = () => {
  // Обрабатываем переключение команд с автоматическим редиректом
  useTeamSwitch({
    redirectFromProject: true
  });

  return (
    <AuthGuard>
      <Suspense
        fallback={
          <Container size='2' py='6'>
            <Flex direction='column' align='center' justify='center' gap='4'>
              <Text>Loading story...</Text>
            </Flex>
          </Container>
        }
      >
        <StoryPlayer />
      </Suspense>
    </AuthGuard>
  );
};

export default PlayPage;
