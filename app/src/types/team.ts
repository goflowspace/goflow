import {ProjectInfo} from './projectInfo';

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  settings: TeamSettings;
  // Опциональные поля для расширенной информации о команде
  members?: TeamMember[];
  invitations?: TeamInvitation[];
  owner?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
  _count?: {
    members: number;
    projects: number;
  };
}

export interface TeamSettings {
  defaultProjectAccess: ProjectAccessLevel;
  allowMemberInvites: boolean;
  invitationExpiryDays: number; // по умолчанию 3 дня
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  invitedBy: string;
  status: MemberStatus;
  hasAIAccess: boolean; // Доступ к ИИ для участника команды
  user: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  projectIds?: string[]; // проекты, к которым предоставляется доступ
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: InvitationStatus;
  token: string;
}

export interface TeamProject {
  id: string;
  name: string;
  teamId: string;
  ownerId: string;
  accessLevel: ProjectAccessLevel;
  createdAt: string;
  updatedAt: string;
  members: ProjectTeamMember[];
  projectInfo?: ProjectInfo | null;
}

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  addedAt: string;
  addedBy: string;
}

// Роли в команде
export type TeamRole = 'ADMINISTRATOR' | 'MANAGER' | 'MEMBER' | 'OBSERVER' | 'LOCALIZER';

// Роли в проекте
export type ProjectRole = 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER' | 'LOCALIZER';

// Уровни доступа к проектам
export type ProjectAccessLevel = 'OPEN' | 'RESTRICTED' | 'PRIVATE';

// Статусы участников
export type MemberStatus = 'ACTIVE' | 'DEACTIVATED' | 'PENDING';

// Статусы приглашений
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

// Интерфейс для состояния команд в сторе
export interface TeamState {
  // Текущая выбранная команда
  currentTeam: Team | null;

  // Команды пользователя
  userTeams: Team[];

  // Участники текущей команды
  teamMembers: TeamMember[];

  // Приглашения команды
  teamInvitations: TeamInvitation[];

  // Проекты команды
  teamProjects: TeamProject[];

  // Роль текущего пользователя в команде
  currentUserRole: TeamRole | null;

  // Состояния загрузки
  isLoading: boolean;
  isCreatingTeam: boolean;
  isInvitingMember: boolean;

  // Ошибки
  error: string | null;

  // Действия
  setCurrentTeam: (team: Team | null) => void;
  setUserTeams: (teams: Team[]) => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setTeamInvitations: (invitations: TeamInvitation[]) => void;
  setTeamProjects: (projects: TeamProject[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setCurrentUserRole: (role: TeamRole | null) => void;
  fetchCurrentUserRole: (teamId: string) => Promise<void>;
}

// Интерфейсы для API запросов
export interface CreateTeamRequest {
  name: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

export interface InviteMemberRequest {
  email: string;
  role: TeamRole;
  projectIds?: string[];
}

export interface UpdateMemberRoleRequest {
  memberId: string;
  role: TeamRole;
}

export interface AddProjectMemberRequest {
  projectId: string;
  userId: string;
  role: ProjectRole;
}

export interface UpdateProjectAccessRequest {
  projectId: string;
  accessLevel: ProjectAccessLevel;
}

// Права доступа для ролей
export interface RolePermissions {
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canCreateProjects: boolean;
  canManageProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectAccess: boolean;
  canViewTeamSettings: boolean;
  canEditTeamSettings: boolean;
}

// Вспомогательные типы для UI
export interface TeamMemberWithPermissions extends TeamMember {
  permissions: RolePermissions;
  canBeModified: boolean; // может ли текущий пользователь изменять этого участника
}

export interface TeamProjectWithAccess extends TeamProject {
  userRole?: ProjectRole;
  canAccess: boolean;
  canEdit: boolean;
  canManage: boolean;
}
