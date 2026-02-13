import React from 'react';

import {TextArea, TextField} from '@radix-ui/themes';
import cls from 'classnames';

import {getTextLinesCount} from './utils';

import s from './NarrativeNode.module.scss';

interface EditableContentProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  placeholder: string;
  selected?: boolean;
}

interface StaticContentProps {
  value: string;
  placeholder: string;
  onDoubleClick: (e: React.MouseEvent) => void;
}

interface EditableTitleProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  placeholder: string;
  selected?: boolean;
}

interface StaticTitleProps {
  value: string;
  placeholder: string;
  onDoubleClick: (e: React.MouseEvent) => void;
}

/**
 * Компонент для редактируемого контента
 */
export const EditableContent = React.forwardRef<HTMLTextAreaElement, EditableContentProps>(({value, onChange, onKeyDown, onBlur, placeholder, selected}, ref) => {
  return (
    <div className={s.text_container}>
      <TextArea
        ref={ref}
        placeholder={placeholder}
        className={cls({nowheel: selected}, {nodrag: selected})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size='1'
        rows={5}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    </div>
  );
});

/**
 * Компонент для статичного отображения контента
 */
export const StaticContent = React.forwardRef<HTMLDivElement, StaticContentProps>(({value, placeholder, onDoubleClick}, ref) => {
  return (
    <div
      ref={ref}
      className={s.desc_input_static}
      onDoubleClick={onDoubleClick}
      style={{
        maxHeight: 'calc(10 * 1.5em + 10px)', // 10 rows maximum
        overflowY: getTextLinesCount(value) > 10 ? 'auto' : 'hidden'
      }}
    >
      {value || placeholder}
    </div>
  );
});

/**
 * Компонент для редактируемого заголовка
 */
export const EditableTitle = React.forwardRef<HTMLInputElement, EditableTitleProps>(({value, onChange, onKeyDown, onBlur, placeholder, selected}, ref) => {
  return (
    <div className={s.title_container}>
      <TextField.Root
        ref={ref}
        placeholder={placeholder}
        className={cls('nowheel', {nodrag: selected})}
        value={value}
        onChange={onChange}
        variant='surface'
        size='1'
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    </div>
  );
});

/**
 * Компонент для статичного заголовка
 */
export const StaticTitle = React.forwardRef<HTMLDivElement, StaticTitleProps>(({value, placeholder, onDoubleClick}, ref) => {
  return (
    <div ref={ref} className={s.name_input_static} onDoubleClick={onDoubleClick} style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5', fontWeight: 800}}>
      {value || placeholder}
    </div>
  );
});
