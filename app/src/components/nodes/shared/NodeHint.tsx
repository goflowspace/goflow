import React from 'react';

interface NodeHintProps {
  isVisible: boolean;
  text: string;
  position?: {
    top?: string;
    left?: string;
    transform?: string;
  };
  'data-testid'?: string;
}

/**
 * Общий компонент для отображения подсказок над узлами
 * Может быть использован для нарративного узла, узла выбора и т.д.
 */
export const NodeHint: React.FC<NodeHintProps> = ({isVisible, text, position, 'data-testid': dataTestId}) => {
  if (!isVisible) return null;

  return (
    <div
      data-testid={dataTestId || 'node-hint'}
      style={{
        position: 'absolute',
        top: position?.top || '-20px',
        left: position?.left || '50%',
        transform: position?.transform || 'translateX(-50%)',
        fontSize: '10px',
        color: '#666',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: '2px 5px',
        borderRadius: '3px',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 5
      }}
    >
      {text}
    </div>
  );
};
