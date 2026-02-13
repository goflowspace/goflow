'use client';

import React from 'react';

import {useParams} from 'next/navigation';

import {useGraphStore} from '@store/useGraphStore';

import ProjectWorkspace from '@components/Dashboard/ProjectWorkspace/ProjectWorkspace';
import {ProjectsSidebar} from '@components/Dashboard/ProjectsSidebar';
import CreateTeamModal from '@components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import DashboardLayout from '@components/Dashboard/layouts/DashboardLayout';
import SimpleCreateModal from '@components/Dashboard/projects/SimpleCreateModal';
import SimpleDeleteModal from '@components/Dashboard/projects/SimpleDeleteModal';
import SimpleRenameModal from '@components/Dashboard/projects/SimpleRenameModal';

import {useProjectPage} from '../../../../../hooks/useProjectPage';

const EntityModalPage: React.FC = () => {
  const params = useParams();
  const projectId = params.project_id as string;
  const typeId = params.type_id as string;
  const entityId = params.entity_id as string;
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';
  const {
    projects,
    isLoading,
    isCreatingProject,
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
    handleCreateTeam
  } = useProjectPage();

  const projectsSidebar = (
    <ProjectsSidebar
      projects={projects}
      selectedProjectId={projectId}
      isCreatingProject={isCreatingProject}
      isLoadingProjects={isLoading}
      onCreateProject={handleCreateProject}
      onCreateTeam={handleCreateTeam}
      onProjectSelect={handleProjectSelect}
      onRenameProject={handleRenameProject}
      onDuplicateProject={handleDuplicateProject}
      onDeleteProject={handleDeleteProject}
    />
  );

  return (
    <DashboardLayout projectsSidebar={projectsSidebar}>
      <ProjectWorkspace
        selectedProjectId={projectId}
        selectedProjectName={selectedProjectName}
        onCreateProject={handleCreateProject}
        onProjectNameChange={handleProjectNameChange}
        onProjectInfoSave={handleProjectInfoSave}
        section='entities'
        filterTypeId={typeId}
        openEntityId={entityId}
      />

      {/* Модальные окна */}
      <SimpleCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={handleCreateProjectWithName} isCreating={isCreatingProject} />

      <SimpleRenameModal
        isOpen={isRenameModalOpen}
        projectName={selectedProject?.name || ''}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={(newName) => {
          if (selectedProject) {
            handleRename(selectedProject.id, newName, timelineId);
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
          // Команда создана успешно
          console.log('Team created successfully from entity page');
        }}
      />
    </DashboardLayout>
  );
};

export default EntityModalPage;
