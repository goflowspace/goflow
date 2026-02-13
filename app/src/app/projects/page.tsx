'use client';

import React, {useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useUserInitialization} from '@hooks/useUserInitialization';
import {trackManagerCreateProject, trackManagerDeleteProject, trackManagerDuplicateProject, trackProjectNameEditing} from '@services/analytics';
import {type Project, api} from '@services/api';
import {deleteProject} from '@services/dbService';
import {useTranslation} from 'react-i18next';
import {useCanvasStore} from 'src/store/useCanvasStore';
import {useGraphStore} from 'src/store/useGraphStore';
import {isOSS} from 'src/utils/edition';
import {buildEditorPath} from 'src/utils/navigation';
import {createEmptyProjectState} from 'src/utils/projectStateHelpers';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import AuthGuard from '@components/AuthGuard/AuthGuard';
import {ProjectWorkspace} from '@components/Dashboard/ProjectWorkspace';
import {ProjectsSidebar} from '@components/Dashboard/ProjectsSidebar';
import CreateTeamModal from '@components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import DashboardLayout from '@components/Dashboard/layouts/DashboardLayout';
import SimpleCreateModal from '@components/Dashboard/projects/SimpleCreateModal';
import SimpleDeleteModal from '@components/Dashboard/projects/SimpleDeleteModal';
import SimpleRenameModal from '@components/Dashboard/projects/SimpleRenameModal';

