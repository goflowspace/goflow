'use client';

import React, {useEffect, useState} from 'react';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';

import {useTeamSubscriptions} from '@hooks/useTeamSubscriptions';
import {BarChartIcon, CardStackIcon, CheckIcon, ChevronDownIcon, GearIcon, HamburgerMenuIcon, PersonIcon, PlusIcon} from '@radix-ui/react-icons';
import {Button, DropdownMenu} from '@radix-ui/themes';
import {type Project} from '@services/api';
import {AuthService} from '@services/authService';
import {Team} from '@types-folder/team';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import {UserAvatar} from '@components/UserProfile/UserAvatar';

import {canAccessBilling, canAccessMembers} from '../../../utils/accessControl';
import {isOSS} from '../../../utils/edition';
import PlanBadge from '../TeamManagement/TeamSwitcher/PlanBadge';
import ProjectContextMenu from './ProjectContextMenu';
import ProjectListItem from './ProjectListItem';

import s from './ProjectsSidebar.module.css';

interface ProjectsSidebarProps {
  projects: Project[];
  selectedProjectId?: string;
  isCreatingProject?: boolean;
  isLoadingProjects?: boolean;
  onCreateProject: () => void;
  onCreateTeam?: () => void;
  onProjectSelect: (projectId: string) => void;
  onRenameProject?: (project: Project) => void;
  onDuplicateProject?: (projectId: string) => void;
  onDeleteProject?: (project: Project) => void;
}

