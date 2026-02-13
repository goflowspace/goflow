'use client';

import {CSSProperties} from 'react';

import {useViewport} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import ArrowHandle from '@components/nodes/ArrowHandle/ArrowHandle';

import {CARD_STYLES} from './constants';

import s from './ChoiceNode.module.scss';

interface ChoiceNodeGhostProps {
  position: {x: number; y: number};
}

const ChoiceNodeGhost = ({position}: ChoiceNodeGhostProps) => {
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

  return (
    <div className={cls(s.wrapper, s.ghost)} style={style}>
      <ArrowHandle direction='left' directionMoveNumber={-29} backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <ArrowHandle direction='right' directionMoveNumber={-29} backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <div className={cls(s.card, s.card_ghost)}>
        <div className={s.content}>
          <div className={s.text}>{t('choice_object.text_placeholder', 'Add choice here')}</div>
        </div>
      </div>
    </div>
  );
};

export default ChoiceNodeGhost;
