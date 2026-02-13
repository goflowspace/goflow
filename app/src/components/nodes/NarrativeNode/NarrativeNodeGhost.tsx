'use client';

import React, {CSSProperties, useCallback, useState} from 'react';

import {PlayIcon} from '@radix-ui/react-icons';
import {useViewport} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import ArrowHandle from '@components/nodes/ArrowHandle/ArrowHandle';

import {StaticText} from '../shared/EditableContent';
import AttachedEntities from './AttachedEntities';
import {OperationsList} from './OperationsList';
import {CARD_STYLES} from './constants';

import s from './NarrativeNode.module.scss';

interface NarrativeNodeGhostProps {
  position: {x: number; y: number};
}

const NarrativeNodeGhost = ({position}: NarrativeNodeGhostProps) => {
  const {zoom} = useViewport();
  const {t} = useTranslation();

  const style: CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    pointerEvents: 'none',
    zIndex: 9999,
    transform: `scale(${zoom})`,
    transformOrigin: 'top left'
  };

  // Состояние для drag & drop (не функциональное, только для визуала)
  const [isDragOver] = useState(false);

  // Пустые обработчики drag & drop для визуального соответствия
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Пустой обработчик удаления сущности
  const handleRemoveEntity = useCallback(() => {
    // Не функциональный
  }, []);

  return (
    <div className={cls(s.wrapper, s.ghost)} style={style} data-testid='narrative-node-wrapper'>
      <ArrowHandle direction='left' backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <ArrowHandle direction='right' backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <div
        className={cls(s.card_wrapper, {
          [s.drag_over]: isDragOver
        })}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={s.card}>
          <div className={s.header}>
            <div className={s.header_content}>
              <StaticText value='' placeholder={t('narrative_node.no_name')} onDoubleClick={() => {}} singleLine={true} isTitle={true} />
            </div>
            <button className={s.play_button} title={t('narrative_node.play_from_here', 'Play from here')}>
              <PlayIcon className={s.play_icon} />
            </button>
          </div>
          <div className={s.content}>
            <StaticText value='' placeholder={t('narrative_node.add_text_here')} onDoubleClick={() => {}} singleLine={false} />
          </div>
        </div>

        {/* Привязанные сущности - вне .card, чтобы избежать overflow: hidden */}
        <AttachedEntities
          entityIds={[]} // Пустой массив для Ghost версии
          onRemoveEntity={handleRemoveEntity}
          maxVisibleRows={1}
          entitiesPerRow={3}
          isDragOver={isDragOver}
        />

        {/* Список операций вынесен за пределы карточки */}
        <div className={s.operations_outer_container}>
          <OperationsList nodeId='ghost' onExpandToggle={() => {}} isExpanded={false} className={s.operations_outside_card} />
        </div>
      </div>
    </div>
  );
};

export default NarrativeNodeGhost;
