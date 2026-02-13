'use client';

import React from 'react';

import {useReactFlow} from '@xyflow/react';

import {LayerPresence} from '../../types/websocket.types';

import './PresenceCursors.scss';

interface PresenceCursorsProps {
  cursors: LayerPresence[];
}

/**
 * Компонент для отображения курсоров других пользователей
 */
const PresenceCursors: React.FC<PresenceCursorsProps> = ({cursors}) => {
  const {getViewport} = useReactFlow();

  if (!cursors.length) {
    return null;
  }

  // Получаем текущий viewport один раз для всех курсоров
  const viewport = getViewport();

  return (
    <div className='presence-cursors-container'>
      {cursors.map((presence) => {
        const xPos = presence.cursor.x * viewport.zoom + viewport.x;
        const yPos = presence.cursor.y * viewport.zoom + viewport.y;

        return (
          <div
            key={presence.userId}
            className='presence-cursor'
            style={
              {
                transform: `translate(${xPos}px, ${yPos}px)`,
                '--cursor-color': presence.userColor
              } as React.CSSProperties
            }
          >
            {/* SVG курсор */}
            <svg width='18' height='22' viewBox='0 0 18 22' fill='none' className='cursor-icon'>
              <path d='M0.5 0.5V21.5L5.5 16.5L9.5 21.5L12.5 19.5L8.5 14.5L17.5 14.5L0.5 0.5Z' fill='currentColor' stroke='white' strokeWidth='1' />
            </svg>

            {/* Имя пользователя */}
            <div className='cursor-label'>{presence.userName}</div>
          </div>
        );
      })}
    </div>
  );
};

export default PresenceCursors;
