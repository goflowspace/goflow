'use client';

import React from 'react';

import {type Project} from '@services/api';

import ProjectIcon from './ProjectIcon';

import s from './ProjectListItem.module.css';

interface ProjectListItemProps {
  project: Project;
  isSelected?: boolean;
  onClick: (projectId: string) => void;
  onContextMenu?: (project: Project, event: React.MouseEvent) => void;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({project, isSelected = false, onClick, onContextMenu}) => {
  const handleClick = () => {
    onClick(project.id);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (onContextMenu) {
      onContextMenu(project, event);
    }
  };

  return (
    <div className={`${s.projectItem} ${isSelected ? s.projectItemSelected : ''}`} onClick={handleClick} onContextMenu={handleContextMenu}>
      <ProjectIcon templateId={project.templateId} size='medium' className={s.projectIcon} />
      <div className={s.projectInfo}>
        <h3 className={s.projectName}>{project.name}</h3>
        <p className={s.projectDescription}>{project.projectInfo?.logline || ''}</p>
      </div>
    </div>
  );
};

export default ProjectListItem;
