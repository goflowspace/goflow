'use client';

import {CSSProperties, memo} from 'react';

import {useViewport} from '@xyflow/react';
import cls from 'classnames';

import s from './NoteNode.module.scss';

interface NoteNodeGhostProps {
  position: {x: number; y: number};
}

// Используем memo для предотвращения лишних ререндеров
const NoteNodeGhost = memo(({position}: NoteNodeGhostProps) => {
  const {zoom} = useViewport();

  // Основные стили для контейнера призрака
  const containerStyle: CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    pointerEvents: 'none',
    zIndex: 9999,
    transform: `scale(${zoom})`,
    transformOrigin: 'top left'
  };

  // Используем более точную структуру и стили, соответствующие NoteNode
  return (
    <div style={containerStyle}>
      <div
        className={s.note_wrapper}
        style={{
          boxShadow: 'none',
          opacity: 0.7,
          cursor: 'default'
        }}
      >
        <div className={s.note_text}>Add note text here...</div>
      </div>
    </div>
  );
});

NoteNodeGhost.displayName = 'NoteNodeGhost';

export default NoteNodeGhost;
