import React, {useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';

import {imageGCSService} from '../../../services/imageGCS.service';
import {useTeamStore} from '../../../store/useTeamStore';

import styles from './StorageUsage.module.scss';

interface StorageUsageProps {
  className?: string;
  showDetails?: boolean;
}

interface StorageStats {
  totalSizeBytes: number;
  imageCount: number;
  formattedSize: string;
  lastUpdated: Date;
}

/**
 * Компонент для отображения статистики использования хранилища команды
 */
export const StorageUsage: React.FC<StorageUsageProps> = ({className = '', showDetails = true}) => {
  const {t} = useTranslation();
  const {currentTeam} = useTeamStore();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    if (!currentTeam) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await imageGCSService.getStorageUsage(currentTeam.id);

      if (data) {
        setStats({
          totalSizeBytes: data.totalSizeBytes,
          imageCount: data.imageCount,
          formattedSize: data.formattedSize,
          lastUpdated: new Date()
        });
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики хранилища:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Обновляем статистику каждые 5 минут
    const interval = setInterval(loadStats, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentTeam]);

  if (!currentTeam) {
    return null;
  }

  if (isLoading && !stats) {
    return (
      <div className={`${styles.storageUsage} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>{t('storage.loading', 'Загрузка статистики...')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.storageUsage} ${styles.error} ${className}`}>
        <div className={styles.errorContent}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{t('storage.error', 'Ошибка загрузки статистики')}</span>
          <button className={styles.retryButton} onClick={loadStats} disabled={isLoading}>
            {t('common.retry', 'Повторить')}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return showDetails ? (
      <div className={`${styles.storageUsage} ${className}`}>
        <div className={styles.noData}>
          <span className={styles.noDataIcon}>📊</span>
          <span>{t('storage.no_data', 'Нет данных о хранилище')}</span>
        </div>
      </div>
    ) : null;
  }

  // Рассчитываем процент использования (например, лимит 1GB)
  const limitBytes = 1024 * 1024 * 1024; // 1GB лимит для примера
  const usagePercentage = Math.min((stats.totalSizeBytes / limitBytes) * 100, 100);

  return (
    <div className={`${styles.storageUsage} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('storage.title', 'Использование хранилища')}</h3>
        <button className={styles.refreshButton} onClick={loadStats} disabled={isLoading} title={t('storage.refresh', 'Обновить статистику')}>
          {isLoading ? '⟳' : '↻'}
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.mainStat}>
          <span className={styles.size}>{stats.formattedSize}</span>
          <span className={styles.sizeLabel}>{t('storage.used', 'использовано')}</span>
        </div>

        {showDetails && (
          <div className={styles.details}>
            <div className={styles.detail}>
              <span className={styles.detailIcon}>🖼️</span>
              <span className={styles.detailText}>
                {stats.imageCount} {t('storage.images', 'ассетов')}
              </span>
            </div>

            <div className={styles.detail}>
              <span className={styles.detailIcon}>📁</span>
              <span className={styles.detailText}>{t('storage.file_structure', 'Каждый ассет: оригинальный + оптимизированный + тумбнайл')}</span>
            </div>

            <div className={styles.detail}>
              <span className={styles.detailIcon}>⏰</span>
              <span className={styles.detailText}>
                {t('storage.updated', 'Обновлено')}: {stats.lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Прогресс бар использования */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${usagePercentage}%`,
                backgroundColor: usagePercentage > 80 ? '#ff6b6b' : usagePercentage > 60 ? '#ffa726' : '#4caf50'
              }}
            />
          </div>
          <div className={styles.progressLabel}>
            {usagePercentage.toFixed(1)}% {t('storage.of_limit', 'от лимита')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageUsage;
