'use client';

import React, {useEffect, useState} from 'react';

import {api} from '@services/api';
import {CreateProjectInfoDto, ProjectInfo as ProjectInfoType, createEmptyProjectInfo} from '@types-folder/projectInfo';

import ProjectInfoForm from './ProjectInfoForm';

interface ProjectInfoProps {
  projectId: string;
  projectName: string;
  onProjectNameChange?: (newName: string) => void;
  onProjectInfoSave?: () => void;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({projectId, projectName, onProjectNameChange, onProjectInfoSave}) => {
  const [projectInfo, setProjectInfo] = useState<ProjectInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка информации о проекте с сервера
  useEffect(() => {
    const loadProjectInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getProjectInfo(projectId);
        setProjectInfo(data);
      } catch (error) {
        console.error('Failed to load project info:', error);
        setError('Не удалось загрузить информацию о проекте');
        setProjectInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectInfo();
  }, [projectId]);

  // Создание заглушки ProjectInfo для формы
  const createFormProjectInfo = (): ProjectInfoType => {
    if (projectInfo) return projectInfo;

    // Создаем заглушку если данных нет
    const now = new Date();
    return {
      id: '',
      projectId: projectId,
      logline: '',
      synopsis: '',
      genres: [],
      formats: [],
      status: 'concept',
      setting: '',
      targetAudience: '',
      mainThemes: '',
      message: '',
      references: '',
      uniqueFeatures: '',
      atmosphere: '',
      constraints: '',
      visualStyle: null,
      createdAt: now,
      updatedAt: now
    };
  };

  // Адаптер для преобразования ProjectInfo в CreateProjectInfoDto
  const convertToDto = (info: ProjectInfoType): CreateProjectInfoDto => {
    return {
      logline: info.logline !== undefined && info.logline !== null ? info.logline : undefined,
      synopsis: info.synopsis !== undefined && info.synopsis !== null ? info.synopsis : undefined,
      genres: info.genres as any[],
      formats: info.formats as any[],
      status: info.status as any,
      setting: info.setting !== undefined && info.setting !== null ? info.setting : undefined,
      targetAudience: info.targetAudience !== undefined && info.targetAudience !== null ? info.targetAudience : undefined,
      mainThemes: info.mainThemes !== undefined && info.mainThemes !== null ? info.mainThemes : undefined,
      message: info.message !== undefined && info.message !== null ? info.message : undefined,
      references: info.references !== undefined && info.references !== null ? info.references : undefined,
      uniqueFeatures: info.uniqueFeatures !== undefined && info.uniqueFeatures !== null ? info.uniqueFeatures : undefined,
      atmosphere: info.atmosphere !== undefined && info.atmosphere !== null ? info.atmosphere : undefined,
      constraints: info.constraints !== undefined && info.constraints !== null ? info.constraints : undefined
    };
  };

  const handleSave = async (updatedProjectInfo: ProjectInfoType) => {
    try {
      setError(null);

      let savedInfo: ProjectInfoType;
      const dto = convertToDto(updatedProjectInfo);

      if (projectInfo) {
        // Обновляем существующую информацию
        savedInfo = await api.updateProjectInfo(projectId, dto);
      } else {
        // Создаем новую информацию
        savedInfo = await api.createProjectInfo(projectId, dto);
      }

      setProjectInfo(savedInfo);
      console.log('Project info saved:', savedInfo);

      // Уведомляем родительский компонент о сохранении
      if (onProjectInfoSave) {
        onProjectInfoSave();
      }
    } catch (error) {
      console.error('Failed to save project info:', error);
      setError('Не удалось сохранить информацию о проекте');
    }
  };

  const handleSaveProjectName = async (newProjectName: string) => {
    try {
      setError(null);
      await api.updateProject(projectId, newProjectName);
      console.log('Project name updated:', newProjectName);

      // Уведомляем родительский компонент об изменении
      if (onProjectNameChange) {
        onProjectNameChange(newProjectName);
      }
    } catch (error) {
      console.error('Failed to update project name:', error);
      setError('Не удалось обновить имя проекта');
      throw error; // Перебрасываем ошибку для обработки в форме
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--dashboard-text-tertiary)'
        }}
      >
        Загрузка информации о проекте...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--dashboard-text-error)'
        }}
      >
        {error}
      </div>
    );
  }

  return <ProjectInfoForm projectId={projectId} projectName={projectName} projectInfo={createFormProjectInfo()} onSave={handleSave} onSaveProjectName={handleSaveProjectName} />;
};

export default ProjectInfo;
