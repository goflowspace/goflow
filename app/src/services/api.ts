// Импорты типов для команд
// Импорты типов для информации о проекте
import {BibleQualityScore} from '@types-folder/bibleQuality';
import {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  CreditBalance,
  CreditTransaction,
  CreditTransactionsResponse,
  CreditsResponse,
  ExtendedCreditBalance,
  ExtendedCreditsResponse,
  ProductsResponse,
  Purchase,
  PurchasesResponse,
  StripeProduct,
  Subscription,
  SubscriptionsResponse,
  TeamCreditBalance,
  TeamCreditsResponse
} from '@types-folder/billing';
import {
  // Сущности
  CreateEntityDto,
  // Параметры сущностей
  CreateEntityParameterDto,
  CreateEntityTypeDto,
  EntitiesQueryParams,
  EntitiesResponse,
  Entity,
  EntityParameter,
  EntityParameterResponse,
  EntityParametersResponse,
  EntityResponse,
  // Типы сущностей
  EntityType,
  EntityTypeParameter,
  EntityTypeParameterDto,
  EntityTypeResponse,
  EntityTypesQueryParams,
  EntityTypesResponse,
  ParametersQueryParams,
  // Шаблоны проектов
  ProjectTemplate,
  ProjectTemplateResponse,
  ProjectTemplatesResponse,
  TemplatesQueryParams,
  UpdateEntityDto,
  UpdateEntityParameterDto,
  UpdateEntityTypeDto,
  UpdateEntityValuesDto
} from '@types-folder/entities';
import {
  CreateNoteDto,
  CreateTagDto,
  NoteResponse,
  NotebookStatsResponse,
  NotesFilters,
  NotesResponse,
  PaginationParams,
  TagResponse,
  TagsResponse,
  UpdateNoteDto,
  UpdateTagDto
} from '@types-folder/notebook';
import {CreateProjectInfoDto, ProjectInfo, ProjectInfoResponse, UpdateProjectInfoDto} from '@types-folder/projectInfo';
import {
  AddProjectMemberRequest,
  CreateTeamRequest,
  InviteMemberRequest,
  Team,
  TeamInvitation,
  TeamMember,
  TeamProject,
  TeamRole,
  UpdateMemberRoleRequest,
  UpdateProjectAccessRequest
} from '@types-folder/team';

import {getApiUrl} from '../utils/environment';
import {ISyncResult} from './interfaces/syncInterfaces';

export const API_URL = getApiUrl();

declare const fetch: typeof globalThis.fetch;

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  createdAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  version: number;
  members: ProjectMember[];
  projectInfo?: ProjectInfo | null;
  templateId?: string; // ID шаблона, по которому создан проект
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CreateProjectPayload {
  name: string;
  templateId?: string; // ID шаблона для применения
  data?: {
    [key: string]: any;
  };
}

// Интерфейс для данных проекта
export interface ProjectData {
  timelines: Record<string, any>;
  timelinesMetadata?: any[]; // Метаданные таймлайнов (названия, даты создания и т.д.)
  projectName: string;
  projectId?: string; // ID проекта, к которому относятся данные
  _lastModified?: number; // Временная метка последнего изменения
  [key: string]: any;
}

// Интерфейс для ответа с данными проекта
export interface ProjectDataResponse {
  data: ProjectData;
}

// === ТИПЫ ДЛЯ ТАЙМЛАЙНОВ ===

export interface Timeline {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimelineDto {
  projectId: string;
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateTimelineDto {
  name?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface TimelinesQueryParams {
  projectId: string;
  limit?: number;
  offset?: number;
  orderBy?: 'order' | 'createdAt' | 'name';
  sortDirection?: 'asc' | 'desc';
}

export interface TimelinesResponse {
  timelines: Timeline[];
}

// Интерфейс для снимка графа
export interface GraphSnapshotResponse {
  success: boolean;
  version: number;
  timestamp: number;
  snapshot: ProjectData;
}

// Интерфейсы для аналитики использования
export interface UsageAnalyticsData {
  date: string;
  creditsSpent: number;
  nodesCreated: number;
  charactersWritten: number;
  userBreakdown?: UserDayBreakdown[];
}

export interface UserDayBreakdown {
  userId: string;
  userName: string;
  creditsSpent: number;
  nodesCreated: number;
  charactersWritten: number;
}

export interface UsageTeamMember {
  id: string;
  name: string;
  email: string;
}

export interface UsageAnalyticsResponse {
  analytics: UsageAnalyticsData[];
  teamMembers: UsageTeamMember[];
  totalCreditsSpent: number;
  totalNodesCreated: number;
  totalCharactersWritten: number;
}

export interface RecentTransaction {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  userName: string;
}

// Интерфейс для операции
export interface Operation {
  // Определите поля операции
  // например: type, payload, version, etc.
  [key: string]: any;
}

// Интерфейс для ответа при обновлении токена
export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  user: User;
}

// Интерфейсы для API ответов команд
export interface TeamsResponse {
  success: boolean;
  data: Team[];
}

export interface TeamMembersResponse {
  members: TeamMember[];
}

export interface TeamInvitationsResponse {
  invitations: TeamInvitation[];
}

export interface TeamProjectsResponse {
  success: boolean;
  data: TeamProjectWithDetails[];
}

export interface TeamProjectWithDetails {
  id: string;
  teamId: string;
  projectId: string;
  accessLevel: string;
  addedAt: string;
  addedBy: string;
  project: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    projectInfo?: ProjectInfo | null;
    creator: {
      id: string;
      name: string;
      email: string;
    };
  };
  addedByUser: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateTeamResponse {
  team: Team;
}

export interface InviteMemberResponse {
  invitation: TeamInvitation;
}

export interface AcceptInvitationResponse {
  member: TeamMember;
}

/**
 * Специальная ошибка для случаев нехватки кредитов
 */
export class InsufficientCreditsError extends Error {
  readonly name = 'InsufficientCreditsError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

class ApiService {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private readonly isOSSEdition = process.env.NEXT_PUBLIC_EDITION === 'oss';

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const currentTeamId = localStorage.getItem('currentTeamId');

    return {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(currentTeamId && !this.isOSSEdition ? {'X-Team-Id': currentTeamId} : {})
    };
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({refreshToken})
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data: RefreshTokenResponse = await response.json();