const ProjectsPageContent: React.FC = () => {
  const router = useRouter();
  const {t} = useTranslation();
  const {user} = useUserStore();
  const {currentTeam, isLoading: isTeamLoading, isInitialized, userTeams} = useTeamStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [teamCreatedFlag, setTeamCreatedFlag] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | undefined>(undefined);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [showProjectLimitAlert, setShowProjectLimitAlert] = useState(false);
  // Инициализируем пользователя
  useUserInitialization();

  // Отслеживаем изменение ID команды, а не объекта команды
  useEffect(() => {
    const newTeamId = currentTeam?.id || undefined;
    if (newTeamId !== currentTeamId) {
      setCurrentTeamId(newTeamId);
    }
  }, [currentTeam, currentTeamId]);

  // Загружаем проекты только при изменении ID команды
  useEffect(() => {
    if (user && isInitialized && !isLoadingProjects) {
      loadProjects();
    }
  }, [user, isInitialized, currentTeamId]);

  // Отслеживаем создание новой команды
  useEffect(() => {
    if (teamCreatedFlag && !isLoadingProjects) {
      // Небольшая задержка чтобы дать стору время обновиться
      setTimeout(() => {
        loadProjects();
        setTeamCreatedFlag(false);
      }, 100);
    }
  }, [teamCreatedFlag]);

  const loadProjects = async () => {
    // Предотвращаем множественные одновременные вызовы
    if (isLoadingProjects) {
      return;
    }

    try {
      setIsLoadingProjects(true);
      setIsLoading(true);
      setError(null);

      let data: Project[] = [];

      if (currentTeam && !isOSS()) {
        // Загружаем проекты команды (cloud mode)
        try {
          const teamProjects = await api.getTeamProjects(currentTeam.id);
          // Адаптируем данные команды к формату Project[]
          data = teamProjects.map((tp) => ({
            id: tp.project.id,
            name: tp.project.name,
            createdAt: tp.project.createdAt,
            updatedAt: tp.project.updatedAt,
            creatorId: tp.project.creator.id,
            version: 1, // Значение по умолчанию, так как в командных проектах этого поля может не быть
            projectInfo: tp.project.projectInfo, // Сохраняем информацию о проекте
            members: [
              {
                id: `${tp.project.creator.id}-owner`,
                projectId: tp.project.id,
                userId: tp.project.creator.id,
                role: 'OWNER' as const,
                createdAt: tp.project.createdAt,
                user: {
                  id: tp.project.creator.id,
                  name: tp.project.creator.name,
                  email: tp.project.creator.email
                }
              }
            ]
          }));
        } catch (teamError) {
          console.warn('Failed to load team projects:', teamError);
          if (teamError instanceof Error && teamError.message.includes('404')) {
            data = await api.getProjects();
          } else {
            data = [];
          }
        }
      } else {
        // OSS mode or no team — загружаем все проекты пользователя
        data = await api.getProjects();
      }

      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError(t('dashboard.projects.error_load'));
      setProjects([]);
    } finally {
      setIsLoading(false);
      setIsLoadingProjects(false);
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
          console.log('AddProjectToTeam error:', teamError, 'Code:', (teamError as any)?.code);

          // Проверяем, является ли это ошибкой лимита проектов
          if (teamError instanceof Error && (teamError as any).code === 'FREE_PROJECTS_LIMIT') {
            setShowProjectLimitAlert(true);
            setError(null);
            setIsCreatingProject(false);
            return; // Выходим из функции, не закрывая модал создания
          } else {
            console.error('Failed to add project to team:', teamError);
            // Не блокируем создание проекта, если не удалось добавить в команду
            setProjects((prevProjects) => [newProject, ...prevProjects]);
          }
        }
      } else {
        // OSS mode or no team — просто добавляем в список
        setProjects((prevProjects) => [newProject, ...prevProjects]);
      }

      // Выбираем созданный проект, но НЕ переходим в редактор
      setSelectedProjectId(newProject.id);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      setError(t('dashboard.projects.error_create'));
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleRename = async (projectId: string, newName: string) => {
    try {
      setError(null);

      // Отправляем событие аналитики о переименовании проекта
      trackProjectNameEditing(newName.length, 'manager', projectId);

      const updatedProject = await api.updateProject(projectId, newName);
      setProjects(projects.map((p) => (p.id === projectId ? updatedProject : p)));
      setIsRenameModalOpen(false);
    } catch (error) {
      console.error('Failed to rename project:', error);
      setError(t('dashboard.projects.error_rename'));
    }
  };

  const handleProjectNameChangeFromWorkspace = (projectId: string, newName: string) => {
    // Обновляем локальное состояние проектов после изменения имени в рабочей области
    setProjects(projects.map((p) => (p.id === projectId ? {...p, name: newName} : p)));
  };

  const handleProjectInfoSave = async () => {
    // Перезагружаем список проектов после сохранения информации о проекте
    // чтобы отобразить актуальную информацию (например, обновленный логлайн)
    try {
      await loadProjects();
    } catch (error) {
      console.error('Failed to reload projects after saving project info:', error);
    }
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
        console.log('Project successfully deleted from IndexedDB:', projectId);
      } catch (dbError) {
        console.warn('Failed to delete project from IndexedDB (continuing anyway):', dbError);
        // Не блокируем выполнение, если не удалось удалить из IndexedDB
      }

      setProjects(projects.filter((p) => p.id !== projectId));

      // Если удаляем выбранный проект, сбрасываем выбор
      if (selectedProjectId === projectId) {
        setSelectedProjectId(undefined);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError(t('dashboard.projects.error_delete'));
      throw error; // Перебрасываем ошибку для обработки в модальном окне
    }
  };

  const handleUpgrade = () => {
    router.push('/billing');
    setShowProjectLimitAlert(false);
    setIsCreateModalOpen(false);
  };

  const handleCloseProjectLimitAlert = () => {
    setShowProjectLimitAlert(false);
  };

  const handleDuplicate = async (projectId: string) => {
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

  const openRenameModal = (project: Project) => {
    setSelectedProject(project);
    setIsRenameModalOpen(true);
  };

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  // Компонент боковой панели проектов
  const projectsSidebar = (
    <ProjectsSidebar
      projects={projects}
      selectedProjectId={selectedProjectId}
      isCreatingProject={isCreatingProject}
      isLoadingProjects={isLoading}
      onCreateProject={handleCreateProject}
      onCreateTeam={() => setIsCreateTeamModalOpen(true)}
      onProjectSelect={handleProjectSelect}
      onRenameProject={openRenameModal}
      onDuplicateProject={handleDuplicate}
      onDeleteProject={openDeleteModal}
    />
  );

  return (
    <DashboardLayout projectsSidebar={projectsSidebar}>
      <ProjectWorkspace
        selectedProjectId={selectedProjectId}
        selectedProjectName={projects.find((p) => p.id === selectedProjectId)?.name}
        onCreateProject={handleCreateProject}
        onProjectNameChange={handleProjectNameChangeFromWorkspace}
        onProjectInfoSave={handleProjectInfoSave}
      />

      {/* Модальные окна */}
      <SimpleCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={handleCreateProjectWithName} isCreating={isCreatingProject} />

      <SimpleRenameModal
        isOpen={isRenameModalOpen}
        projectName={selectedProject?.name || ''}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={(newName) => {
          if (selectedProject) {
            handleRename(selectedProject.id, newName);
          }
        }}
      />

      <SimpleDeleteModal
        isOpen={isDeleteModalOpen}
        projectName={selectedProject?.name || ''}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={async () => {
          if (selectedProject) {
            await handleDelete(selectedProject.id);
          }
        }}
      />

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSuccess={() => {
          // Устанавливаем флаг для перезагрузки проектов после создания команды
          setTeamCreatedFlag(true);
        }}
      />

      {/* Алерт лимита проектов */}
      {showProjectLimitAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              margin: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{marginBottom: '1rem'}}>
              <h2
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}
              >
                {t('projects.limit_alert.title', 'Лимит проектов достигнут')}
              </h2>
              <button
                onClick={handleCloseProjectLimitAlert}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: '1rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #f59e0b',
                marginBottom: '1.5rem'
              }}
            >
              <div
                style={{
                  fontSize: '2rem',
                  textAlign: 'center',
                  marginBottom: '0.5rem'
                }}
              >
                ⚠️
              </div>
              <p
                style={{
                  margin: 0,
                  lineHeight: '1.5',
                  textAlign: 'center',
                  color: '#92400e'
                }}
              >
                {t('projects.limit_alert.message', 'Один пользователь может владеть только одной бесплатной командой. Все остальные требуют подписки Pro и выше для создания проектов.')}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc'
                }}
              >
                <h4
                  style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    color: '#374151'
                  }}
                >
                  💎 {t('projects.limit_alert.option_upgrade_title', 'Обновить тариф')}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    lineHeight: '1.4'
                  }}
                >
                  {t('projects.limit_alert.option_upgrade_desc', 'Получите доступ к неограниченному количеству проектов и дополнительным функциям')}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexDirection: 'column'
              }}
            >
              <button
                onClick={handleUpgrade}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: '1px solid #10b981',
                  borderRadius: '4px',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                💎 {t('projects.limit_alert.upgrade_button', 'Обновить тариф')}
              </button>

              <button
                onClick={handleCloseProjectLimitAlert}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}
              >
                {t('common.cancel', 'Отмена')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const ProjectsPage: React.FC = () => {
  return (
    <AuthGuard>
      <ProjectsPageContent />
    </AuthGuard>
  );
};

export default ProjectsPage;
