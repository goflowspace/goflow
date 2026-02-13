import React from 'react';

import cls from 'classnames';

import s from './AISkeleton.module.scss';

interface AISkeletonProps {
  variant: 'narrative-title' | 'narrative-text' | 'choice' | 'entities';
  className?: string;
  active?: boolean; // Для более интенсивной анимации во время активной работы ИИ
}

export const AISkeleton: React.FC<AISkeletonProps> = ({variant, className, active = false}) => {
  const isNarrative = variant === 'narrative-title' || variant === 'narrative-text';
  const isChoice = variant === 'choice';
  const isEntities = variant === 'entities';

  return (
    <div className={cls(s.skeleton, active && s.active, isNarrative && s.narrative, isChoice && s.choice, isEntities && s.entities, className)}>
      {variant === 'narrative-title' && (
        <>
          {/* Скелетон для заголовка (одна строка) */}
          <div className={s.titleSkeleton}>
            <div className={s.shimmer} />
          </div>
        </>
      )}

      {variant === 'narrative-text' && (
        <>
          {/* Скелетон для текста (несколько строк) */}
          <div className={s.textSkeleton}>
            <div className={cls(s.line, s.line1)}>
              <div className={s.shimmer} />
            </div>
            <div className={cls(s.line, s.line2)}>
              <div className={s.shimmer} />
            </div>
            <div className={cls(s.line, s.line3)}>
              <div className={s.shimmer} />
            </div>
          </div>
        </>
      )}

      {variant === 'choice' && (
        <>
          {/* Скелетон для текста выбора */}
          <div className={s.choiceSkeleton}>
            <div className={cls(s.line, s.choiceLine)}>
              <div className={s.shimmer} />
            </div>
          </div>
        </>
      )}

      {variant === 'entities' && (
        <>
          {/* Скелетон для области сущностей */}
          <div className={s.entitiesSkeleton}>
            <div className={s.entitySquare}>
              <div className={s.shimmer} />
            </div>
            <div className={s.entitySquare}>
              <div className={s.shimmer} />
            </div>
            <div className={s.entitySquare}>
              <div className={s.shimmer} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
