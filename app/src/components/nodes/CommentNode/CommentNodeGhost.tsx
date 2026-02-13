'use client';

import {CSSProperties, memo} from 'react';

import {ChatBubbleIcon} from '@radix-ui/react-icons';
import {useViewport} from '@xyflow/react';
import cls from 'classnames';

import s from './CommentNode.module.scss';

interface CommentNodeGhostProps {
  position: {x: number; y: number};
}

// Используем memo для предотвращения лишних ререндеров
const CommentNodeGhost = memo(({position}: CommentNodeGhostProps) => {
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

  // Используем структуру и стили, соответствующие CommentNode, но с призрачным видом
  return (
    <div style={containerStyle}>
      <div
        className={cls(s.commentNode)}
        style={{
          opacity: 0.6,
          cursor: 'default',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '2px dashed #cbd5e1'
        }}
      >
        <div className={s.commentIcon}>
          <ChatBubbleIcon
            style={{
              width: '16px',
              height: '16px',
              color: '#94a3b8'
            }}
          />
        </div>
      </div>
    </div>
  );
});

CommentNodeGhost.displayName = 'CommentNodeGhost';

export default CommentNodeGhost;
