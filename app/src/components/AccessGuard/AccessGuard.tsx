'use client';

import React from 'react';

import {useRouter} from 'next/navigation';

import {TeamRole} from '@types-folder/team';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';

interface AccessGuardProps {
  children: React.ReactNode;
  allowedRoles: TeamRole[];
  redirectTo?: string;
  fallbackComponent?: React.ComponentType;
}

const AccessGuard: React.FC<AccessGuardProps> = ({children, allowedRoles, redirectTo = '/usage', fallbackComponent: FallbackComponent}) => {
  const {t} = useTranslation();
  const router = useRouter();
  const {currentUserRole, currentTeam, isLoading, isInitialized, isLoadingUserRole} = useTeamStore();

  // Если команды еще не загружены, показываем loading
  if (!isInitialized || isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          padding: '2rem'
        }}
      >
        <div style={{color: 'var(--dashboard-text-secondary)'}}>{t('dashboard.loading', 'Loading teams...')}</div>
      </div>
    );
  }

  // Если команда не выбрана, разрешаем доступ (личная работа)
  if (!currentTeam) {
    return <>{children}</>;
  }

  // Если команда есть, но роль еще загружается, показываем loading
  if (currentTeam && isLoadingUserRole) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          padding: '2rem'
        }}
      >
        <div style={{color: 'var(--dashboard-text-secondary)'}}>{t('dashboard.loading_permissions', 'Loading permissions...')}</div>
      </div>
    );
  }

  // Проверяем доступ
  const hasAccess = currentUserRole && allowedRoles.includes(currentUserRole);

  if (!hasAccess) {
    // Если есть кастомный компонент для показа при отсутствии доступа
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    // Стандартное сообщение об ошибке доступа
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--dashboard-text-primary)',
            marginBottom: '1rem'
          }}
        >
          {t('dashboard.access_denied.title', 'Access denied')}
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--dashboard-text-secondary)',
            marginBottom: '2rem',
            maxWidth: '400px'
          }}
        >
          {t('dashboard.access_denied.description', 'У вас недостаточно прав для просмотра этого раздела. Обратитесь к администратору команды.')}
        </p>
        <button
          onClick={() => router.push(redirectTo)}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: 'var(--dashboard-primary)',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          {t('dashboard.access_denied.go_back', 'Вернуться назад')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AccessGuard;
