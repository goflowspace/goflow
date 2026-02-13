import React from 'react';

import {ArrowLeftIcon, ListBulletIcon, MoonIcon, QuoteIcon, SunIcon, UpdateIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

export const PlaybackFooter: React.FC<{
  onVariablesToggle: () => void;
  onLogToggle: () => void;
  onBack: () => void;
  onRestart: () => void;
  canGoBack: boolean;
  isDarkTheme?: boolean;
  onThemeToggle?: () => void;
}> = ({onVariablesToggle, onLogToggle, onBack, onRestart, canGoBack, isDarkTheme = false, onThemeToggle}) => {
  const {t} = useTranslation();

  return (
    <div className='playback-footer'>
      <div className='playback-footer__group'>
        <button className='playback-button playback-button--accent' onClick={onVariablesToggle}>
          <QuoteIcon className='playback-icon' />
          {t('playback.footer.variables')}
        </button>
        {onThemeToggle && (
          <button className='playback-button playback-button--accent' onClick={onThemeToggle} title={isDarkTheme ? t('playback.footer.switch_to_light') : t('playback.footer.switch_to_dark')}>
            {isDarkTheme ? <SunIcon className='playback-icon' /> : <MoonIcon className='playback-icon' />}
            {isDarkTheme ? t('playback.footer.light_theme') : t('playback.footer.dark_theme')}
          </button>
        )}
      </div>

      <div className='playback-footer__group'>
        <button className='playback-button playback-button--accent' onClick={onBack} disabled={!canGoBack}>
          <ArrowLeftIcon className='playback-icon' />
          {t('playback.footer.back')}
        </button>
        <button className='playback-button playback-button--error' onClick={onRestart}>
          <UpdateIcon className='playback-icon' />
          {t('playback.footer.restart')}
        </button>
      </div>

      <button className='playback-button playback-button--accent' onClick={onLogToggle}>
        <ListBulletIcon className='playback-icon' />
        {t('playback.footer.log')}
      </button>
    </div>
  );
};
