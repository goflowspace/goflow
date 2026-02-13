import React from 'react';

import {TextArea, TextField} from '@radix-ui/themes';
import cls from 'classnames';

import s from './EditableContent.module.scss';

/**
 * Props для редактируемого текстового поля
 */
export interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  placeholder: string;
  rows?: number;
  variant?: 'textarea' | 'input';
  className?: string;
  selected?: boolean;
  'data-testid'?: string;
}

/**
 * Props для статического текстового поля
 */
export interface StaticTextProps {
  value: string;
  placeholder: string;
  onDoubleClick: (e: React.MouseEvent) => void;
  className?: string;
  singleLine?: boolean;
  isTitle?: boolean;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

/**
 * Компонент для редактируемого содержимого
 * Может отображать текстовое поле (textarea) или поле ввода (input)
 */
export const EditableText = React.forwardRef<HTMLTextAreaElement | HTMLInputElement, EditableTextProps>(
  ({value, onChange, onKeyDown, onBlur, placeholder, rows = 5, variant = 'textarea', className, selected, 'data-testid': dataTestId}, ref) => {
    if (variant === 'textarea') {
      return (
        <div className={cls(s.text_container, className)} data-testid={dataTestId}>
          <TextArea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            size='1'
            rows={rows}
            placeholder={placeholder}
            className={cls('nodrag', 'nowheel', 'nopan', {selected})}
            style={{
              pointerEvents: 'all',
              userSelect: 'text',
              cursor: 'text'
            }}
          />
        </div>
      );
    }

    return (
      <div className={cls(s.title_container, className)} data-testid={dataTestId}>
        <TextField.Root
          ref={ref as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value as string)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          variant='surface'
          size='1'
          className={cls('nodrag', 'nowheel', 'nopan', {selected})}
        />
      </div>
    );
  }
);

/**
 * Компонент для статического отображения текста
 */
export const StaticText = React.forwardRef<HTMLDivElement, StaticTextProps>(
  ({value, placeholder, onDoubleClick, className, singleLine = false, isTitle = false, style = {}, 'data-testid': dataTestId}, ref) => {
    const textClass = singleLine ? s.name_input_static : s.desc_input_static;
    const isShowingPlaceholder = !value;

    const baseStyle: React.CSSProperties = {
      cursor: 'pointer',
      whiteSpace: singleLine ? 'nowrap' : 'pre-wrap',
      overflow: 'hidden',
      textOverflow: singleLine ? 'ellipsis' : 'clip',
      fontStyle: isShowingPlaceholder ? 'italic' : 'normal',
      color: isShowingPlaceholder ? 'var(--gray-12)' : undefined,
      ...style
    };

    return (
      <div ref={ref} className={cls(textClass, className)} onDoubleClick={onDoubleClick} style={baseStyle} data-testid={dataTestId}>
        {value || placeholder}
      </div>
    );
  }
);
