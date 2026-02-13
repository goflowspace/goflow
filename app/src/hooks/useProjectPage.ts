import {useEffect, useState} from 'react';

import {useParams, useRouter} from 'next/navigation';

import {useTeamSwitch} from '@hooks/useTeamSwitch';
import {useUserInitialization} from '@hooks/useUserInitialization';
import {trackManagerCreateProject, trackManagerDeleteProject, trackManagerDuplicateProject, trackProjectNameEditing} from '@services/analytics';
import {type Project, api} from '@services/api';
import {deleteProject} from '@services/dbService';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import {isOSS} from '../utils/edition';

export const useProjectPage = () => {
  const router = useRouter();
  const params = useParams();
  const {t} = useTranslation();
  const {user} = useUserStore();
  const {currentTeam, isLoading: isTeamLoading, isInitialized, userTeams} = useTeamStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [teamCreatedFlag, setTeamCreatedFlag] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Инициализируем пользователя
  useUserInitialization();

  // Обрабатываем переключение команд с автоматическим редиректом из проектов
  useTeamSwitch({
    redirectFromProject: true,
    onTeamSwitch: async () => {
      // Перезагружаем проекты после смены команды
      loadProjects();
    }
  });

  // Загружаем проекты при инициализации
  useEffect(() => {
    if (user && isInitialized && !isLoadingProjects) {
      loadProjects();
    }
  }, [user, isInitialized]);

  // Устанавливаем selectedProject на основе projectId из URL
  useEffect(() => {
    if (projects.length > 0 && params.project_id) {
      const projectId = params.project_id as string;
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects, params.project_id]);

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);
      setError(null);
      const loadedProjects = await api.getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError(t('dashboard.projects.load_error', 'Ошибка загрузки проектов'));
    } finally {
      setIsLoadingProjects(false);
      setIsLoading(false);
    }
  };

  const handleCreateProject = () => {
    if (isCreatingProject) return; // Предотвращаем множественные клики
    setIsCreateModalOpen(true);
  };

  const handleCreateProjectWithName = async (projectName: string, templateId?: string) => {
    try {
      setIsCreatingProject(true);
      setError(null);

      const newProject = await api.createProject({
        name: projectName,
        templateId
      });

      // Отправляем событие аналитики о создании проекта
      trackManagerCreateProject(newProject.id);

      // Если есть текущая команда, добавляем проект в неё (только в cloud mode)
      if (currentTeam && !isOSS()) {
        try {
          await api.addProjectToTeam(currentTeam.id, {
            projectId: newProject.id,
            accessLevel: 'OPEN' // Или другой уровень доступа по умолчанию
          });
          // Перезагружаем список проектов команды для актуальности данных
          loadProjects();
        } catch (teamError) {
          console.error('Failed to add project to team:', teamError);
          // Не блокируем создание проекта, если не удалось добавить в команду
          setProjects((prevProjects) => [newProject, ...prevProjects]);
        }
      } else {
        // OSS mode or no team — просто добавляем в список
        setProjects((prevProjects) => [newProject, ...prevProjects]);
      }

      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      setError(t('dashboard.projects.error_create'));
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    router.push(`/${projectId}`);
  };

  const handleRenameProject = (project: Project) => {
    setSelectedProject(project);
    setIsRenameModalOpen(true);
  };

  const handleRename = async (projectId: string, newName: string, timelineId: string) => {
    try {
      setError(null);

      // Отправляем событие аналитики о переименовании проекта
      trackProjectNameEditing(newName.length, 'manager', projectId, timelineId);

      const updatedProject = await api.updateProject(projectId, newName);
      setProjects(projects.map((p) => (p.id === projectId ? updatedProject : p)));
      setIsRenameModalOpen(false);
    } catch (error) {
      console.error('Failed to rename project:', error);
      setError(t('dashboard.projects.error_rename'));
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      setError(null);

      // Дублируем проект через бэкенд (вся логика на бэкенде)
      const newProject = await api.duplicateProject(projectId);

      // Отправляем событие аналитики о дублировании проекта
      trackManagerDuplicateProject(newProject.id);

      // Если есть текущая команда, добавляем дублированный проект в неё (только в cloud mode)
      if (currentTeam && !isOSS()) {
        try {
          await api.addProjectToTeam(currentTeam.id, {
            projectId: newProject.id,
            accessLevel: 'OPEN'
          });
          // Перезагружаем список проектов команды
          loadProjects();
        } catch (teamError) {
          console.error('Failed to add duplicated project to team:', teamError);
          setProjects((prevProjects) => [newProject, ...prevProjects]);
        }
      } else {
        // OSS mode or no team — просто добавляем в список
        setProjects((prevProjects) => [newProject, ...prevProjects]);
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      setError(t('dashboard.projects.error_duplicate'));
    }
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    try {
      setError(null);

      // Отправляем событие аналитики о удалении проекта
      trackManagerDeleteProject(projectId);

      // Удаляем проект с бэкенда
      await api.deleteProject(projectId);

      // Удаляем проект из IndexedDB
      try {
        await deleteProject(projectId);
      } catch (dbError) {
        console.warn('Failed to delete project from IndexedDB (continuing anyway):', dbError);
        // Не блокируем выполнение, если не удалось удалить из IndexedDB
      }

      setProjects(projects.filter((p) => p.id !== projectId));
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError(t('dashboard.projects.error_delete'));
      throw error; // Перебрасываем ошибку для обработки в модальном окне
    }
  };

  const handleProjectNameChange = async (projectId: string, newName: string) => {
    try {
      await api.updateProject(projectId, newName);
      setProjects((prevProjects) => prevProjects.map((project) => (project.id === projectId ? {...project, name: newName} : project)));
    } catch (error) {
      console.error('Failed to update project name:', error);
    }
  };

  const handleProjectInfoSave = () => {
    // Обновляем проекты после сохранения информации
    loadProjects();
  };

  const selectedProjectName = selectedProject?.name;

  return {
    projects,
    isLoading,
    isCreatingProject,
    error,
    selectedProject,
    selectedProjectName,
    isCreateModalOpen,
    isRenameModalOpen,
    isDeleteModalOpen,
    handleCreateProject,
    handleCreateProjectWithName,
    handleProjectSelect,
    handleRenameProject,
    handleRename,
    handleDuplicateProject,
    handleDeleteProject,
    handleDelete,
    handleProjectNameChange,
    handleProjectInfoSave,
    setIsCreateModalOpen,
    setIsRenameModalOpen,
    setIsDeleteModalOpen,
    isCreateTeamModalOpen,
    setIsCreateTeamModalOpen,
    handleCreateTeam: () => setIsCreateTeamModalOpen(true)
  };
};
