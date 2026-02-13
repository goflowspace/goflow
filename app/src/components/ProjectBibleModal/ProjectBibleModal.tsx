'use client';

import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {Cross2Icon} from '@radix-ui/react-icons';
import {Dialog, IconButton, ScrollArea, Text} from '@radix-ui/themes';
import {api} from '@services/api';
import {ProjectInfo as ProjectInfoType} from '@types-folder/projectInfo';
import {useTranslation} from 'react-i18next';

import {useProjectStore} from '@store/useProjectStore';

import ProjectInfoForm from '../Dashboard/ProjectInfo/ProjectInfoForm';

import s from './ProjectBibleModal.module.scss';

interface ProjectBibleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectBibleModal: React.FC<ProjectBibleModalProps> = ({isOpen, onClose}) => {
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();
  const {projectName, setProjectName} = useProjectStore();

  const [projectInfo, setProjectInfo] = useState<ProjectInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка информации о проекте при открытии модального окна
  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectInfo();
    }
  }, [isOpen, projectId]);

  const loadProjectInfo = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getProjectInfo(projectId);
      setProjectInfo(data);
    } catch (error) {
      console.error('Failed to load project info:', error);
      setError(t('project_bible.error_load', 'Не удалось загрузить информацию о проекте'));
      setProjectInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Создание заглушки ProjectInfo для формы
  const createFormProjectInfo = (): ProjectInfoType => {
    if (projectInfo) return projectInfo;

    const now = new Date();
    return {
      id: '',
      projectId: projectId || '',
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
      visualStyle: '',
      createdAt: now,
      updatedAt: now
    };
  };

  // Адаптер для преобразования ProjectInfo в CreateProjectInfoDto
  const convertToDto = (info: ProjectInfoType) => {
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
    if (!projectId) return;

    try {
      setError(null);

      let savedInfo: ProjectInfoType;
      const dto = convertToDto(updatedProjectInfo);

      if (projectInfo) {
        savedInfo = await api.updateProjectInfo(projectId, dto);
      } else {
        savedInfo = await api.createProjectInfo(projectId, dto);
      }

      setProjectInfo(savedInfo);
      console.log('Project info saved from editor:', savedInfo);
    } catch (error) {
      console.error('Failed to save project info:', error);
      setError(t('project_bible.error_save', 'Не удалось сохранить информацию о проекте'));
    }
  };

  const handleSaveProjectName = async (newProjectName: string) => {
    if (!projectId) return;

    try {
      setError(null);
      await api.updateProject(projectId, newProjectName);
      setProjectName(newProjectName);
      console.log('Project name updated from editor:', newProjectName);
    } catch (error) {
      console.error('Failed to update project name:', error);
      setError(t('project_bible.error_save_name', 'Не удалось обновить имя проекта'));
      throw error;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={s.loadingContainer}>
          <Text size='2' color='gray'>
            {t('project_bible.loading', 'Загрузка информации о проекте...')}
          </Text>
        </div>
      );
    }

    if (error) {
      return (
        <div className={s.errorContainer}>
          <Text size='2' color='red'>
            {error}
          </Text>
        </div>
      );
    }

    if (!projectId) {
      return (
        <div className={s.errorContainer}>
          <Text size='2' color='red'>
            {t('project_bible.no_project', 'Проект не выбран')}
          </Text>
        </div>
      );
    }

    return (
      <div className={s.formWrapper}>
        <div style={{background: 'transparent'}}>
          <ProjectInfoForm projectId={projectId} projectName={projectName} projectInfo={createFormProjectInfo()} onSave={handleSave} onSaveProjectName={handleSaveProjectName} hideHeader={true} />
        </div>
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className={s.modal}>
        <div className={s.header}>
          <Dialog.Title>
            <Text size='5' weight='bold'>
              {t('project_bible.title', 'Библия проекта')}
            </Text>
          </Dialog.Title>
          <IconButton variant='ghost' size='2' onClick={onClose} className={s.closeButton}>
            <Cross2Icon />
          </IconButton>
        </div>

        <ScrollArea className={s.content}>{renderContent()}</ScrollArea>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ProjectBibleModal;