        // Сохраняем новый access токен
        localStorage.setItem('auth_token', data.accessToken);
        document.cookie = `auth_token=${data.accessToken}; path=/; max-age=${15 * 60}`; // 15 минут
      } catch (error) {
        // Если не удалось обновить токен, очищаем данные и перенаправляем на логин
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/auth/login';
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    });

    // В OSS режиме не пытаемся обновить токен
    if (response.status === 401 && !this.isOSSEdition) {
      try {
        await this.refreshAccessToken();
        // Повторяем запрос с новым токеном
        response = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...options.headers
          }
        });
      } catch (refreshError) {
        console.error('Failed to refresh token, authentication required.', refreshError);
        // Не перенаправляем, а просто возвращаем оригинальный ответ 401
        // чтобы вызывающий код мог его обработать
        return response;
      }
    }

    return response;
  }

  /**
   * Обработка ошибок AI запросов с проверкой на нехватку кредитов
   */
  private async handleAIError(response: Response, defaultMessage: string): Promise<never> {
    if (response.status === 402) {
      // Статус 402 - нехватка кредитов
      let message = 'You need more credits to generate AI content';

      try {
        const errorData = await response.json();
        message = errorData.message || message;
      } catch (parseError) {
        // Если не удалось распарсить ответ, используем стандартное сообщение
        console.warn('Failed to parse error response:', parseError);
      }

      // Импортируем и показываем уведомление
      try {
        const {getNotificationManager} = await import('../components/Notifications');
        getNotificationManager().showError(message, false, 3000);
      } catch (notificationError) {
        console.error('Failed to show notification:', notificationError);
      }

      throw new InsufficientCreditsError(message);
    }

    // Для других ошибок возвращаем стандартное сообщение
    throw new Error(defaultMessage);
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С ПРОЕКТАМИ ===

  async getProjects(): Promise<Project[]> {
    const response = await this.fetchWithAuth(`${API_URL}/projects`);

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data: ProjectsResponse = await response.json();
    return data.projects;
  }

  async createProject(data: CreateProjectPayload): Promise<Project> {
    const response = await this.fetchWithAuth(`${API_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to create project');
    }

    const result = await response.json();
    // Бекенд возвращает {message: "Project was created", project}
    return result.project;
  }

  async updateProject(id: string, name: string): Promise<Project> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({name})
    });

    if (!response.ok) {
      throw new Error('Failed to update project');
    }

    const result = await response.json();
    // Бекенд возвращает {message: "Проект обновлен", project}
    return result.project;
  }

  async deleteProject(id: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  }

  async duplicateProject(id: string): Promise<Project> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${id}/duplicate`, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to duplicate project');
    }

    const result = await response.json();
    return result.project;
  }

  /**
   * Получает данные проекта с сервера
   * @param projectId ID проекта
   * @returns Данные проекта
   */
  async getProjectData(projectId: string): Promise<ProjectData> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/data`);

    if (!response.ok) {
      throw new Error('Failed to fetch project data');
    }

    const result: ProjectDataResponse = await response.json();
    return result.data;
  }

  /**
   * Сохраняет данные проекта на сервер
   * @param projectId ID проекта
   * @param data Данные для сохранения
   * @returns Обновленный проект
   */
  async saveProjectData(projectId: string, data: ProjectData): Promise<Project> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/data`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to save project data');
    }

    const result = await response.json();
    return result.project;
  }

  /**
   * Синхронизирует операции с сервером
   * @param projectId ID проекта
   * @param batch Пакет операций для синхронизации
   * @returns Результат синхронизации
   */
  async syncOperations(projectId: string, batch: any): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/ops`, {
      method: 'POST',
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Sync operations failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to sync operations with status: ${response.status}`);
    }

    return await response.json();
  }

  async getOperations(projectId: string, sinceVersion: number): Promise<ISyncResult> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/operations?since=${sinceVersion}`);

    if (!response.ok) {
      throw new Error('Failed to fetch operations');
    }

    return await response.json();
  }

  async getProjectGraphSnapshot(projectId: string): Promise<GraphSnapshotResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/snapshot`);

    if (!response.ok) {
      throw new Error('Failed to fetch project graph snapshot');
    }

    return await response.json();
  }

  /**
   * Импортирует данные в существующий проект
   * @param projectId ID проекта для импорта
   * @param data Данные для импорта
   * @param timelineId ID таймлайна для импорта (опционально)
   * @returns Обновленный проект
   */
  async importToProject(projectId: string, data: any, timelineId?: string): Promise<Project> {
    const body: any = {data};
    if (timelineId) {
      body.timelineId = timelineId;
    }

    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/import`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to import to project');
    }

    const result = await response.json();
    return result.project;
  }

  // === МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ КОМАНДАМИ ===

  /**
   * Получить список команд пользователя
   */
  async getUserTeams(): Promise<Team[]> {
    const response = await this.fetchWithAuth(`${API_URL}/teams`);

    if (!response.ok) {
      throw new Error('Failed to fetch user teams');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: [...]}
    return result.data || [];
  }

  /**
   * Получить команду по ID
   */
  async getTeam(teamId: string): Promise<Team & {members: TeamMember[]; invitations: TeamInvitation[]}> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch team');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Создать новую команду
   */
  async createTeam(teamData: CreateTeamRequest): Promise<Team> {
    const response = await this.fetchWithAuth(`${API_URL}/teams`, {
      method: 'POST',
      body: JSON.stringify(teamData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create team');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: team, message: "..."}
    return result.data;
  }

  /**
   * Обновить команду
   */
  async updateTeam(teamId: string, teamData: Partial<CreateTeamRequest>): Promise<Team> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    });

    if (!response.ok) {
      throw new Error('Failed to update team');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: team, message: "..."}
    return result.data;
  }

  /**
   * Удалить команду
   */
  async deleteTeam(teamId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete team');
    }
  }

  // === МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ УЧАСТНИКАМИ ===

  /**
   * Получить участников команды
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members`);

    if (!response.ok) {
      throw new Error('Failed to fetch team members');
    }

    const result = await response.json();
    return result.data || [];
  }

  /**
   * Получить приглашения команды
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/invitations`);

    if (!response.ok) {
      throw new Error('Failed to fetch team invitations');
    }

    const result = await response.json();
    return result.data || [];
  }

  /**
   * Пригласить участника в команду
   */
  async inviteMember(teamId: string, inviteData: InviteMemberRequest): Promise<TeamInvitation> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members/invite`, {
      method: 'POST',
      body: JSON.stringify(inviteData)
    });

    if (!response.ok) {
      throw new Error('Failed to invite member');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: invitation, message: "..."}
    return result.data;
  }

  /**
   * Обновить роль участника
   */
  async updateMemberRole(teamId: string, updateData: UpdateMemberRoleRequest): Promise<TeamMember> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members/${updateData.memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({role: updateData.role})
    });

    if (!response.ok) {
      throw new Error('Failed to update member role');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: member, message: "..."}
    return result.data;
  }

  /**
   * Удалить участника из команды
   */
  async removeMember(teamId: string, memberId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to remove member');
    }
  }

  /**
   * Обновить доступ к ИИ для участника команды
   */
  async updateMemberAIAccess(teamId: string, memberId: string, hasAIAccess: boolean): Promise<TeamMember> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members/${memberId}/ai-access`, {
      method: 'PUT',
      body: JSON.stringify({hasAIAccess})
    });

    if (!response.ok) {
      throw new Error('Failed to update member AI access');
    }

    return response.json();
  }

  /**
   * Проверить доступ к ИИ для текущего пользователя в команде
   */
  async checkMemberAIAccess(teamId: string): Promise<{hasAIAccess: boolean}> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/ai-access`);

    if (!response.ok) {
      throw new Error('Failed to check member AI access');
    }

    const result = await response.json();
    // API возвращает { success: true, data: { hasAIAccess: boolean } }
    return result.data;
  }

  /**
   * Деактивировать участника
   */
  async deactivateMember(teamId: string, memberId: string): Promise<TeamMember> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members/${memberId}/deactivate`, {
      method: 'PUT'
    });

    if (!response.ok) {
      throw new Error('Failed to deactivate member');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: member}
    return result.data;
  }

  /**
   * Реактивировать участника
   */
  async reactivateMember(teamId: string, memberId: string): Promise<TeamMember> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/members/${memberId}/reactivate`, {
      method: 'PUT'
    });

    if (!response.ok) {
      throw new Error('Failed to reactivate member');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: member}
    return result.data;
  }

  // === МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ ПРИГЛАШЕНИЯМИ ===

  /**
   * Принять приглашение в команду
   */
  async acceptInvitation(token: string): Promise<TeamMember> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/invitations/${token}/accept`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to accept invitation');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: team}
    return result.data;
  }

  /**
   * Отклонить приглашение в команду
   */
  async declineInvitation(token: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/invitations/${token}/decline`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to decline invitation');
    }
  }

  /**
   * Отозвать приглашение
   */
  async revokeInvitation(teamId: string, invitationId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/invitations/${invitationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to revoke invitation');
    }
  }

  // === МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ ПРОЕКТАМИ КОМАНДЫ ===

  /**
   * Получить проекты команды
   */
  async getTeamProjects(teamId: string): Promise<TeamProjectWithDetails[]> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/projects`);

    if (!response.ok) {
      throw new Error('Failed to fetch team projects');
    }

    const result: TeamProjectsResponse = await response.json();
    return result.data || [];
  }

  /**
   * Добавить проект в команду
   */
  async addProjectToTeam(teamId: string, projectData: {projectId: string; accessLevel: string}): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/projects`, {
      method: 'POST',
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      // Специальная обработка ошибки лимита проектов
      if (response.status === 403 && errorData?.code === 'FREE_PROJECTS_LIMIT') {
        const error = new Error(errorData.error || 'Превышен лимит бесплатных проектов') as Error & {code: string};
        error.code = 'FREE_PROJECTS_LIMIT';
        throw error;
      }

      throw new Error(errorData?.error || 'Failed to add project to team');
    }
  }

  /**
   * Добавить участника в проект
   */
  async addProjectMember(teamId: string, projectData: AddProjectMemberRequest): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/projects/${projectData.projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({
        userId: projectData.userId,
        role: projectData.role
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add project member');
    }
  }

  /**
   * Удалить участника из проекта
   */
  async removeProjectMember(teamId: string, projectId: string, userId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to remove project member');
    }
  }

  /**
   * Обновить уровень доступа к проекту
   */
  async updateProjectAccess(teamId: string, projectData: UpdateProjectAccessRequest): Promise<TeamProject> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/projects/${projectData.projectId}`, {
      method: 'PUT',
      body: JSON.stringify({
        accessLevel: projectData.accessLevel
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update project access');
    }

    const result = await response.json();
    // Бекенд возвращает {success: true, data: teamProject}
    return result.data;
  }

  // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===

  /**
   * Получить статистику команды
   */
  async getTeamStats(teamId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    totalProjects: number;
    recentActivity: any[];
  }> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch team stats');
    }

    return await response.json();
  }

  /**
   * Получить активность команды
   */
  async getTeamActivity(teamId: string, limit: number = 20): Promise<any[]> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/activity?limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch team activity');
    }

    const data = await response.json();
    return data.activities;
  }

  async getUserRole(teamId: string): Promise<{role: string} | null> {
    const response = await this.fetchWithAuth(`${API_URL}/teams/${teamId}/role`);
    if (!response.ok) {
      // Если 404, значит пользователь не в команде, это не ошибка
      if (response.status === 404) return null;
      throw new Error('Failed to fetch user role');
    }
    const result = await response.json();
    return result.data;
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С ИНФОРМАЦИЕЙ О ПРОЕКТЕ ===

  /**
   * Получение информации о проекте
   */
  async getProjectInfo(projectId: string): Promise<ProjectInfo | null> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/info`);

    if (response.status === 404) {
      return null; // Информация о проекте не найдена
    }

    if (!response.ok) {
      throw new Error('Failed to fetch project info');
    }

    const result: ProjectInfoResponse = await response.json();
    return result.data;
  }

  /**
   * Создание информации о проекте
   */
  async createProjectInfo(projectId: string, data: CreateProjectInfoDto): Promise<ProjectInfo> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/info`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create project info');
    }

    const result: ProjectInfoResponse = await response.json();
    return result.data;
  }

  /**
   * Обновление информации о проекте
   */
  async updateProjectInfo(projectId: string, data: UpdateProjectInfoDto): Promise<ProjectInfo> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/info`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update project info');
    }

    const result: ProjectInfoResponse = await response.json();
    return result.data;
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С КАЧЕСТВОМ БИБЛИИ ===

  /**
   * Получение оценки качества библии проекта
   */
  async getBibleQuality(projectId: string): Promise<BibleQualityScore | null> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/bible-quality`);

    if (response.status === 404) {
      return null; // Оценка качества не найдена
    }

    if (!response.ok) {
      throw new Error('Failed to fetch bible quality');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Пересчет оценки качества библии проекта
   */
  async recalculateBibleQuality(projectId: string): Promise<BibleQualityScore> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/bible-quality/recalculate`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to recalculate bible quality');
    }

    const result = await response.json();
    return result.data;
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С СУЩНОСТЯМИ ===

  // Типы сущностей

  /**
   * Получение всех типов сущностей проекта
   */
  async getEntityTypes(projectId: string, query?: EntityTypesQueryParams): Promise<EntityType[]> {
    const url = new URL(`${API_URL}/projects/${projectId}/entity-types`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await this.fetchWithAuth(url.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch entity types');
    }

    const result: EntityTypesResponse = await response.json();
    return result.data;
  }

  /**
   * Получение типа сущности по ID
   */
  async getEntityType(projectId: string, typeId: string): Promise<EntityType> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entity-types/${typeId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch entity type');
    }

    const result: EntityTypeResponse = await response.json();
    return result.data;
  }

  /**
   * Создание типа сущности
   */
  async createEntityType(projectId: string, data: CreateEntityTypeDto): Promise<EntityType> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entity-types`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create entity type');
    }

    const result: EntityTypeResponse = await response.json();
    return result.data;
  }

  /**
   * Обновление типа сущности
   */
  async updateEntityType(projectId: string, typeId: string, data: UpdateEntityTypeDto): Promise<EntityType> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entity-types/${typeId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update entity type');
    }

    const result: EntityTypeResponse = await response.json();
    return result.data;
  }

  /**
   * Удаление типа сущности
   */
  async deleteEntityType(projectId: string, typeId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entity-types/${typeId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete entity type');
    }
  }

  /**
   * Добавление параметра к типу сущности
   */
  async addParameterToType(projectId: string, typeId: string, data: EntityTypeParameterDto): Promise<EntityTypeParameter> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entity-types/${typeId}/parameters`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to add parameter to type');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Удаление параметра из типа сущности
   */
  async removeParameterFromType(projectId: string, typeId: string, parameterId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entity-types/${typeId}/parameters/${parameterId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to remove parameter from type');
    }
  }

  // Параметры сущностей

  /**
   * Получение всех параметров проекта
   */
  async getEntityParameters(projectId: string, query?: ParametersQueryParams): Promise<EntityParameter[]> {
    const url = new URL(`${API_URL}/projects/${projectId}/entities/parameters`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await this.fetchWithAuth(url.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch entity parameters');
    }

    const result: EntityParametersResponse = await response.json();
    return result.data;
  }

  /**
   * Получение параметра по ID
   */
  async getEntityParameter(projectId: string, parameterId: string): Promise<EntityParameter> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/parameters/${parameterId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch entity parameter');
    }

    const result: EntityParameterResponse = await response.json();
    return result.data;
  }

  /**
   * Создание параметра сущности
   */
  async createEntityParameter(projectId: string, data: CreateEntityParameterDto): Promise<EntityParameter> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/parameters`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create entity parameter');
    }

    const result: EntityParameterResponse = await response.json();
    return result.data;
  }

  /**
   * Обновление параметра сущности
   */
  async updateEntityParameter(projectId: string, parameterId: string, data: UpdateEntityParameterDto): Promise<EntityParameter> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/parameters/${parameterId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update entity parameter');
    }

    const result: EntityParameterResponse = await response.json();
    return result.data;
  }

  /**
   * Удаление параметра сущности
   */
  async deleteEntityParameter(projectId: string, parameterId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/parameters/${parameterId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete entity parameter');
    }
  }

  // Сущности

  /**
   * Получение всех сущностей проекта
   */
  async getEntities(projectId: string, query?: EntitiesQueryParams): Promise<{entities: Entity[]; pagination?: any}> {
    const url = new URL(`${API_URL}/projects/${projectId}/entities`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await this.fetchWithAuth(url.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch entities');
    }

    const result: EntitiesResponse = await response.json();
    return {
      entities: result.data,
      pagination: result.pagination
    };
  }

  /**
   * Получение сущности по ID
   */
  async getEntity(projectId: string, entityId: string, includeOriginalImages: boolean = false): Promise<Entity> {
    const url = new URL(`${API_URL}/projects/${projectId}/entities/${entityId}`);
    if (!includeOriginalImages) {
      url.searchParams.append('includeOriginalImages', 'false');
    }

    const response = await this.fetchWithAuth(url.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch entity');
    }

    const result: EntityResponse = await response.json();
    return result.data;
  }

  /**
   * Создание сущности
   */
  async createEntity(projectId: string, data: CreateEntityDto): Promise<Entity> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create entity');
    }

    const result: EntityResponse = await response.json();
    return result.data;
  }

  /**
   * Обновление сущности
   */
  async updateEntity(projectId: string, entityId: string, data: UpdateEntityDto): Promise<Entity> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update entity');
    }

    const result: EntityResponse = await response.json();
    return result.data;
  }

  /**
   * Удаление сущности
   */
  async deleteEntity(projectId: string, entityId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/${entityId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete entity');
    }
  }

  /**
   * Обновление значений параметров сущности
   */
  async updateEntityValues(projectId: string, entityId: string, data: UpdateEntityValuesDto): Promise<Entity> {
    const response = await this.fetchWithAuth(`${API_URL}/projects/${projectId}/entities/${entityId}/values`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update entity values');
    }

    const result: EntityResponse = await response.json();
    return result.data;
  }

  // ============= ШАБЛОНЫ ПРОЕКТОВ =============

  /**
   * Получение всех шаблонов проектов
   */
  async getProjectTemplates(params?: {categories?: string[]; includeInactive?: boolean; includeDefault?: boolean; language?: string}): Promise<ProjectTemplate[]> {
    const queryParams = new URLSearchParams();

    if (params?.categories && params.categories.length > 0) {
      params.categories.forEach((cat) => queryParams.append('categories', cat));
    }
    if (params?.includeInactive !== undefined) {
      queryParams.append('includeInactive', params.includeInactive.toString());
    }
    if (params?.includeDefault !== undefined) {
      queryParams.append('includeDefault', params.includeDefault.toString());
    }
    if (params?.language) {
      queryParams.append('language', params.language);
    }

    const url = `${API_URL}/project-templates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error('Failed to fetch project templates');
    }

    const result: ProjectTemplatesResponse = await response.json();
    return result.data;
  }

  /**
   * Получение шаблона по ID
   */
  async getProjectTemplate(templateId: string, language?: string): Promise<ProjectTemplate> {
    const queryParams = new URLSearchParams();
    if (language) {
      queryParams.append('language', language);
    }

    const url = `${API_URL}/project-templates/${templateId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error('Failed to fetch project template');
    }

    const result: ProjectTemplateResponse = await response.json();
    return result.data;
  }

  // === AI МЕТОДЫ ===

  /**
   * Получение настроек AI пользователя
   */
  async getAISettings() {
    const response = await this.fetchWithAuth(`${API_URL}/ai/settings`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI settings');
    }
    return response.json();
  }

  /**
   * Обновление настроек AI пользователя
   */
  async updateAISettings(settings: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      throw new Error('Failed to update AI settings');
    }
    return response.json();
  }
  /**
   * Принятие AI предложения
   */
  async acceptAISuggestion(suggestionId: string, feedback?: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/suggestions/${suggestionId}/accept`, {
      method: 'POST',
      body: JSON.stringify({feedback})
    });
    if (!response.ok) {
      throw new Error('Failed to accept AI suggestion');
    }
    return response.json();
  }

  /**
   * Отклонение AI предложения
   */
  async rejectAISuggestion(suggestionId: string, feedback?: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/suggestions/${suggestionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({feedback})
    });
    if (!response.ok) {
      throw new Error('Failed to reject AI suggestion');
    }
    return response.json();
  }

  /**
   * Получение истории AI предложений
   */
  async getAISuggestionsHistory(projectId?: string, limit: number = 20, offset: number = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (projectId) {
      params.append('projectId', projectId);
    }

    const response = await this.fetchWithAuth(`${API_URL}/ai/suggestions/history?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI suggestions history');
    }
    return response.json();
  }

  /**
   * Получение баланса кредитов
   */
  async getAICreditsBalance() {
    const response = await this.fetchWithAuth(`${API_URL}/ai/credits`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI credits balance');
    }
    return response.json();
  }

  /**
   * Генерация контента для полей библии проекта через новый пайплайн
   */
  async generateProjectBibleWithPipeline(projectId: string, fieldType: string, baseDescription?: string) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/project-bible-field-v2`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        fieldType,
        baseDescription
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to generate project bible content via pipeline');
    }
    return response.json();
  }

  /**
   * Комплексная генерация всей библии проекта
   */
  async generateComprehensiveBible(projectId: string, baseDescription: string) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/${projectId}/generate-comprehensive-bible`, {
      method: 'POST',
      body: JSON.stringify({
        baseDescription
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to generate comprehensive bible');
    }
    return response.json();
  }

  /**
   * Получение структуры пайплайна
   * @param type - тип пайплайна (entity_generation, comprehensive_bible, entity_image_generation)
   */
  async getPipelineStructure(type: 'entity_generation' | 'comprehensive_bible' | 'entity_image_generation' = 'comprehensive_bible') {
    const response = await this.fetchWithAuth(`${API_URL}/ai/pipeline/structure?type=${type}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pipeline structure');
    }
    return response.json();
  }

  // 🆕 ===== AI DEBUG API =====

  /**
   * Получение настроек дебаг режима
   */
  async getAIDebugSettings() {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/settings`);
    if (!response.ok) {
      throw new Error('Failed to fetch debug settings');
    }
    return response.json();
  }

  /**
   * Обновление настроек дебаг режима
   */
  async updateAIDebugSettings(settings: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      throw new Error('Failed to update debug settings');
    }
    return response.json();
  }

  /**
   * Получение всех промптов
   */
  async getAllAIPrompts() {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/prompts`);
    if (!response.ok) {
      throw new Error('Failed to fetch prompts');
    }
    return response.json();
  }

  /**
   * Создание нового промпта
   */
  async createAIPrompt(promptData: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    });
    if (!response.ok) {
      throw new Error('Failed to create prompt');
    }
    return response.json();
  }

  /**
   * Обновление промпта
   */
  async updateAIPrompt(promptKey: string, promptData: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/prompts/${promptKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    });
    if (!response.ok) {
      throw new Error('Failed to update prompt');
    }
    return response.json();
  }

  /**
   * Предварительный просмотр промпта
   */
  async previewAIPrompt(promptKey: string, variables: any) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/prompts/${promptKey}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({variables})
    });
    if (!response.ok) {
      throw new Error('Failed to preview prompt');
    }
    return response.json();
  }

  /**
   * Очистка кеша промптов
   */
  async clearAIPromptCache() {
    const response = await this.fetchWithAuth(`${API_URL}/ai/debug/cache/clear`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to clear cache');
    }
    return response.json();
  }

  // === AI ENTITY GENERATION ===

  /**
   * Генерация сущности с помощью ИИ
   */
  async generateEntityWithAI(projectId: string, userDescription: string, preferredEntityType?: string) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/v3/entity/generate`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        userDescription,
        preferredEntityType
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to generate entity with AI');
    }
    return response.json();
  }

  /**
   * Получение доступных типов сущностей для проекта
   */
  async getAvailableEntityTypes(projectId: string) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/entity/types/${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch available entity types');
    }
    return response.json();
  }

  /**
   * Оценка стоимости и времени генерации сущности
   */
  async estimateEntityGeneration(projectId: string, userDescription: string, preferredEntityType?: string) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/entity/estimate`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        userDescription,
        preferredEntityType
      })
    });
    if (!response.ok) {
      throw new Error('Failed to estimate entity generation');
    }
    return response.json();
  }

  /**
   * Генерация изображения для сущности с помощью ИИ
   */
  async generateEntityImage(
    projectId: string,
    entityId: string,
    options: {
      customPrompt?: string;
      aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
      safetyFilterLevel?: 'minimal' | 'standard' | 'strict';
    } = {}
  ) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/entity/generate-image`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        entityId,
        ...options
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to generate entity image');
    }
    return response.json();
  }

  /**
   * Генерация изображения для сущности с использованием пайплайна
   */
  async generateEntityImageWithPipeline(
    projectId: string,
    entityId: string,
    options: {
      customPromptRequirements?: string[];
      imageProvider?: 'gemini' | 'openai';
      imageQuality?: 'low' | 'medium' | 'high' | 'auto';
      userSettings?: {
        preferredProvider?: string;
        preferredModel?: string;
        creativityLevel?: number;
      };
    } = {}
  ) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/entity/generate-image-pipeline`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        entityId,
        ...options
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to generate entity image with pipeline');
    }
    return response.json();
  }

  /**
   * Перевод нарративного узла через пайплайн v2
   */
  async translateNodeWithPipeline(
    projectId: string,
    nodeId: string,
    options: {
      sourceLanguage: string;
      targetLanguage: string;
      precedingContext?: string;
      followingContext?: string;
      translationStyle?: 'literal' | 'adaptive' | 'creative';
      preserveMarkup?: boolean;
      qualityLevel?: 'fast' | 'standard' | 'expert';
      additionalRequirements?: string;
    }
  ) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/translation/node-pipeline`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        nodeId,
        ...options
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to translate node with pipeline');
    }
    return response.json();
  }

  async estimateBatchTranslation(
    projectId: string,
    timelineId: string,
    options: {
      targetLanguage: string;
      qualityLevel?: 'fast' | 'standard' | 'expert';
      skipExisting?: boolean;
    }
  ) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/translation/batch-estimate`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        timelineId,
        ...options
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to estimate batch translation');
    }
    return response.json();
  }

  async batchTranslateTimeline(
    projectId: string,
    timelineId: string,
    options: {
      sourceLanguage: string;
      targetLanguage: string;
      translationStyle?: 'literal' | 'adaptive' | 'creative';
      preserveMarkup?: boolean;
      qualityLevel?: 'fast' | 'standard' | 'expert';
      skipExisting?: boolean;
      additionalRequirements?: string;
    }
  ) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/translation/batch-timeline`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        timelineId,
        ...options
      })
    });
    if (!response.ok) {
      await this.handleAIError(response, 'Failed to batch translate timeline');
    }
    return response.json();
  }

  // Отменить пакетный перевод
  async cancelBatchTranslation(sessionId: string, projectId: string): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/ai/translation/batch-cancel`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        projectId
      })
    });

    if (!response.ok) {
      await this.handleAIError(response, 'Failed to cancel batch translation');
    }
    return response.json();
  }

  async updateTranslation(
    localizationId: string,
    update: {
      localizationId: string;
      translatedText: string;
      method: string;
      quality?: number;
    }
  ) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/translations/${localizationId}`, {
      method: 'PUT',
      body: JSON.stringify(update)
    });
    if (!response.ok) {
      throw new Error('Failed to update translation');
    }
    return response.json();
  }

  async deleteTranslation(localizationId: string) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/translations/${localizationId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete translation');
    }
    return response.json();
  }

  async approveTranslation(localizationId: string) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/translations/${localizationId}/approve`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to approve translation');
    }
    return response.json();
  }

  async protectTranslation(localizationId: string) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/translations/${localizationId}/protect`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to protect translation');
    }
    return response.json();
  }

  async unprotectTranslation(localizationId: string) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/translations/${localizationId}/protect`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to unprotect translation');
    }
    return response.json();
  }

  // === BULK OPERATIONS ===

  async bulkApproveTranslations(localizationIds: string[]) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/bulk/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({localizationIds})
    });
    if (!response.ok) {
      throw new Error('Failed to bulk approve translations');
    }
    return response.json();
  }

  async bulkProtectTranslations(localizationIds: string[]) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/bulk/protect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({localizationIds})
    });
    if (!response.ok) {
      throw new Error('Failed to bulk protect translations');
    }
    return response.json();
  }

  async bulkUnprotectTranslations(localizationIds: string[]) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/bulk/protect`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({localizationIds})
    });
    if (!response.ok) {
      throw new Error('Failed to bulk unprotect translations');
    }
    return response.json();
  }

  async bulkDeleteTranslations(localizationIds: string[]) {
    const response = await this.fetchWithAuth(`${API_URL}/localization/bulk/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({localizationIds})
    });
    if (!response.ok) {
      throw new Error('Failed to bulk delete translations');
    }
    return response.json();
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С ТАЙМЛАЙНАМИ ===

  /**
   * Получить список таймлайнов проекта
   */
  async getProjectTimelines(params: TimelinesQueryParams): Promise<Timeline[]> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await this.fetchWithAuth(`${API_URL}/api/projects/${params.projectId}/timelines?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch project timelines');
    }

    return response.json();
  }

  /**
   * Получить таймлайн по ID
   */
  async getTimeline(timelineId: string): Promise<Timeline> {
    const response = await this.fetchWithAuth(`${API_URL}/api/timelines/${timelineId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch timeline');
    }

    return response.json();
  }

  /**
   * Создать новый таймлайн
   */
  async createTimeline(data: CreateTimelineDto): Promise<Timeline> {
    const response = await this.fetchWithAuth(`${API_URL}/api/projects/${data.projectId}/timelines`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create timeline');
    }

    return response.json();
  }

  /**
   * Обновить таймлайн
   */
  async updateTimeline(timelineId: string, data: UpdateTimelineDto): Promise<Timeline> {
    const response = await this.fetchWithAuth(`${API_URL}/api/timelines/${timelineId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update timeline');
    }

    return response.json();
  }

  /**
   * Удалить таймлайн
   */
  async deleteTimeline(timelineId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/api/timelines/${timelineId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete timeline');
    }
  }

  /**
   * Дублировать таймлайн
   */
  async duplicateTimeline(timelineId: string, newName: string): Promise<Timeline> {
    const response = await this.fetchWithAuth(`${API_URL}/api/timelines/${timelineId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({name: newName})
    });

    if (!response.ok) {
      throw new Error('Failed to duplicate timeline');
    }

    return response.json();
  }

  /**
   * Переключить активный таймлайн
   */
  async switchActiveTimeline(timelineId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/api/timelines/${timelineId}/activate`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to switch active timeline');
    }
  }

  /**
   * Заполнить нарративный узел текстом с помощью AI пайплайна v2
   */
  async fillNarrativeNodeWithAI(request: {
    nodeData: {
      id: string;
      title: string;
      existingText?: string;
      attachedEntities?: string[];
      position?: {x: number; y: number};
    };
    precedingNodes: Array<{
      order: number;
      id: string;
      type: 'narrative' | 'choice';
      text: string;
      entities?: string[];
    }>;
    generationOptions?: {
      targetLength?: 'auto' | 'short' | 'medium' | 'long';
      preferredTone?: 'auto' | 'dramatic' | 'comedic' | 'mysterious' | 'neutral' | 'action';
      contentRating?: 'G' | 'PG' | 'PG-13' | 'R';
    };
    customPromptRequirements?: string[];
  }) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/canvas/fill-text`, {
      method: 'POST',
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      await this.handleAIError(response, 'Failed to fill narrative node with AI text');
    }

    return response.json();
  }

  /**
   * Генерация следующего узла с помощью AI пайплайна v2
   */
  async generateNextNodeWithAI(request: {
    nodeData: {
      id: string;
      title?: string;
      projectId?: string;
    };
    precedingNodes: Array<{
      order: number;
      id: string;
      type: 'narrative' | 'choice';
      text: string;
      entities?: string[];
    }>;
    generationOptions?: {
      nodeCount?: number;
      targetLength?: 'auto' | 'short' | 'medium' | 'long';
      preferredTone?: 'auto' | 'dramatic' | 'comedic' | 'mysterious' | 'neutral' | 'action';
      includeChoices?: boolean;
      includeEntitySuggestions?: boolean;
    };
    projectId?: string;
  }) {
    const response = await this.fetchWithAuth(`${API_URL}/ai/canvas/next-node`, {
      method: 'POST',
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      await this.handleAIError(response, 'Failed to generate next node with AI pipeline');
    }

    return response.json();
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С БИЛЛИНГОМ ===

  /**
   * Получение доступных продуктов и цен
   */
  async getBillingProducts(): Promise<StripeProduct[]> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/products`);

    if (!response.ok) {
      throw new Error('Failed to fetch billing products');
    }

    const result: ProductsResponse = await response.json();
    return result.data;
  }

  /**
   * Получение баланса кредитов пользователя
   */
  async getUserCredits(): Promise<CreditBalance> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/credits`);

    if (!response.ok) {
      throw new Error('Failed to fetch user credits');
    }

    const result: CreditsResponse = await response.json();
    return result.data;
  }

  /**
   * Получение командных кредитов для Team тарифов (только для админов/менеджеров/владельцев)
   */
  async getTeamCredits(teamId: string): Promise<TeamCreditBalance | null> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/teams/${teamId}/credits`);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Нет прав для просмотра командных кредитов');
      }
      throw new Error('Failed to fetch team credits');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Получение истории транзакций командных кредитов (только для админов/менеджеров/владельцев)
   */
  async getTeamCreditTransactions(teamId: string, limit: number = 50): Promise<CreditTransaction[]> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/teams/${teamId}/credits/transactions?limit=${limit}`);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Нет прав для просмотра истории командных кредитов');
      }
      throw new Error('Failed to fetch team credit transactions');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Получение истории транзакций кредитов
   */
  async getCreditTransactions(limit: number = 50): Promise<CreditTransaction[]> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/credits/transactions?limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch credit transactions');
    }

    const result: CreditTransactionsResponse = await response.json();
    return result.transactions;
  }

  /**
   * Получение подписок пользователя
   */
  async getUserSubscriptions(): Promise<Subscription[]> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/subscriptions`);

    if (!response.ok) {
      throw new Error('Failed to fetch user subscriptions');
    }

    const result: SubscriptionsResponse = await response.json();
    return result.data;
  }

  /**
   * Получение подписок команды
   */
  async getTeamSubscriptions(teamId: string): Promise<Subscription[]> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/teams/${teamId}/subscriptions`);

    if (!response.ok) {
      throw new Error('Failed to fetch team subscriptions');
    }

    const result: SubscriptionsResponse = await response.json();
    return result.data;
  }

  /**
   * Получение истории покупок пользователя
   */
  async getUserPurchases(limit: number = 10): Promise<Purchase[]> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/purchases?limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user purchases');
    }

    const result: PurchasesResponse = await response.json();
    return result.data;
  }

  /**
   * Создание Checkout Session для подписки
   */
  async createSubscriptionCheckout(data: CreateCheckoutRequest): Promise<{sessionId: string; url: string}> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/checkout/subscription`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription checkout');
    }

    const result: CreateCheckoutResponse = await response.json();
    return result.data;
  }

  /**
   * Создание Checkout Session для разовой покупки
   */
  async createOneTimePurchaseCheckout(data: CreateCheckoutRequest): Promise<{sessionId: string; url: string}> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/checkout/purchase`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create purchase checkout');
    }

    const result: CreateCheckoutResponse = await response.json();
    return result.data;
  }

  /**
   * Отмена подписки
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Возобновление подписки
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/subscriptions/${subscriptionId}/resume`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to resume subscription');
    }
  }

  /**
   * Получение Stripe Customer ID для текущего пользователя
   */
  async getStripeCustomerId(): Promise<{customerId: string | null}> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/customer-id`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to get customer ID');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Создание сессии Customer Portal для управления подписками
   */
  async createCustomerPortalSession(): Promise<{url: string}> {
    const response = await this.fetchWithAuth(`${API_URL}/payments/customer-portal`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to create customer portal session');
    }

    const result = await response.json();
    return result.data;
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С ЦЕНАМИ ПАЙПЛАЙНОВ ===

  /**
   * Получение конфигурации цен всех пайплайнов
   */
  async getPipelinesPricing(): Promise<{
    version: string;
    generatedAt: number;
    pipelines: Record<
      string,
      {
        id: string;
        category: string;
        credits: number;
        metadata: {
          estimatedDuration: number;
          operationsCount: number;
        };
      }
    >;
    statistics: {
      totalPipelines: number;
      categories: string[];
    };
  }> {
    const response = await this.fetchWithAuth(`${API_URL}/ai/pricing/pipelines`);

    if (!response.ok) {
      throw new Error('Failed to fetch pipelines pricing');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Получение детальной информации о ценах конкретного пайплайна
   */
  async getPipelinePricing(pipelineId: string): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/ai/pricing/pipelines/${pipelineId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch pipeline pricing');
    }

    const result = await response.json();
    return result.data;
  }

  // ============= GCS ИЗОБРАЖЕНИЯ =============

  /**
   * Загрузка изображения в GCS
   */
  async uploadImageGCS(data: {
    teamId: string;
    projectId: string;
    entityId: string;
    parameterId: string;
    imageData: string;
    filename: string;
    aiMetadata?: {
      isAIGenerated?: boolean;
      aiProvider?: 'openai' | 'gemini' | 'anthropic';
      aiModel?: string;
      generatedAt?: Date;
    };
  }): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/images/upload`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image to GCS');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Получение signed URLs для больших изображений
   */
  async getImageSignedUrls(data: {
    teamId: string;
    projectId: string;
    imageIds: Array<{
      entityId: string;
      parameterId: string;
      version: 'original' | 'optimized' | 'thumbnail';
    }>;
    ttl?: number;
  }): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/images/access-tokens`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get signed URLs');
    }

    return await response.json();
  }

  /**
   * Batch доступ к изображениям
   */
  async getBatchImageAccess(data: {teamId: string; projectId: string; entityIds: string[]; types: Array<'original' | 'optimized' | 'thumbnail'>; ttl?: number}): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/images/batch-access`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get batch image access');
    }

    return await response.json();
  }

  /**
   * Удаление изображения из GCS
   */
  async deleteImageGCS(teamId: string, projectId: string, entityId: string, parameterId: string): Promise<any> {
    const response = await this.fetchWithAuth(`${API_URL}/images/${teamId}/${projectId}/${entityId}/${parameterId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete image');
    }

    return await response.json();
  }

  /**
   * Получение статистики использования хранилища команды
   */
  async getStorageUsage(teamId: string): Promise<{
    totalSizeBytes: number;
    imageCount: number;
    lastUpdated: string;
  }> {
    const response = await this.fetchWithAuth(`${API_URL}/images/storage-usage/${teamId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get storage usage');
    }

    const result = await response.json();
    return result.data;
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С FEEDBACK ===

  /**
   * Отправка feedback от пользователя
   */
  async sendFeedback(data: {text: string; projectId?: string}): Promise<void> {
    // Получаем версию из package.json (добавляем к каждому запросу)
    const clientVersion = process.env.npm_package_version || '0.3';

    const response = await this.fetchWithAuth(`${API_URL}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        text: data.text,
        projectId: data.projectId,
        clientVersion: `v${clientVersion}`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send feedback');
    }
  }

  /**
   * Получить прямой URL thumbnail через proxy (для интеграции с <img> тегами)
   */
  getThumbnailProxyUrl(teamId: string, projectId: string, entityId: string, parameterId: string, cacheBuster?: string): string {
    const token = localStorage.getItem('auth_token');
    const baseUrl = `${API_URL}/images/proxy/thumbnail/${teamId}/${projectId}/${entityId}/${parameterId}`;

    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (cacheBuster) params.set('v', cacheBuster);

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  // === USAGE ANALYTICS ===

  /**
   * Получить аналитику использования по дням
   */
  async getUsageAnalytics(userId?: string, days: number = 30): Promise<UsageAnalyticsResponse> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    params.set('days', days.toString());

    const response = await this.fetchWithAuth(`${API_URL}/analytics/usage?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch usage analytics');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Получить недавние транзакции
   */
  async getRecentTransactions(userId?: string, limit: number = 20): Promise<RecentTransaction[]> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    params.set('limit', limit.toString());

    const response = await this.fetchWithAuth(`${API_URL}/analytics/recent-transactions?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch recent transactions');
    }

    const data = await response.json();
    return data.data;
  }

  // === SALES ===
  /**
   * Отправляет запрос на продажи (Contact Sales)
   */
  async contactSales(source: string): Promise<void> {
    const currentTeamId = localStorage.getItem('currentTeamId');

    const response = await this.fetchWithAuth(`${API_URL}/sales/contact`, {
      method: 'POST',
      body: JSON.stringify({
        source,
        teamId: currentTeamId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send sales contact request');
    }
  }

  // === NOTEBOOK ===

  /**
   * Создать новую заметку
   */
  async createNote(data: CreateNoteDto): Promise<NoteResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/notes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create note');
    }

    return response.json();
  }

  /**
   * Получить заметки пользователя
   */
  async getNotes(filters?: NotesFilters & PaginationParams): Promise<NotesResponse> {
    const params = new URLSearchParams();

    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.tagIds?.length) params.set('tagIds', filters.tagIds.join(','));
    if (filters?.isPublic !== undefined) params.set('isPublic', filters.isPublic.toString());
    if (filters?.isPinned !== undefined) params.set('isPinned', filters.isPinned.toString());
    if (filters?.search) params.set('search', filters.search);
    if (filters?.offset !== undefined) params.set('offset', filters.offset.toString());
    if (filters?.limit !== undefined) params.set('limit', filters.limit.toString());

    const response = await this.fetchWithAuth(`${API_URL}/notebook/notes?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }

    return response.json();
  }

  /**
   * Получить заметку по ID
   */
  async getNote(noteId: string): Promise<NoteResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/notes/${noteId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch note');
    }

    return response.json();
  }

  /**
   * Обновить заметку
   */
  async updateNote(noteId: string, data: UpdateNoteDto): Promise<NoteResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update note');
    }

    return response.json();
  }

  /**
   * Удалить заметку
   */
  async deleteNote(noteId: string): Promise<{success: boolean; message: string}> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/notes/${noteId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete note');
    }

    return response.json();
  }

  /**
   * Закрепить/открепить заметку
   */
  async togglePinNote(noteId: string): Promise<NoteResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/notes/${noteId}/toggle-pin`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to toggle pin note');
    }

    return response.json();
  }

  /**
   * Создать новый тег
   */
  async createTag(data: CreateTagDto): Promise<TagResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/tags`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create tag');
    }

    return response.json();
  }

  /**
   * Получить теги пользователя
   */
  async getTags(): Promise<TagsResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/tags`);

    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }

    return response.json();
  }

  /**
   * Получить тег по ID
   */
  async getTag(tagId: string): Promise<TagResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/tags/${tagId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch tag');
    }

    return response.json();
  }

  /**
   * Обновить тег
   */
  async updateTag(tagId: string, data: UpdateTagDto): Promise<TagResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update tag');
    }

    return response.json();
  }

  /**
   * Удалить тег
   */
  async deleteTag(tagId: string): Promise<{success: boolean; message: string}> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/tags/${tagId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete tag');
    }

    return response.json();
  }

  /**
   * Получить статистику блокнота
   */
  async getNotebookStats(): Promise<NotebookStatsResponse> {
    const response = await this.fetchWithAuth(`${API_URL}/notebook/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch notebook stats');
    }

    return response.json();
  }
}

export const api = new ApiService();
