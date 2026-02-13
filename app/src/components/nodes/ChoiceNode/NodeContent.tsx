import React from 'react';

import {TextArea} from '@radix-ui/themes';
import cls from 'classnames';

import s from './ChoiceNode.module.scss';

interface EditableContentProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  placeholder: string;
  rows: number;
  selected?: boolean;
}

interface StaticContentProps {
  value: string;
  placeholder: string;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Компонент для редактируемого содержимого узла выбора
 */
export const EditableContent = React.forwardRef<HTMLTextAreaElement, EditableContentProps>(({value, onChange, onKeyDown, onBlur, placeholder, rows, selected}, ref) => {
  return (
    <div className={s.text_container}>
      <TextArea
        ref={ref}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        size='1'
        rows={rows}
        placeholder={placeholder}
        className={cls('nodrag', 'nowheel', 'nopan', {[s.selected]: selected})}
        onKeyDown={onKeyDown}
        style={{
          pointerEvents: 'all',
          userSelect: 'text',
          cursor: 'text'
        }}
      />
    </div>
  );
});

/**
 * Компонент для статического отображения содержимого узла выбора
 */
export const StaticContent = React.forwardRef<HTMLDivElement, StaticContentProps>(({value, placeholder, onClick}, ref) => {
  return (
    <div
      ref={ref}
      className={s.text}
      onClick={onClick}
      style={{
        cursor: 'pointer'
      }}
    >
      {value || placeholder}
    </div>
  );
});
