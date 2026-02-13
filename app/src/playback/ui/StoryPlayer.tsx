'use client';

/**
 * Основной компонент для запуска и воспроизведения историй
 * Инициализирует движок и рендерер, загружает данные истории
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {Theme} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {PlaybackStorageService} from '../../services/playbackStorageService';
import {STORY_KEY} from '../../services/storageService';
import {ConditionEvaluatorImpl} from '../engine/conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../engine/conditions/ConditionStrategyFactory';
import {StoryData} from '../engine/core/StoryData';
import {StoryEngineImpl} from '../engine/core/StoryEngineImpl';
import {StoryEngine} from '../engine/interfaces/StoryEngine';
import {timelineToStoryData} from '../engine/utils/timelineToStoryData';
import {PlaybackLogProvider, usePlaybackLog} from './PlaybackLogPanelV2';
import {RadixRendererComponent} from './renderers/RadixRendererClean';

import '@radix-ui/themes/styles.css';

import '@styles/radix-player.css';

// Компонент-обертка для установки данных локализации
const PlaybackWithLocalization: React.FC<{
  engine: StoryEngine;
  playbackProjectId: string | null;
  playbackTeamId: string | null;
  localizationData: any;
}> = ({engine, playbackProjectId, playbackTeamId, localizationData}) => {
  return (
    <PlaybackLogProvider initialProjectId={playbackProjectId} initialTeamId={playbackTeamId}>
      <PlaybackLocalizationSetter localizationData={localizationData}>
        <RadixRendererComponent engine={engine} isInitialRender={true} />
      </PlaybackLocalizationSetter>
    </PlaybackLogProvider>
  );
};

// Компонент для установки данных локализации в контекст
const PlaybackLocalizationSetter: React.FC<{
  localizationData: any;
  children: React.ReactNode;
}> = ({localizationData, children}) => {
  const playbackLog = usePlaybackLog();

  useEffect(() => {
    if (localizationData) {
      playbackLog.setLocalizationData(localizationData);
    }
  }, [localizationData, playbackLog]);

  return <>{children}</>;
};

export const StoryPlayer: React.FC = () => {
  const {t} = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<StoryEngine | null>(null);
  const [playbackProjectId, setPlaybackProjectId] = useState<string | null>(null);
  const [playbackTeamId, setPlaybackTeamId] = useState<string | null>(null);
  const [localizationData, setLocalizationData] = useState<any>(null);

  useEffect(() => {
    const initializeStory = async () => {
      try {
        // Получаем playbackId из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        const playbackId = urlParams.get('playbackId');

        let storyData: StoryData;

        if (playbackId) {
          // Пытаемся загрузить данные из IndexedDB
          const playbackData = await PlaybackStorageService.loadPlaybackData(playbackId);

          if (playbackData) {
            // Сохраняем teamId и projectId для использования в компонентах
            setPlaybackTeamId(playbackData.teamId);
            setPlaybackProjectId(playbackData.projectId);
            setLocalizationData(playbackData.localization);

            storyData = {
              title: playbackData.projectName,
              data: playbackData.data,
              metadata: playbackData.metadata
            };
          } else {
            console.warn('Playback data not found in IndexedDB');
            setError(t('playback.story_player.story_not_found'));
            return;
          }
        } else {
          setError(t('playback.story_player.story_not_found'));
          return;
        }

        // Инициализируем движок
        const strategyFactory = new ConditionStrategyFactory();
        const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
        const newEngine = new StoryEngineImpl(conditionEvaluator);
        newEngine.initialize(storyData);
        setEngine(newEngine);
      } catch (err) {
        console.error('Ошибка при инициализации истории:', err);
        setError(t('playback.story_player.error_loading_story'));
      }
    };

    initializeStory();
  }, [t]);

  const renderer = useMemo(() => {
    if (!engine) return null;
    return <PlaybackWithLocalization engine={engine} playbackProjectId={playbackProjectId} playbackTeamId={playbackTeamId} localizationData={localizationData} />;
  }, [engine, playbackProjectId, playbackTeamId, localizationData]);

  return (
    <Theme appearance='light' accentColor='orange' grayColor='slate' radius='medium' scaling='100%'>
      <div className='story-player' style={{minHeight: '100vh'}}>
        {error ? (
          <div
            className='error-message'
            style={{
              padding: '16px',
              maxWidth: '480px',
              margin: '0 auto',
              marginTop: '20px',
              background: 'var(--color-card)',
              borderRadius: 'var(--radius-3)',
              boxShadow: 'var(--shadow-1)'
            }}
          >
            {error}
          </div>
        ) : (
          <div className='story-container' data-testid='story-container'>
            {renderer}
          </div>
        )}
      </div>
    </Theme>
  );
};
