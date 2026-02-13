'use client';

import React, {memo} from 'react';

import {NodeProps} from '@xyflow/react';
import cls from 'classnames';

import ArrowHandle from '@components/nodes/ArrowHandle/ArrowHandle';
import {AISkeleton} from '@components/nodes/shared/AISkeleton';

import {CARD_STYLES} from '../NarrativeNode/constants';

import s from './SkeletonNode.module.scss';

interface SkeletonNodeData extends Record<string, unknown> {
  // Пустая дата для скелетон узла
  placeholder?: string;
}

export interface SkeletonNodeProps extends NodeProps {
  data: SkeletonNodeData;
  style?: React.CSSProperties;
}

const SkeletonNode = memo(({selected, style, data, id}: SkeletonNodeProps) => {
  return (
    <div className={s.wrapper} style={style} data-testid='skeleton-node-wrapper'>
      <ArrowHandle direction='left' backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <ArrowHandle direction='right' backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <div className={cls(s.card_wrapper, s.skeleton_node, {[s.faded]: data?.shouldBeFaded})} data-id={id}>
        <div className={s.card}>
          <div className={s.header}>
            <div className={s.header_content}>
              <AISkeleton variant='narrative-title' active={true} />
            </div>
          </div>
          <div className={s.content}>
            <AISkeleton variant='narrative-text' active={true} />
          </div>
        </div>

        {/* Привязанные сущности - вне .card */}
        <div className={s.skeleton_entities}>
          <AISkeleton variant='entities' active={true} />
        </div>
      </div>
    </div>
  );
});

export default SkeletonNode;
