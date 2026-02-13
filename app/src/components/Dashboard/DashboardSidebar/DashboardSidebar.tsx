'use client';

import React, {useEffect, useState} from 'react';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

import {BarChartIcon, CheckIcon, ChevronDownIcon, GearIcon, PersonIcon, PlusIcon, ReaderIcon} from '@radix-ui/react-icons';
import {Team} from '@types-folder/team';
import {useTranslation} from 'react-i18next';
import {isCloud} from 'src/utils/edition';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import s from './DashboardSidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardSidebarProps {
  onCreateTeam?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({onCreateTeam}) => {
  const pathname = usePathname();
  const {t} = useTranslation();
  const {user} = useUserStore();
  const {currentTeam, userTeams, isLoading, loadUserTeams, switchTeam, initializeFromStorage, isInitialized} = useTeamStore();

  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

  // Инициализируем состояние из localStorage и загружаем команды, если пользователь есть, а команды еще не загружены
  useEffect(() => {
    initializeFromStorage();
    if (user && !isInitialized) {
      loadUserTeams();
    }
  }, [user, isInitialized, loadUserTeams, initializeFromStorage]);

  const navItems: NavItem[] = [
    {
      href: '/projects',
      label: t('dashboard.navigation.projects'),
      icon: <ReaderIcon className={s.navIcon} />
    },
    // Cloud-only навигация
    ...(isCloud()
      ? [
          {
            href: '/usage',
            label: t('dashboard.navigation.usage', 'Usage'),
            icon: <BarChartIcon className={s.navIcon} />
          }
        ]
      : [])
    // {
    //   href: '/members',
    //   label: t('dashboard.navigation.members'),
    //   icon: <PersonIcon className={s.navIcon} />
    // },
    // {
    //   href: '/settings',
    //   label: t('dashboard.navigation.settings'),
    //   icon: <GearIcon className={s.navIcon} />
    // }
  ];

  const getTeamInitials = (teamName: string): string => {
    const words = teamName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return teamName.substring(0, 2).toUpperCase();
  };

  const handleTeamSelect = (team: Team) => {
    switchTeam(team);
    setIsTeamMenuOpen(false);
  };

  const handleCreateTeam = () => {
    setIsTeamMenuOpen(false);
    onCreateTeam?.();
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

  return (
    <div className={s.sidebar}>
      <div className={s.sidebarContent}>
        <div className={s.sidebarHeader}>
          <div className={s.teamSelector}>
            {/* <button className={s.teamButton} onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}>
              <div className={s.teamLogo}>
                <span className={s.teamInitials}>{currentTeam ? getTeamInitials(currentTeam.name) : 'FT'}</span>
              </div>
              <span className={s.teamName}>{currentTeam?.name || 'Go Flow team'}</span>
              <ChevronDownIcon className={`${s.chevron} ${isTeamMenuOpen ? s.chevronOpen : ''}`} />
            </button> */}

            {/* {isTeamMenuOpen && (
              <div className={s.teamDropdown}>
                <div className={s.dropdownHeader}>{t('dashboard.sidebar.teams')}</div>

                <div className={s.teamsList}>
                  {isLoading ? (
                    <div className={s.loadingState}>{t('dashboard.sidebar.loading_teams')}</div>
                  ) : !userTeams || userTeams.length === 0 ? (
                    <div className={s.emptyTeamsState}>
                      <div className={s.emptyText}>{t('dashboard.sidebar.no_teams')}</div>
                    </div>
                  ) : (
                    userTeams.map((team) => (
                      <button key={team.id} className={s.teamItem} onClick={() => handleTeamSelect(team)}>
                        <div className={s.teamItemIcon}>
                          <span className={s.teamItemInitials}>{getTeamInitials(team.name)}</span>
                        </div>
                        <span className={s.teamItemName}>{team.name}</span>
                        {currentTeam?.id === team.id && <CheckIcon className={s.checkIcon} />}
                      </button>
                    ))
                  )}
                </div>

                <div className={s.dropdownSeparator}></div>

                <button className={s.createTeamButton} onClick={handleCreateTeam}>
                  <PlusIcon className={s.plusIcon} />
                  {t('dashboard.sidebar.create_team')}
                </button>
              </div>
            )} */}
          </div>
        </div>

        <nav className={s.navigation}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`${s.navItem} ${pathname === item.href ? s.navItemActive : ''}`}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className={s.sidebarFooter}>{/* Аватар пользователя перенесен в header layout'а */}</div>
    </div>
  );
};

export default DashboardSidebar;
