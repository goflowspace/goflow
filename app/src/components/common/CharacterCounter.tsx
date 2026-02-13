import React from 'react';

import {Text} from '@radix-ui/themes';

interface CharacterCounterProps {
  currentLength: number;
  maxLength: number;
  className?: string;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({currentLength, maxLength, className}) => {
  const isNearLimit = currentLength > maxLength * 0.8;
  const isOverLimit = currentLength > maxLength;

  const getColor = () => {
    if (isOverLimit) return 'red';
    if (isNearLimit) return 'orange';
    return 'gray';
  };

  return (
    <Text
      size='1'
      color={getColor()}
      className={className}
      style={{
        fontSize: '12px',
        fontFamily: 'monospace',
        alignSelf: 'flex-end',
        marginTop: '4px'
      }}
    >
      {currentLength} / {maxLength}
    </Text>
  );
};

export default CharacterCounter;
