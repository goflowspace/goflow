import React, {CSSProperties, forwardRef, useEffect, useRef, useState} from 'react';

import {Handle, Position} from '@xyflow/react';
import cls from 'classnames';

import {useEditorSettingsStore} from '@store/useEditorSettingsStore';

import {getColorScheme} from '../../../utils/colorSchemes';

import s from './NodeWrapper.module.scss';

interface NodeWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  showMinimal?: boolean;
  data?: {
    isInteractiveNode?: boolean;
  };
}

export const NodeWrapper = forwardRef<HTMLDivElement, NodeWrapperProps>(({children, className, style, showMinimal, data}, ref) => {
  const {isInteractiveNode = true} = data || {};
  const [isHovered, setIsHovered] = useState(false);

  // Получаем цвет холста для выбора правильного оттенка тени
  const canvasColor = useEditorSettingsStore((state) => state.canvasColor);

  // Получаем цветовую схему на основе выбранного цвета холста
  const colorScheme = getColorScheme(canvasColor);

  // Объединяем входные стили с тенью из цветовой схемы
  const combinedStyle = {
    ...style,
    boxShadow: isHovered ? `0 4px 12px ${colorScheme.nodeShadow}` : `0 2px 8px ${colorScheme.nodeShadow}`
  };

  return (
    <div
      className={cls(s.wrapper, className, isInteractiveNode && s.interactive, showMinimal && s.minimal)}
      style={combinedStyle}
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Handle для входящих связей */}
      <Handle id='target' type='target' position={Position.Top} className={s.handle} isConnectableStart={false} isConnectableEnd={true} />

      {/* Handle для исходящих связей */}
      <Handle id='source' type='source' position={Position.Bottom} className={s.handle} isConnectableStart={true} isConnectableEnd={false} />

      {children}
    </div>
  );
});
