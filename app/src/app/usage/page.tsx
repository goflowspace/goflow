'use client';

import React, {useEffect, useRef, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useProjects} from '@hooks/useProjects';
import {useUserInitialization} from '@hooks/useUserInitialization';
import {trackUsageOpen} from '@services/analytics';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import {ProjectsSidebar} from '@components/Dashboard/ProjectsSidebar';
import {StorageUsage} from '@components/Dashboard/StorageUsage/StorageUsage';
import CreateTeamModal from '@components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import UsageAnalytics from '@components/Dashboard/UsageAnalytics/UsageAnalytics';
import DashboardLayout from '@components/Dashboard/layouts/DashboardLayout';

const UsagePage: React.FC = () => {
  const router = useRouter();
  const {user} = useUserStore();
  const {isInitialized} = useTeamStore();
  const {projects, isLoading: isLoadingProjects} = useProjects();
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const hasTrackedUsageOpen = useRef(false);

  // Инициализируем пользователя
  useUserInitialization();

  // Трекинг открытия страницы Usage (только один раз)
  useEffect(() => {
    if (!hasTrackedUsageOpen.current) {
      trackUsageOpen();
      hasTrackedUsageOpen.current = true;
    }
  }, []);

  // Обработчик выбора проекта - переход на страницу проектов
  const handleProjectSelect = (projectId: string) => {
    router.push(`/projects?selected=${projectId}`);
  };

  // Компонент боковой панели проектов
  const projectsSidebar = (
    <ProjectsSidebar
      projects={projects}
      selectedProjectId={undefined} // На странице Usage нет выбранного проекта
      isCreatingProject={false}
      isLoadingProjects={isLoadingProjects}
      onCreateProject={() => router.push('/projects')} // Переход на страницу проектов для создания
      onCreateTeam={() => setIsCreateTeamModalOpen(true)}
      onProjectSelect={handleProjectSelect} // Теперь работает навигация к проектам
      onRenameProject={() => {}}
      onDuplicateProject={() => {}}
      onDeleteProject={() => {}}
    />
  );

  return (
    <DashboardLayout projectsSidebar={projectsSidebar}>
      <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
        <StorageUsage />
        <UsageAnalytics />
      </div>

      {/* Модальное окно создания команды */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSuccess={() => {
          // Команда создана успешно
          console.log('Team created successfully from usage page');
        }}
      />
    </DashboardLayout>
  );
};

export default UsagePage;
