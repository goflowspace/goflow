import React, {useEffect, useRef, useState} from 'react';

import {InfoCircledIcon} from '@radix-ui/react-icons';
import {Flex} from '@radix-ui/themes';

import './AIFieldIndicator.css';

interface AIFieldIndicatorProps {
  fieldType: string;
  fieldName: string;
  explanation: string;
  isAIGenerated: boolean;
}

const AIFieldIndicator: React.FC<AIFieldIndicatorProps> = ({fieldType, fieldName, explanation, isAIGenerated}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие popup при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isAIGenerated || !explanation) {
    return null;
  }

  return (
    <div ref={containerRef} className='ai-field-indicator'>
      <Flex align='center' gap='1' className='ai-field-indicator__trigger' onClick={() => setIsOpen(!isOpen)}>
        <InfoCircledIcon width='12' height='12' />
        <span>Learn more</span>
      </Flex>

      {isOpen && (
        <div className='ai-field-indicator__popup'>
          <div className='ai-field-indicator__content'>
            <div className='ai-field-indicator__header'>🤖 AI: {fieldName}</div>
            <div className='ai-field-indicator__description'>{explanation}</div>
          </div>

          {/* Стрелочка */}
          <div className='ai-field-indicator__arrow' />
        </div>
      )}
    </div>
  );
};

export default AIFieldIndicator;
