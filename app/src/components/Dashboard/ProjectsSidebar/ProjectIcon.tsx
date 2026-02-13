import React from 'react';

import {getProjectIcon} from 'src/utils/templateIcons';

import s from './ProjectIcon.module.css';

interface ProjectIconProps {
  templateId?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const ProjectIcon: React.FC<ProjectIconProps> = ({templateId, size = 'medium', className = ''}) => {
  const icon = getProjectIcon(templateId);

  return (
    <div
      className={`${s.projectIcon} ${s[size]} ${className}`}
      style={{
        color: icon.color,
        backgroundColor: icon.bgColor
      }}
    >
      <span className={s.emoji}>{icon.emoji}</span>
    </div>
  );
};

export default ProjectIcon;
