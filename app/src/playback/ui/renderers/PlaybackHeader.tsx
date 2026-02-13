'use client';

import React from 'react';

import {useTranslation} from 'react-i18next';

import UserProfile from '@components/UserProfile';

import {PlaybackLanguageSelector} from '../components/PlaybackLanguageSelector';
import {RenderMode} from '../types';

export const PlaybackHeader: React.FC<{
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
}> = ({renderMode, onRenderModeChange}) => {
  const {t} = useTranslation();

  return (
    <div className='playback-header'>
      <div className='playback-header__logo'>flow</div>

      {/* Селектор языка локализации */}
      <div className='playback-header__language-selector'>
        <PlaybackLanguageSelector />
      </div>

      <div className='playback-header__mode-switcher'>
        <span className='playback-header__mode-label'>{t('playback.header.mode_novel')}</span>
        <div className='switch-container'>
          <div className='switch-track' data-state={renderMode === 'novel' ? 'checked' : 'unchecked'} onClick={() => onRenderModeChange(renderMode === 'novel' ? 'waterfall' : 'novel')}>
            <div className='switch-thumb' />
          </div>
        </div>
        <span className='playback-header__mode-label'>{t('playback.header.mode_waterfall')}</span>
      </div>
      <div className='playback-header__user'>
        <UserProfile showLoginButton={false} />
      </div>
    </div>
  );
};
