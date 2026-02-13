'use client';

import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {api} from '@services/api';
import {BibleQualityScore, getBibleQualityColor, getBibleQualityText} from '@types-folder/bibleQuality';

import s from './BibleQualityWidget.module.scss';

interface BibleQualityWidgetProps {
  onClick?: () => void;
  size?: 'small' | 'medium';
}

export const BibleQualityWidget: React.FC<BibleQualityWidgetProps> = ({onClick, size = 'small'}) => {
  const {projectId} = useCurrentProject();
  const [bibleQuality, setBibleQuality] = useState<BibleQualityScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Размеры диаграммы в зависимости от size
  const circleSize = size === 'small' ? 40 : 60;
  const strokeWidth = size === 'small' ? 3 : 4;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

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

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Если нет projectId, не показываем виджет
  if (!projectId) {
    return null;
  }

  // Показываем загрузку
  if (isLoading) {
    return (
      <div className={`${s.widget} ${s[size]}`}>
        <div className={s.loading}>
          <div className={s.spinner} />
        </div>
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className={`${s.widget} ${s[size]} ${s.error}`} onClick={handleClick}>
        <span className={s.errorText}>!</span>
      </div>
    );
  }

  const score = bibleQuality?.totalScore || 0;
  const color = getBibleQualityColor(score);
  const statusText = getBibleQualityText(score);

  // Вычисляем длину дуги для прогресса
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`${s.widget} ${s[size]} ${onClick ? s.clickable : ''}`} onClick={handleClick} title={`Качество библии: ${score}% (${statusText})`}>
      <svg width={circleSize} height={circleSize} className={s.circle}>
        {/* Фоновый круг */}
        <circle cx={circleSize / 2} cy={circleSize / 2} r={radius} fill='none' stroke='#374151' strokeWidth={strokeWidth} className={s.backgroundCircle} />

        {/* Прогресс-круг */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap='round'
          className={s.progressCircle}
          transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
        />
      </svg>

      {/* Текст с процентом */}
      <div className={s.score} style={{color}}>
        {score}%
      </div>
    </div>
  );
};
