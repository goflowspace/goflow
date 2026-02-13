import React from 'react';

import cls from 'classnames';

import s from './AIProgressIndicator.module.scss';

interface AIProgressIndicatorProps {
  stepName?: string;
  stepNumber?: number;
  totalSteps?: number;
  progress?: number;
  className?: string;
}

/**
 * Компонент для отображения прогресса AI генерации
 */
export const AIProgressIndicator: React.FC<AIProgressIndicatorProps> = ({stepName, stepNumber, totalSteps, progress, className}) => {
  const displayStepName = stepName || 'Генерация...';
  const displayStepInfo = stepNumber && totalSteps ? `(${stepNumber}/${totalSteps})` : '';

  return (
    <div className={cls(s.progressIndicator, className)}>
      <div className={s.stepInfo}>
        <span className={s.stepName}>{displayStepName}</span>
        {displayStepInfo && <span className={s.stepCounter}>{displayStepInfo}</span>}
      </div>
      {progress !== undefined && (
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{width: `${Math.max(0, Math.min(100, progress))}%`}} />
        </div>
      )}
    </div>
  );
};
