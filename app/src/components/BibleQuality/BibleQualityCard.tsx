'use client';

import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {CheckCircledIcon, ChevronRightIcon, ExclamationTriangleIcon} from '@radix-ui/react-icons';
import {Badge, Button, Flex, Text} from '@radix-ui/themes';
import {api} from '@services/api';
import {BibleQualityScore, getBibleQualityColor, getBibleQualityText} from '@types-folder/bibleQuality';
import {useTranslation} from 'react-i18next';

import s from './BibleQualityCard.module.scss';

interface BibleQualityCardProps {
  projectId: string;
  onViewDetails?: () => void;
}

export const BibleQualityCard: React.FC<BibleQualityCardProps> = ({projectId, onViewDetails}) => {
  const {t} = useTranslation();
  const [bibleQuality, setBibleQuality] = useState<BibleQualityScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadBibleQuality();
    }
  }, [projectId]);

  const loadBibleQuality = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const quality = await api.getBibleQuality(projectId);
      setBibleQuality(quality);
    } catch (error) {
      console.error('Failed to load bible quality:', error);
      setError('Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!projectId) return;

    setIsLoading(true);
    try {
      const quality = await api.recalculateBibleQuality(projectId);
      setBibleQuality(quality);
    } catch (error) {
      console.error('Failed to recalculate bible quality:', error);
      setError('Ошибка пересчета');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails();
    }
  };

  // Не показываем карточку если нет projectId
  if (!projectId) {
    return null;
  }

  const score = bibleQuality?.totalScore || 0;
  const color = getBibleQualityColor(score);
  const statusText = getBibleQualityText(score);
  const criticalRecommendations = bibleQuality?.recommendations?.filter((r) => r.severity === 'critical').length || 0;
  const importantRecommendations = bibleQuality?.recommendations?.filter((r) => r.severity === 'important').length || 0;

  return (
    <div className={`${s.card} ${onViewDetails ? s.clickable : ''}`} onClick={handleClick}>
      <Flex align='center' gap='4' style={{width: '100%'}}>
        {/* Круговая диаграмма */}
        <div className={s.scoreContainer}>
          {isLoading ? (
            <div className={s.loading}>
              <div className={s.spinner} />
            </div>
          ) : error ? (
            <div className={s.error}>
              <ExclamationTriangleIcon color='#ef4444' />
            </div>
          ) : (
            <div className={s.scoreCircle}>
              <svg width='50' height='50' className={s.circle}>
                <circle cx='25' cy='25' r='20' fill='none' stroke='#374151' strokeWidth='3' opacity='0.3' />
                <circle
                  cx='25'
                  cy='25'
                  r='20'
                  fill='none'
                  stroke={color}
                  strokeWidth='3'
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - score / 100)}`}
                  strokeLinecap='round'
                  transform='rotate(-90 25 25)'
                  style={{transition: 'stroke-dashoffset 0.5s ease'}}
                />
              </svg>
              <div className={s.scoreText} style={{color}}>
                {score}%
              </div>
            </div>
          )}
        </div>

        {/* Основная информация */}
        <div className={s.content}>
          <Flex direction='column' gap='1' style={{flex: 1}}>
            <Flex align='center' gap='2'>
              <Text size='4' weight='bold'>
                Качество библии
              </Text>
              {!isLoading && !error && (
                <Badge color={score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red'} size='1'>
                  {statusText}
                </Badge>
              )}
            </Flex>

            {!isLoading && !error && bibleQuality && (
              <Text size='2' color='gray'>
                Заполненность: {bibleQuality.completenessScore}% • Качество: {bibleQuality.qualityScore}% • Согласованность: {bibleQuality.consistencyScore}%
              </Text>
            )}

            {error && (
              <Text size='2' color='red'>
                {error}
              </Text>
            )}

            {isLoading && (
              <Text size='2' color='gray'>
                Загрузка оценки качества...
              </Text>
            )}
          </Flex>
        </div>

        {/* Рекомендации и действия */}
        <div className={s.actions}>
          {!isLoading && !error && bibleQuality && (
            <Flex direction='column' align='end' gap='2'>
              {(criticalRecommendations > 0 || importantRecommendations > 0) && (
                <Flex gap='2'>
                  {criticalRecommendations > 0 && (
                    <Badge color='red' size='1'>
                      {criticalRecommendations} критично
                    </Badge>
                  )}
                  {importantRecommendations > 0 && (
                    <Badge color='yellow' size='1'>
                      {importantRecommendations} важно
                    </Badge>
                  )}
                </Flex>
              )}

              {criticalRecommendations === 0 && importantRecommendations === 0 && (
                <Flex align='center' gap='1'>
                  <CheckCircledIcon color='#10b981' />
                  <Text size='2' color='green'>
                    Все хорошо
                  </Text>
                </Flex>
              )}

              <Flex gap='2'>
                <Button size='1' variant='soft' onClick={handleRecalculate} disabled={isLoading}>
                  Пересчитать
                </Button>
                {onViewDetails && (
                  <Button size='1' variant='outline' onClick={handleClick}>
                    Подробнее
                    <ChevronRightIcon />
                  </Button>
                )}
              </Flex>
            </Flex>
          )}

          {error && (
            <Button size='1' variant='soft' color='red' onClick={handleRecalculate} disabled={isLoading}>
              Повторить
            </Button>
          )}
        </div>
      </Flex>
    </div>
  );
};
