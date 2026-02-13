'use client';

import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {CheckCircledIcon, Cross2Icon, ExclamationTriangleIcon, InfoCircledIcon} from '@radix-ui/react-icons';
import {Badge, Button, Dialog, Flex, IconButton, ScrollArea, Text} from '@radix-ui/themes';
import {api} from '@services/api';
import {BibleQualityScore, BibleRecommendation, getBibleQualityColor, getBibleQualityText} from '@types-folder/bibleQuality';
import {useTranslation} from 'react-i18next';

import s from './BibleQualityModal.module.scss';

interface BibleQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BibleQualityModal: React.FC<BibleQualityModalProps> = ({isOpen, onClose}) => {
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();
  const [bibleQuality, setBibleQuality] = useState<BibleQualityScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadBibleQuality();
    }
  }, [isOpen, projectId]);

  const loadBibleQuality = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const quality = await api.getBibleQuality(projectId);
      setBibleQuality(quality);
    } catch (error) {
      console.error('Failed to load bible quality:', error);
      setError('Ошибка загрузки оценки качества');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const quality = await api.recalculateBibleQuality(projectId);
      setBibleQuality(quality);
    } catch (error) {
      console.error('Failed to recalculate bible quality:', error);
      setError('Ошибка пересчета оценки качества');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'important' | 'optional') => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon color='#ef4444' />;
      case 'important':
        return <InfoCircledIcon color='#f59e0b' />;
      case 'optional':
        return <CheckCircledIcon color='#6b7280' />;
    }
  };

  const getSeverityColor = (severity: 'critical' | 'important' | 'optional') => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'important':
        return 'yellow';
      case 'optional':
        return 'gray';
    }
  };

  const score = bibleQuality?.totalScore || 0;
  const statusText = getBibleQualityText(score);
  const color = getBibleQualityColor(score);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className={s.modal}>
        {/* Заголовок */}
        <Flex align='center' justify='between' className={s.header}>
          <Dialog.Title className={s.title}>Качество библии проекта</Dialog.Title>
          <IconButton variant='ghost' onClick={onClose}>
            <Cross2Icon />
          </IconButton>
        </Flex>

        {/* Загрузка */}
        {isLoading && (
          <Flex align='center' justify='center' className={s.loading}>
            <div className={s.spinner} />
            <Text ml='3'>Загрузка...</Text>
          </Flex>
        )}

        {/* Ошибка */}
        {error && (
          <Flex align='center' gap='2' className={s.error}>
            <ExclamationTriangleIcon />
            <Text>{error}</Text>
          </Flex>
        )}

        {/* Основной контент */}
        {!isLoading && !error && bibleQuality && (
          <>
            <div className={s.content}>
              {/* Общая оценка */}
              <div className={s.scoreSection}>
                <Flex align='center' gap='4'>
                  <div className={s.scoreCircle}>
                    <svg width='80' height='80' className={s.circleChart}>
                      {/* Фоновый круг */}
                      <circle cx='40' cy='40' r='32' fill='none' stroke='#e5e7eb' strokeWidth='6' />
                      {/* Прогресс-круг */}
                      <circle
                        cx='40'
                        cy='40'
                        r='32'
                        fill='none'
                        stroke={color}
                        strokeWidth='6'
                        strokeDasharray={`${2 * Math.PI * 32}`}
                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - score / 100)}`}
                        strokeLinecap='round'
                        transform='rotate(-90 40 40)'
                        className={s.circleAnimation}
                      />
                    </svg>
                    <Text size='5' weight='bold' style={{color}} className={s.scoreText}>
                      {score}%
                    </Text>
                  </div>

                  {/* Статус и компактные карточки категорий */}
                  <div className={s.categoriesContainer}>
                    <Text size='4' weight='bold' className={s.statusText}>
                      {statusText}
                    </Text>
                    <div className={s.compactCategories}>
                      <div className={s.compactCategoryItem}>
                        <Text size='1' color='gray'>
                          Заполненность
                        </Text>
                        <Text size='2' weight='bold'>
                          {bibleQuality.completenessScore}%
                        </Text>
                      </div>
                      <div className={s.compactCategoryItem}>
                        <Text size='1' color='gray'>
                          Качество
                        </Text>
                        <Text size='2' weight='bold'>
                          {bibleQuality.qualityScore}%
                        </Text>
                      </div>
                      <div className={s.compactCategoryItem}>
                        <Text size='1' color='gray'>
                          Согласованность
                        </Text>
                        <Text size='2' weight='bold'>
                          {bibleQuality.consistencyScore}%
                        </Text>
                      </div>
                    </div>
                  </div>
                </Flex>
              </div>

              {/* Информация о важности библии для ИИ */}
              <div className={s.aiInfoSection}>
                <Flex align='start' gap='3' style={{width: '100%'}}>
                  <InfoCircledIcon color='#3b82f6' style={{marginTop: '2px', flexShrink: 0}} />
                  <div style={{flex: 1}}>
                    <Text size='2' style={{lineHeight: '1.1'}}>
                      <strong>Библия используется как контекст для ИИ.</strong>
                      <br /> Качественно заполненная библия помогает ИИ генерировать более релевантные и согласованные предложения для вашего проекта.
                    </Text>
                  </div>
                </Flex>
              </div>

              {/* Рекомендации */}
              {bibleQuality.recommendations && bibleQuality.recommendations.length > 0 && (
                <div className={s.recommendationsSection}>
                  <Text size='3' weight='bold' mb='3'>
                    Рекомендации по улучшению ({bibleQuality.recommendations.length})
                  </Text>
                  <ScrollArea style={{maxHeight: '200px'}}>
                    <div className={s.recommendationsList}>
                      {bibleQuality.recommendations.map((recommendation) => (
                        <div key={recommendation.id} className={s.recommendationItem}>
                          <Flex align='start' gap='3'>
                            <div className={s.recommendationIcon}>{getSeverityIcon(recommendation.severity)}</div>
                            <div className={s.recommendationContent}>
                              <Flex align='center' gap='2' mb='1'>
                                <Text size='3' weight='bold'>
                                  {recommendation.title}
                                </Text>
                                <Badge color={getSeverityColor(recommendation.severity)} size='1'>
                                  {recommendation.severity === 'critical' ? 'Критично' : recommendation.severity === 'important' ? 'Важно' : 'Опционально'}
                                </Badge>
                              </Flex>
                              <Text size='2' color='gray' className={s.recommendationDescription}>
                                {recommendation.description}
                              </Text>
                            </div>
                          </Flex>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Нет рекомендаций */}
              {(!bibleQuality.recommendations || bibleQuality.recommendations.length === 0) && (
                <Flex align='center' justify='center' className={s.emptyState}>
                  <div className={s.emptyStateContent}>
                    <CheckCircledIcon width='32' height='32' color='#10b981' className={s.emptyStateIcon} />
                    <Text size='3' weight='bold' className={s.emptyStateTitle}>
                      Отлично!
                    </Text>
                    <Text size='2' color='gray'>
                      Нет рекомендаций по улучшению библии
                    </Text>
                  </div>
                </Flex>
              )}
            </div>

            {/* Кнопки действий */}
            <Flex gap='3' justify='end' className={s.actions}>
              <Button variant='soft' onClick={handleRecalculate} disabled={isLoading}>
                Пересчитать
              </Button>
              <Button onClick={onClose}>Закрыть</Button>
            </Flex>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};
