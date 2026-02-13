import React from 'react';

import {DropdownMenu} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

export interface SettingsRadioGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: string;
    color?: string;
    needsTranslation?: boolean;
  }[];
  preventClose?: boolean;
}

export const SettingsRadioGroup = <T extends string>({value, onChange, options, preventClose = false}: SettingsRadioGroupProps<T>) => {
  const {t} = useTranslation();

  return (
    <DropdownMenu.RadioGroup value={value} onValueChange={(val: string) => onChange(val as T)}>
      {options.map((option) => (
        <DropdownMenu.RadioItem key={option.value} value={option.value} onSelect={preventClose ? (e) => e.preventDefault() : undefined}>
          {option.color && (
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                background: option.color,
                borderRadius: 3,
                marginRight: 6,
                verticalAlign: 'middle'
              }}
            />
          )}
          {option.needsTranslation === false ? option.label : t(option.label)}
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  );
};
