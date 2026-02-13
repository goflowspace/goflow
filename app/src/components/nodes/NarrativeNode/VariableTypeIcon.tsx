import React from 'react';

import {CommitIcon, ShadowInnerIcon, SwitchIcon, TextIcon, VercelLogoIcon} from '@radix-ui/react-icons';
import {VariableType} from '@types-folder/variables';

interface VariableTypeIconProps {
  type: VariableType;
  className?: string;
}

export const VariableTypeIcon = ({type, className}: VariableTypeIconProps) => {
  switch (type) {
    case 'string':
      return <TextIcon className={className} />;
    case 'integer':
      return <ShadowInnerIcon className={className} />;
    case 'float':
      return <CommitIcon className={className} />;
    case 'percent':
      return <VercelLogoIcon className={className} />;
    case 'boolean':
      return <SwitchIcon className={className} />;
    default:
      return null;
  }
};

export default VariableTypeIcon;
