'use client';

import {CSSProperties, useMemo} from 'react';

import {Handle, HandleProps, Position} from '@xyflow/react';

interface ArrowHandleProps extends Partial<HandleProps> {
  id?: string;
  direction: 'left' | 'right';
  directionMoveNumber?: number;
  style?: CSSProperties;
  offsetY?: number;
  backgroundColor?: string;
}

const ArrowHandle = ({id, direction, style, directionMoveNumber, offsetY = 0, isConnectable = true, backgroundColor = '#F0F0F0', ...props}: ArrowHandleProps) => {
  const position = direction === 'left' ? Position.Left : Position.Right;

  const svgStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none'
  };

  const strokeColor = useMemo(() => {
    if (!backgroundColor || backgroundColor === 'transparent') {
      return '#D9D9D9';
    }

    try {
      if (backgroundColor.startsWith('#')) {
        const r = parseInt(backgroundColor.slice(1, 3), 16);
        const g = parseInt(backgroundColor.slice(3, 5), 16);
        const b = parseInt(backgroundColor.slice(5, 7), 16);

        const darkerR = Math.max(0, r - 70);
        const darkerG = Math.max(0, g - 70);
        const darkerB = Math.max(0, b - 70);

        return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
      }

      if (backgroundColor.startsWith('rgb')) {
        const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1], 10);
          const g = parseInt(rgbMatch[2], 10);
          const b = parseInt(rgbMatch[3], 10);

          const darkerR = Math.max(0, r - 70);
          const darkerG = Math.max(0, g - 70);
          const darkerB = Math.max(0, b - 70);

          return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
        }
      }

      return '#D9D9D9';
    } catch (e) {
      return '#D9D9D9';
    }
  }, [backgroundColor]);

  return (
    <Handle
      id={id}
      isConnectable={isConnectable}
      type={props.type ?? (direction === 'left' ? 'target' : 'source')}
      position={position}
      style={{
        width: 20,
        height: 20,
        background: 'transparent',
        border: 'none',
        position: 'absolute',
        top: `calc(50% + ${offsetY}px)`,
        [direction]: directionMoveNumber || -25,
        transform: 'translateY(-50%)',
        padding: 0,
        ...style
      }}
      {...props}
    >
      <svg xmlns='http://www.w3.org/2000/svg' width='19' height='21' viewBox='0 0 19 21' fill='none' style={svgStyle}>
        <path
          d='M3 0.5H3.6264C4.10186 0.5 4.56746 0.635583 4.96859 0.890846L16.7543 8.39085C18.298 9.37323 18.298 11.6268 16.7543 12.6092L4.96859 20.1092C4.56746 20.3644 4.10186 20.5 3.6264 20.5H3C1.61929 20.5 0.5 19.3807 0.5 18V3C0.5 1.61929 1.61929 0.5 3 0.5Z'
          fill={backgroundColor}
          stroke={strokeColor}
        />
      </svg>
    </Handle>
  );
};

export default ArrowHandle;
