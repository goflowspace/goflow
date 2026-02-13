'use client';

import React, {useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useFlowMenu} from '@hooks/useFlowMenu';
import {useProjects} from '@hooks/useProjects';
import {useUserInitialization} from '@hooks/useUserInitialization';
import {GearIcon, MoonIcon, TrashIcon, UpdateIcon} from '@radix-ui/react-icons';
import {api} from '@services/api';
import {useTranslation} from 'react-i18next';
import {isOSS} from 'src/utils/edition';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import AuthGuard from '@components/AuthGuard/AuthGuard';
import {LanguageSelector} from '@components/Dashboard/LanguageSelector';
import {ProjectsSidebar} from '@components/Dashboard/ProjectsSidebar';
import CreateTeamModal from '@components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import DeleteTeamModal from '@components/Dashboard/TeamManagement/DeleteTeamModal/DeleteTeamModal';
import ThemeSelector from '@components/Dashboard/ThemeSelector/ThemeSelector';
import DashboardLayout from '@components/Dashboard/layouts/DashboardLayout';

import s from './page.module.css';

const SettingsPageContent: React.FC = () => {
  const {t, i18n} = useTranslation();
  const router = useRouter();
  const {currentTeam, loadUserTeams, updateTeam, deleteTeam, isInitialized, getCurrentUserPermissions, loadTeamMembers, teamMembers} = useTeamStore();
  const {user} = useUserStore();
  const {changeLanguage} = useFlowMenu();
  const [teamName, setTeamName] = useState(currentTeam?.name || '');
  const [teamUrl, setTeamUrl] = useState('team-url');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
  const {projects, isLoading: isLoadingProjects} = useProjects();

  // Загружаем участников команды для проверки прав (только в cloud mode)
  React.useEffect(() => {
    if (currentTeam?.id && !isOSS()) {
      loadTeamMembers(currentTeam.id).catch(() => {
        // Игнорируем ошибку, используем fallback права
      });
    }
  }, [currentTeam?.id, loadTeamMembers]);

  // Получаем права пользователя с множественными проверками
  const isTeamCreator =
    user?.id &&
    currentTeam &&
    (user.id === currentTeam.creatorId || user.id === (currentTeam as any).ownerId || String(user.id) === String(currentTeam.creatorId) || String(user.id) === String((currentTeam as any).ownerId));

  const userPermissions = user?.id ? getCurrentUserPermissions(user.id) : null;

  // Права доступа: приоритизируем создателя команды
  const canEditTeamSettings = isTeamCreator || (userPermissions?.canEditTeamSettings ?? false);
  const canManageTeam = isTeamCreator || (userPermissions?.canManageTeam ?? false);

  // Опции языков
  const languageOptions = [
    {value: 'en', label: 'English', needsTranslation: false},
    {value: 'ru', label: 'Русский', needsTranslation: false},
    {value: 'fr', label: 'Français', needsTranslation: false},
    {value: 'es', label: 'Español', needsTranslation: false},
    {value: 'pt', label: 'Português', needsTranslation: false}
  ];

  useUserInitialization();

  const handleSave = async () => {
    if (!currentTeam) return;

    setIsLoading(true);
    try {
      await updateTeam(currentTeam.id, {name: teamName});
    } catch (error) {
      console.error('Failed to update team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!currentTeam) return;

    try {
      await deleteTeam(currentTeam.id);
      // Перенаправляем на страницу проектов после удаления команды
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete team:', error);
    } finally {
      setIsDeleteTeamModalOpen(false);
    }
  };

  // Обновляем название команды при изменении текущей команды
  React.useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
    }
  }, [currentTeam]);

  // Обработчик выбора проекта - переход в редактор
  const handleProjectSelect = (projectId: string) => {
    router.push(`/${projectId}/editor`);
  };

  // Компонент боковой панели проектов
  const projectsSidebar = (
    <ProjectsSidebar
      projects={projects}
      selectedProjectId={undefined}
      isCreatingProject={false}
      isLoadingProjects={isLoadingProjects}
      onCreateProject={() => router.push('/projects')}
      onCreateTeam={() => setIsCreateTeamModalOpen(true)}
      onProjectSelect={handleProjectSelect}
      onRenameProject={() => {}}
      onDuplicateProject={() => {}}
      onDeleteProject={() => {}}
    />
  );

  return (
    <DashboardLayout projectsSidebar={projectsSidebar}>
      <div
        style={{
          padding: '2rem',
          width: '100%',
          height: '100%',
          overflowY: 'auto'
        }}
      >
        <div className={s.header}>
          <h1 className={s.title}>{t('dashboard.settings.title')}</h1>
        </div>

        <div className={s.settingsContainer}>
          {/* Общие настройки (team name — cloud only) */}
          {!isOSS() && (
            <div className={s.settingsSection}>
              <div className={s.sectionHeader}>
                <h2 className={s.sectionTitle}>{t('dashboard.settings.general.title')}</h2>
                <p className={s.sectionDescription}>{t('dashboard.settings.general.description')}</p>
              </div>

              <div className={s.settingsCard}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>{t('dashboard.settings.general.team_name')}</label>
                  <input
                    type='text'
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className={s.fieldInput}
                    placeholder={t('dashboard.settings.general.team_name_placeholder')}
                    disabled={!currentTeam || !canEditTeamSettings}
                  />
                  <p className={s.fieldDescription}>{t('dashboard.settings.general.team_name_description')}</p>
                </div>

                {canEditTeamSettings && (
                  <div className={s.cardActions}>
                    <button onClick={handleSave} disabled={isLoading || !currentTeam} className={s.saveButton}>
                      {isLoading && <UpdateIcon className={s.spinIcon} />}
                      {isLoading ? t('dashboard.settings.saving') : t('dashboard.settings.save_changes')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Настройки внешнего вида */}
          <div className={s.settingsSection}>
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>{t('dashboard.settings.appearance.title')}</h2>
              <p className={s.sectionDescription}>{t('dashboard.settings.appearance.description')}</p>
            </div>

            <div className={s.settingsCard}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  <MoonIcon className={s.fieldIcon} />
                  {t('dashboard.settings.appearance.theme')}
                </label>
                <p className={s.fieldDescription}>{t('dashboard.settings.appearance.theme_description')}</p>
                <ThemeSelector />
              </div>
            </div>
          </div>

          {/* Языковые настройки */}
          <div className={s.settingsSection}>
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>{t('dashboard.settings.language.title')}</h2>
              <p className={s.sectionDescription}>{t('dashboard.settings.language.description')}</p>
            </div>

            <div className={s.settingsCard}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  <GearIcon className={s.fieldIcon} />
                  {t('dashboard.settings.language.interface_language')}
                </label>
                <p className={s.fieldDescription}>{t('dashboard.settings.language.interface_language_description')}</p>
                <div style={{marginTop: '12px'}}>
                  <LanguageSelector value={i18n.language} onChange={changeLanguage} options={languageOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* Опасная зона (cloud only) */}
          {currentTeam && canManageTeam && !isOSS() && (
            <div className={s.settingsSection}>
              <div className={s.sectionHeader}>
                <h2 className={s.sectionTitle}>{t('dashboard.settings.danger.title')}</h2>
                <p className={s.sectionDescription}>{t('dashboard.settings.danger.description')}</p>
              </div>

              <div className={`${s.settingsCard} ${s.dangerCard}`}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>{t('dashboard.settings.danger.delete_team')}</label>
                  <p className={s.fieldDescription}>{t('dashboard.settings.danger.delete_description')}</p>
                  <button className={s.dangerButton} onClick={() => setIsDeleteTeamModalOpen(true)}>
                    <TrashIcon className={s.buttonIcon} />
                    {t('dashboard.settings.danger.delete_button')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSuccess={() => {
          console.log('Team created successfully');
          loadUserTeams(); // Перезагружаем команды
        }}
      />

      <DeleteTeamModal isOpen={isDeleteTeamModalOpen} team={currentTeam} onClose={() => setIsDeleteTeamModalOpen(false)} onDelete={handleDeleteTeam} />
    </DashboardLayout>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <AuthGuard>
      <SettingsPageContent />
    </AuthGuard>
  );
};

export default SettingsPage;
