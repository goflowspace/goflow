import {ProjectAccessLevel, ProjectRole, RolePermissions, TeamMember, TeamRole} from '@types-folder/team';

// Константы для ролей
export const TEAM_ROLES = {
  ADMINISTRATOR: 'ADMINISTRATOR' as TeamRole,
  MANAGER: 'MANAGER' as TeamRole,
  MEMBER: 'MEMBER' as TeamRole,
  OBSERVER: 'OBSERVER' as TeamRole
} as const;

export const PROJECT_ROLES = {
  OWNER: 'OWNER' as ProjectRole,
  EDITOR: 'EDITOR' as ProjectRole,
  COMMENTER: 'COMMENTER' as ProjectRole,
  VIEWER: 'VIEWER' as ProjectRole,
  LOCALIZER: 'LOCALIZER' as ProjectRole
} as const;

// Мапинг ролей команды к ролям проекта по умолчанию
export const DEFAULT_PROJECT_ROLE_MAP: Record<TeamRole, ProjectRole> = {
  ADMINISTRATOR: PROJECT_ROLES.OWNER,
  MANAGER: PROJECT_ROLES.EDITOR,
  MEMBER: PROJECT_ROLES.EDITOR,
  OBSERVER: PROJECT_ROLES.VIEWER,
  LOCALIZER: PROJECT_ROLES.LOCALIZER
};

// Получение прав доступа для роли в команде
export const getTeamRolePermissions = (role: TeamRole): RolePermissions => {
  switch (role) {
    case TEAM_ROLES.ADMINISTRATOR:
      return {
        canManageTeam: true,
        canInviteMembers: true,
        canManageMembers: true,
        canCreateProjects: true,
        canManageProjects: true,
        canDeleteProjects: true,
        canManageProjectAccess: true,
        canViewTeamSettings: true,
        canEditTeamSettings: true
      };

    case TEAM_ROLES.MANAGER:
      return {
        canManageTeam: false,
        canInviteMembers: true,
        canManageMembers: true,
        canCreateProjects: true,
        canManageProjects: true,
        canDeleteProjects: false,
        canManageProjectAccess: true,
        canViewTeamSettings: true,
        canEditTeamSettings: false
      };

    case TEAM_ROLES.MEMBER:
      return {
        canManageTeam: false,
        canInviteMembers: false,
        canManageMembers: false,
        canCreateProjects: false,
        canManageProjects: false,
        canDeleteProjects: false,
        canManageProjectAccess: false,
        canViewTeamSettings: true,
        canEditTeamSettings: false
      };

    case TEAM_ROLES.OBSERVER:
      return {
        canManageTeam: false,
        canInviteMembers: false,
        canManageMembers: false,
        canCreateProjects: false,
        canManageProjects: false,
        canDeleteProjects: false,
        canManageProjectAccess: false,
        canViewTeamSettings: false,
        canEditTeamSettings: false
      };

    default:
      // Возвращаем минимальные права по умолчанию
      return getTeamRolePermissions(TEAM_ROLES.OBSERVER);
  }
};

// Проверка, может ли пользователь управлять другим участником
export const canManageMember = (currentUserRole: TeamRole, targetMemberRole: TeamRole, isTeamCreator: boolean = false): boolean => {
  // Создатель команды может управлять всеми
  if (isTeamCreator) return true;

  // Администратор может управлять всеми, кроме других администраторов
  if (currentUserRole === TEAM_ROLES.ADMINISTRATOR) {
    return targetMemberRole !== TEAM_ROLES.ADMINISTRATOR;
  }

  // Менеджер может управлять участниками и наблюдателями
  if (currentUserRole === TEAM_ROLES.MANAGER) {
    return [TEAM_ROLES.MEMBER, TEAM_ROLES.OBSERVER].includes(targetMemberRole);
  }

  return false;
};

// Получение доступных для назначения ролей
export const getAvailableRoles = (currentUserRole: TeamRole, isTeamCreator: boolean = false): TeamRole[] => {
  if (isTeamCreator) {
    return [TEAM_ROLES.ADMINISTRATOR, TEAM_ROLES.MANAGER, TEAM_ROLES.MEMBER, TEAM_ROLES.OBSERVER];
  }

  switch (currentUserRole) {
    case TEAM_ROLES.ADMINISTRATOR:
      return [TEAM_ROLES.MANAGER, TEAM_ROLES.MEMBER, TEAM_ROLES.OBSERVER];
    case TEAM_ROLES.MANAGER:
      return [TEAM_ROLES.MEMBER, TEAM_ROLES.OBSERVER];
    default:
      return [];
  }
};

