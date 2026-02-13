import React from 'react';

import {useTranslation} from 'react-i18next';

import styles from './Canvas.module.scss';

interface LoadingStateProps {
  message?: string;
}

interface ErrorStateProps {
  error?: string;
  onRetry?: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({message}) => {
  const {t} = useTranslation();

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>{message || t('loading_states.loading_project', 'Загрузка проекта...')}</p>
    </div>
  );
};

export const ErrorState: React.FC<ErrorStateProps> = ({error, onRetry}) => {
  const {t} = useTranslation();

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <h3 className={styles.errorTitle}>{t('loading_states.failed_to_load_project', 'Не удалось загрузить проект')}</h3>
      <p className={styles.errorText}>{error || t('loading_states.unknown_error', 'Неизвестная ошибка')}</p>
      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry}>
          {t('loading_states.retry', 'Повторить')}
        </button>
      )}
    </div>
  );
};

export const InitializingState: React.FC = () => {
  const {t} = useTranslation();

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>{t('loading_states.initializing_project', 'Инициализация проекта...')}</p>
    </div>
  );
};
