import React from 'react';

import {RadioGroup} from '@radix-ui/themes';

interface LanguageOption {
  value: string;
  label: string;
  needsTranslation?: boolean;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: LanguageOption[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({value, onChange, options}) => {
  return (
    <RadioGroup.Root value={value} onValueChange={onChange} size='2'>
      {options.map((option) => (
        <RadioGroup.Item key={option.value} value={option.value}>
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
};