// Проверка доступа к проекту на основе уровня доступа и роли
export const canAccessProject = (projectAccessLevel: ProjectAccessLevel, userTeamRole: TeamRole, hasExplicitAccess: boolean = false): boolean => {
  switch (projectAccessLevel) {
    case 'OPEN':
      // Открытые проекты доступны всем участникам команды
      return true;

    case 'RESTRICTED':
      // Ограниченные проекты доступны только тем, кому явно предоставлен доступ
      return hasExplicitAccess;

    case 'PRIVATE':
      // Приватные проекты доступны только администраторам и владельцу
      return userTeamRole === TEAM_ROLES.ADMINISTRATOR || hasExplicitAccess;

    default:
      return false;
  }
};

// Получение роли в проекте по умолчанию на основе роли в команде
export const getDefaultProjectRole = (teamRole: TeamRole): ProjectRole => {
  return DEFAULT_PROJECT_ROLE_MAP[teamRole] || PROJECT_ROLES.VIEWER;
};

// Проверка, может ли пользователь выполнить действие в проекте
export const canPerformProjectAction = (projectRole: ProjectRole, action: 'view' | 'edit' | 'comment' | 'manage'): boolean => {
  switch (action) {
    case 'view':
      return [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR, PROJECT_ROLES.COMMENTER, PROJECT_ROLES.VIEWER].includes(projectRole);

    case 'comment':
      return [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR, PROJECT_ROLES.COMMENTER].includes(projectRole);

    case 'edit':
      return [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR].includes(projectRole);

    case 'manage':
      return projectRole === PROJECT_ROLES.OWNER;

    default:
      return false;
  }
};

// Локализованные названия ролей
export const getTeamRoleDisplayName = (role: TeamRole, t: (key: string, fallback: string) => string): string => {
  switch (role) {
    case TEAM_ROLES.ADMINISTRATOR:
      return t('team.roles.administrator', 'Администратор');
    case TEAM_ROLES.MANAGER:
      return t('team.roles.manager', 'Менеджер');
    case TEAM_ROLES.MEMBER:
      return t('team.roles.member', 'Участник');
    case TEAM_ROLES.OBSERVER:
      return t('team.roles.observer', 'Наблюдатель');
    default:
      return role;
  }
};

export const getProjectRoleDisplayName = (role: ProjectRole, t: (key: string, fallback: string) => string): string => {
  switch (role) {
    case PROJECT_ROLES.OWNER:
      return t('team.project_roles.owner', 'Владелец');
    case PROJECT_ROLES.EDITOR:
      return t('team.project_roles.editor', 'Редактор');
    case PROJECT_ROLES.COMMENTER:
      return t('team.project_roles.commenter', 'Комментатор');
    case PROJECT_ROLES.VIEWER:
      return t('team.project_roles.viewer', 'Наблюдатель');
    default:
      return role;
  }
};

export const getProjectAccessLevelDisplayName = (level: ProjectAccessLevel, t: (key: string, fallback: string) => string): string => {
  switch (level) {
    case 'OPEN':
      return t('team.access_levels.open', 'Открытый доступ');
    case 'RESTRICTED':
      return t('team.access_levels.restricted', 'Ограниченный доступ');
    case 'PRIVATE':
      return t('team.access_levels.private', 'Приватный доступ');
    default:
      return level;
  }
};

// Получение описания роли
export const getTeamRoleDescription = (role: TeamRole, t: (key: string, fallback: string) => string): string => {
  switch (role) {
    case TEAM_ROLES.ADMINISTRATOR:
      return t('team.role_descriptions.administrator', 'Имеет полный доступ ко всем функциям команды');
    case TEAM_ROLES.MANAGER:
      return t('team.role_descriptions.manager', 'Может создавать проекты и управлять участниками');
    case TEAM_ROLES.MEMBER:
      return t('team.role_descriptions.member', 'Имеет доступ к редактированию назначенных проектов');
    case TEAM_ROLES.OBSERVER:
      return t('team.role_descriptions.observer', 'Только просмотр назначенных проектов без редактирования');
    default:
      return '';
  }
};

// Валидация ролей
export const isValidTeamRole = (role: string): role is TeamRole => {
  return Object.values(TEAM_ROLES).includes(role as TeamRole);
};

export const isValidProjectRole = (role: string): role is ProjectRole => {
  return Object.values(PROJECT_ROLES).includes(role as ProjectRole);
};