const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  projects,
  selectedProjectId,
  isCreatingProject = false,
  isLoadingProjects = false,
  onCreateProject,
  onCreateTeam,
  onProjectSelect,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject
}) => {
  const {t} = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const {user, logout} = useUserStore();
  const {currentTeam, userTeams, isLoading, loadUserTeams, switchTeam, initializeFromStorage, isInitialized, currentUserRole} = useTeamStore();

  // Получаем подписки для всех команд пользователя
  const teamIds = userTeams.map((team) => team.id);
  const teamSubscriptions = useTeamSubscriptions(teamIds);

  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: {x: number; y: number};
    project: Project | null;
  }>({
    isOpen: false,
    position: {x: 0, y: 0},
    project: null
  });

  // Обработчик выхода пользователя
  const handleLogout = () => {
    const currentPath = window.location.pathname;
    logout();
    AuthService.logout();

    // Перенаправляем на страницу входа с сохранением текущего пути
    const loginUrl = AuthService.getLoginRedirectUrl(currentPath);
    router.push(loginUrl);
  };

  // Логика инициализации полностью перенесена в ClientLayout для глобального доступа

  // Навигационные элементы
  const navItems = [
    {
      href: '/members',
      label: t('dashboard.navigation.members', 'Участники'),
      icon: <PersonIcon className={s.navIcon} />
    },
    {
      href: '/settings',
      label: t('dashboard.navigation.settings', 'Настройки'),
      icon: <GearIcon className={s.navIcon} />
    }
  ];

  const getTeamInitials = (teamName: string): string => {
    const words = teamName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return teamName.substring(0, 2).toUpperCase();
  };

  // Получение инициалов для проекта
  const getProjectInitials = (projectName: string): string => {
    const words = projectName.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return projectName.substring(0, 2).toUpperCase();
  };

  const handleTeamSelect = (team: Team) => {
    switchTeam(team);
    setIsTeamMenuOpen(false);
  };

  const handleCreateTeam = () => {
    setIsTeamMenuOpen(false);
    onCreateTeam?.();
  };

  const isTeamOwner = (team: Team) => {
    return user?.id === team.creatorId;
  };

  // Обработчик выбора проекта
  const handleProjectSelect = (projectId: string) => {
    onProjectSelect(projectId);
  };

  // Обработчик разворачивания панели
  const handleExpandSidebar = () => {
    setIsAnimating(true);
    setShowContent(false);
    setIsCollapsed(false);

    // Показываем контент после завершения анимации разворачивания
    setTimeout(() => {
      setShowContent(true);
      setIsAnimating(false);
    }, 300); // 300ms - длительность анимации width transition
  };

  // Обработчик сворачивания панели
  const handleCollapseSidebar = () => {
    setIsAnimating(true);
    setShowContent(false);

    // Сворачиваем панель сразу после скрытия контента
    setTimeout(() => {
      setIsCollapsed(true);
      setIsAnimating(false);
    }, 50); // Небольшая задержка для скрытия контента
  };

  const handleContextMenu = (project: Project, event: React.MouseEvent) => {
    setContextMenu({
      isOpen: true,
      position: {x: event.clientX, y: event.clientY},
      project
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: {x: 0, y: 0},
      project: null
    });
  };

  const handleRename = () => {
    if (contextMenu.project && onRenameProject) {
      onRenameProject(contextMenu.project);
    }
  };

  const handleDuplicate = () => {
    if (contextMenu.project && onDuplicateProject) {
      onDuplicateProject(contextMenu.project.id);
    }
  };

  const handleDelete = () => {
    if (contextMenu.project && onDeleteProject) {
      onDeleteProject(contextMenu.project);
    }
  };

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isTeamMenuOpen) {
        const target = event.target as Element;
        if (!target.closest(`.${s.teamSelector}`)) {
          setIsTeamMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTeamMenuOpen]);

  // Сжатое представление панели
  if (isCollapsed) {
    return (
      <div className={`${s.sidebar} ${s.sidebarCollapsed}`}>
        {/* Заголовок с кнопкой разворачивания */}
        <div className={s.collapsedHeader}>
          <button className={s.expandButton} onClick={handleExpandSidebar} title={t('dashboard.projects.expand_panel', 'Развернуть панель')}>
            <HamburgerMenuIcon />
          </button>
        </div>

        {/* Сжатый список проектов */}
        <div className={s.collapsedProjectsList}>
          {projects.map((project) => (
            <div
              key={project.id}
              className={`${s.collapsedProjectItem} ${project.id === selectedProjectId ? s.collapsedProjectItemSelected : ''}`}
              onClick={() => handleProjectSelect(project.id)}
              title={project.name}
            >
              <span className={s.collapsedProjectInitials}>{getProjectInitials(project.name)}</span>
            </div>
          ))}
        </div>

        {/* Пользователь в сжатом виде */}
        <div className={s.collapsedUserSection}>
          {isOSS() ? (
            <div className={s.collapsedUserInfo}>{user && <UserAvatar user={user} size='2' />}</div>
          ) : (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <div className={s.collapsedUserInfo}>{user && <UserAvatar user={user} size='2' />}</div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={handleLogout}>{t('dashboard.user_menu.logout', 'Выйти')}</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${s.sidebar} ${s.sidebarExpanded}`}>
      {/* Селектор команд (только Cloud) */}
      {!isOSS() && (
        <div className={s.teamSection}>
          <div className={s.teamSelector}>
            <button className={s.teamButton} onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}>
              <div className={s.teamLogoWrapper}>
                <div className={s.teamLogo}>
                  <span className={s.teamInitials}>{currentTeam ? getTeamInitials(currentTeam.name) : 'FT'}</span>
                </div>
                {currentTeam && !isTeamOwner(currentTeam) && <PersonIcon className={s.memberIcon} />}
              </div>
              <div className={s.teamInfo}>
                <span className={s.teamName}>{currentTeam?.name || 'Go Flow team'}</span>
                {currentTeam && <PlanBadge planType={teamSubscriptions[currentTeam.id]?.planType || 'free'} size='small' />}
              </div>
              <ChevronDownIcon className={`${s.chevron} ${isTeamMenuOpen ? s.chevronOpen : ''}`} />
            </button>

            {isTeamMenuOpen && (
              <div className={s.teamDropdown}>
                <div className={s.dropdownHeader}>{t('dashboard.sidebar.teams', 'Команды')}</div>

                <div className={s.teamsList}>
                  {isLoading ? (
                    <div className={s.loadingState}>{t('dashboard.sidebar.loading_teams', 'Загрузка команд...')}</div>
                  ) : !userTeams || userTeams.length === 0 ? (
                    <div className={s.emptyTeamsState}>
                      <div className={s.emptyText}>{t('dashboard.sidebar.no_teams', 'Нет команд')}</div>
                    </div>
                  ) : (
                    userTeams.map((team) => {
                      const subscriptionInfo = teamSubscriptions[team.id];
                      const isOwner = isTeamOwner(team);

                      return (
                        <button key={team.id} className={s.teamItem} onClick={() => handleTeamSelect(team)}>
                          <div className={s.teamItemIconWrapper}>
                            <div className={s.teamItemIcon}>
                              <span className={s.teamItemInitials}>{getTeamInitials(team.name)}</span>
                            </div>
                            {!isOwner && <PersonIcon className={s.teamMemberIcon} />}
                          </div>
                          <div className={s.teamItemInfo}>
                            <div className={s.teamItemNameRow}>
                              <span className={s.teamItemName}>{team.name}</span>
                              <PlanBadge planType={subscriptionInfo?.planType || 'free'} size='small' />
                            </div>
                          </div>
                          {currentTeam?.id === team.id && <CheckIcon className={s.checkIcon} />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className={s.dropdownSeparator}></div>

                <button className={s.createTeamButton} onClick={handleCreateTeam}>
                  <PlusIcon className={s.plusIcon} />
                  {t('dashboard.sidebar.create_team', 'Создать команду')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Заголовок с кнопками управления */}
      <div className={s.header}>
        <div className={s.headerContent}>
          <div className={s.titleSection}>
            <button className={s.collapseButton} onClick={handleCollapseSidebar} title={t('dashboard.projects.collapse_panel', 'Свернуть панель')}>
              <HamburgerMenuIcon />
            </button>
            <h2 className={s.title}>{showContent ? t('dashboard.projects.title', 'Projects') : ''}</h2>
          </div>
          <Button onClick={onCreateProject} disabled={isCreatingProject} title={t('dashboard.projects.create_project')} size='2' variant='solid'>
            <PlusIcon />
            {showContent ? t('dashboard.projects.new_button', 'Create') : ''}
          </Button>
        </div>
      </div>

      {/* Список проектов */}
      <div className={s.projectsList}>
        {isLoadingProjects ? (
          <div className={s.loadingState}>
            <div className={s.spinner}></div>
            <p className={s.loadingText}>{t('dashboard.projects.loading', 'Загрузка проектов...')}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className={s.emptyState}>
            <p className={s.emptyText}>{t('dashboard.projects.empty_state.description', 'Create your first project')}</p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectListItem key={project.id} project={project} isSelected={project.id === selectedProjectId} onClick={handleProjectSelect} onContextMenu={handleContextMenu} />
          ))
        )}
      </div>

      {/* Дополнительные разделы - СКРЫТЫ */}
      <div className={`${s.additionalSections} ${s.hidden}`}>
        <nav className={s.navigation}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`${s.navItem} ${pathname === item.href ? s.navItemActive : ''}`}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Навигация воркспейса */}
      <div className={s.usageNavigation}>
        {!isOSS() && (
          <Link href='/usage' className={`${s.usageNavItem} ${pathname === '/usage' ? s.usageNavItemActive : ''}`}>
            <BarChartIcon className={s.usageNavIcon} />
            <span className={s.usageNavLabel}>{t('dashboard.navigation.usage')}</span>
          </Link>
        )}
        {!isOSS() && canAccessBilling(currentUserRole) && (
          <Link href='/billing' className={`${s.usageNavItem} ${pathname === '/billing' ? s.usageNavItemActive : ''}`}>
            <CardStackIcon className={s.usageNavIcon} />
            <span className={s.usageNavLabel}>{t('dashboard.navigation.billing')}</span>
          </Link>
        )}
        {!isOSS() && canAccessMembers(currentUserRole) && (
          <Link href='/members' className={`${s.usageNavItem} ${pathname === '/members' ? s.usageNavItemActive : ''}`}>
            <PersonIcon className={s.usageNavIcon} />
            <span className={s.usageNavLabel}>{t('dashboard.navigation.members')}</span>
          </Link>
        )}
        <Link href='/settings' className={`${s.usageNavItem} ${pathname === '/settings' ? s.usageNavItemActive : ''}`}>
          <GearIcon className={s.usageNavIcon} />
          <span className={s.usageNavLabel}>{t('dashboard.navigation.settings')}</span>
        </Link>
      </div>

      {/* Footer с аватаром пользователя */}
      <div className={s.footer}>
        {isOSS() ? (
          <div className={s.userInfo}>
            {user && <UserAvatar user={user} size='2' />}
            <span className={s.userName}>{user?.name || 'Пользователь'}</span>
          </div>
        ) : (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <div className={s.userInfo}>
                {user && <UserAvatar user={user} size='2' />}
                <span className={s.userName}>{user?.name || 'Пользователь'}</span>
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={handleLogout}>{t('dashboard.user_menu.logout', 'Выйти')}</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      </div>

      {/* Контекстное меню */}
      <ProjectContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        projectId={contextMenu.project?.id || ''}
        projectName={contextMenu.project?.name || ''}
        onClose={closeContextMenu}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ProjectsSidebar;
