'use client';

import {api} from '@services/api';
import {type ProjectAccessLevel, ProjectRole, ProjectTeamMember, Team, TeamInvitation, TeamMember, TeamProject, TeamRole} from '@types-folder/team';
import {create} from 'zustand';

import {isOSS} from '../utils/edition';
import {canAccessProject, canManageMember, canPerformProjectAction, getTeamRolePermissions} from '../utils/teamPermissions';
import {persistTeamId} from '../utils/teamUtils';

// Хранение и загрузка команды из localStorage
const saveTeamToStorage = (team: Team | null) => {
  if (typeof window !== 'undefined') {
    if (team) {
      localStorage.setItem('currentTeam', JSON.stringify(team));
      localStorage.setItem('currentTeamId', team.id);
      // Дополнительное сохранение через утилиту для надежности
      persistTeamId(team.id);
    } else {
      localStorage.removeItem('currentTeam');
      localStorage.removeItem('currentTeamId');
      persistTeamId(null);
    }
  }
};

const loadTeamFromStorage = (): Team | null => {
  if (typeof window !== 'undefined') {
    const savedTeam = localStorage.getItem('currentTeam');
    if (savedTeam) {
      try {
        const parsed = JSON.parse(savedTeam);
        return parsed;
      } catch (error) {
        console.error('💾 loadTeamFromStorage parse error:', error);
        return null;
      }
    }
    return null;
  }
  return null;
};

// Определяем интерфейсы для состояния и действий
interface TeamState {
  userTeams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  teamInvitations: TeamInvitation[];
  teamProjects: TeamProject[];
  isLoading: boolean;
  isInitialized: boolean; // Флаг для отслеживания первоначальной загрузки
  isCreatingTeam: boolean;
  isInvitingMember: boolean;
  isLoadingUserRole: boolean; // Флаг загрузки роли пользователя
  error: string | null;
  currentUserRole: TeamRole | null;
}

interface TeamActions {
  // Базовые действия
  setCurrentTeam: (team: Team | null) => void;
  setUserTeams: (teams: Team[]) => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setTeamInvitations: (invitations: TeamInvitation[]) => void;
  setTeamProjects: (projects: TeamProject[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setCurrentUserRole: (role: TeamRole | null) => void;

  // Инициализация
  initializeFromStorage: () => void;

  // Комплексные действия
  loadUserTeams: () => Promise<void>;
  createTeam: (teamData: {name: string}) => Promise<Team>;
  updateTeam: (teamId: string, teamData: {name: string}) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  switchTeam: (team: Team | null) => void;

  // Участники
  loadTeamMembers: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, inviteData: {email: string; role: TeamRole}) => Promise<void>;
  updateMemberRole: (teamId: string, updateData: {memberId: string; role: TeamRole}) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  deactivateMember: (teamId: string, memberId: string) => Promise<void>;
  reactivateMember: (teamId: string, memberId: string) => Promise<void>;

  // Приглашения
  loadTeamInvitations: (teamId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  declineInvitation: (token: string) => Promise<void>;
  revokeInvitation: (teamId: string, invitationId: string) => Promise<void>;

  // Проекты
  loadTeamProjects: (teamId: string) => Promise<void>;
  addProjectMember: (teamId: string, projectData: {projectId: string; userId: string; role: ProjectRole}) => Promise<void>;
  removeProjectMember: (teamId: string, projectId: string, userId: string) => Promise<void>;
  updateProjectAccess: (teamId: string, projectData: {projectId: string; accessLevel: ProjectAccessLevel}) => Promise<void>;

  // Вычисляемые данные
  getTeamMembersWithPermissions: (currentUserId: string) => (TeamMember & {canBeModified: boolean})[];
  getTeamProjectsWithAccess: (currentUserId: string) => (TeamProject & {canAccess: boolean; canEdit: boolean; canManage: boolean; userRole?: ProjectRole | null})[];
  getCurrentUserTeamRole: (currentUserId: string) => TeamRole | null;
  getCurrentUserPermissions: (currentUserId: string) => ReturnType<typeof getTeamRolePermissions> | null;

  // Утилиты
  clearTeamData: () => void;
  reset: () => void;
  fetchCurrentUserRole: (teamId: string) => Promise<void>;
}

// Начальное состояние
const initialState: TeamState = {
  userTeams: [],
  currentTeam: null,
  teamMembers: [],
  teamInvitations: [],
  teamProjects: [],
  isLoading: false,
  isInitialized: false,
  isCreatingTeam: false,
  isInvitingMember: false,
  isLoadingUserRole: false,
  error: null,
  currentUserRole: null
};

export const useTeamStore = create<TeamState & TeamActions>((set, get) => {
  return {
    ...initialState,

    // === БАЗОВЫЕ ДЕЙСТВИЯ ===
    setCurrentTeam: (team) => {
      set({currentTeam: team, currentUserRole: null, isLoadingUserRole: false});
      saveTeamToStorage(team);
      if (team) {
        get().fetchCurrentUserRole(team.id);
      }
    },
    setUserTeams: (teams) => set({userTeams: teams}),
    setTeamMembers: (members) => set({teamMembers: members}),
    setTeamInvitations: (invitations) => set({teamInvitations: invitations}),
    setTeamProjects: (projects) => set({teamProjects: projects}),
    setLoading: (loading) => set({isLoading: loading}),
    setError: (error) => set({error}),
    clearError: () => set({error: null}),
    setCurrentUserRole: (role) => set({currentUserRole: role}),

    // === ИНИЦИАЛИЗАЦИЯ ===
    initializeFromStorage: () => {
      const savedTeam = loadTeamFromStorage();
      const {currentTeam} = get();

      // Загружаем команду из storage только если её нет или она изменилась
      if (savedTeam && (!currentTeam || currentTeam.id !== savedTeam.id)) {
        set({
          currentTeam: savedTeam,
          teamMembers: savedTeam.members || [],
          teamInvitations: savedTeam.invitations || [],
          currentUserRole: null,
          isLoadingUserRole: false
        });

        // Запускаем загрузку роли только если команда действительно изменилась
        get().fetchCurrentUserRole(savedTeam.id);
      } else {
        console.log('🔧 initializeFromStorage: no action needed', {
          hasSavedTeam: !!savedTeam,
          teamsMatch: savedTeam && currentTeam ? savedTeam.id === currentTeam.id : false
        });
      }
    },

    // === КОМАНДЫ ===
    loadUserTeams: async () => {
      const {isLoading, isInitialized} = get();

      // Предотвращаем повторную загрузку, если она уже идет или была успешно завершена
      if (isLoading || isInitialized) {
        return;
      }

      // В OSS режиме создаём pseudo-team для image storage paths
      if (isOSS()) {
        const ossTeam: Team = {
          id: 'local',
          name: 'Go Flow',
          creatorId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {defaultProjectAccess: 'OPEN' as ProjectAccessLevel, allowMemberInvites: false, invitationExpiryDays: 3}
        };
        set({isInitialized: true, userTeams: [ossTeam], currentTeam: ossTeam});
        saveTeamToStorage(ossTeam);
        return;
      }

      try {
        set({isLoading: true, error: null});
        const teams = await api.getUserTeams();
        const validTeams = Array.isArray(teams) ? teams : [];
        set({userTeams: validTeams, isInitialized: true});

        // Автоматический выбор команды
        const {currentTeam} = get();
        const savedTeam = loadTeamFromStorage();

        if (validTeams.length > 0) {
          let teamToSelect: Team | null = null;

          // Проверяем, существует ли сохраненная команда в загруженном списке
          if (savedTeam) {
            teamToSelect = validTeams.find((team) => team.id === savedTeam.id) || null;
          }

          // Если сохраненной команды нет или она недоступна, выбираем первую команду
          if (!teamToSelect) {
            teamToSelect = validTeams[0];
          }

          // Устанавливаем команду только если она отличается от текущей
          if (!currentTeam || currentTeam.id !== teamToSelect.id) {
            set({
              currentTeam: teamToSelect,
              teamMembers: teamToSelect.members || [],
              teamInvitations: teamToSelect.invitations || [],
              currentUserRole: null,
              isLoadingUserRole: false
            });
            saveTeamToStorage(teamToSelect);
            get().fetchCurrentUserRole(teamToSelect.id);
          }
        } else {
          // Если команд нет, очищаем состояние
          set({currentTeam: null});
          saveTeamToStorage(null);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить команды';
        set({error: errorMessage, userTeams: [], isInitialized: true});
        console.error('Failed to load user teams:', error);
      } finally {
        set({isLoading: false});
      }
    },

    createTeam: async (teamData) => {
      if (isOSS()) return {} as Team;
      try {
        set({isCreatingTeam: true, error: null});
        const newTeam = await api.createTeam(teamData);

        // Добавляем новую команду в список
        const {userTeams} = get();
        set({
          userTeams: [...userTeams, newTeam]
        });

        // Правильно переключаемся на новую команду через switchTeam
        // Это очистит все связанные данные (проекты, участники и т.д.)
        get().switchTeam(newTeam);

        return newTeam;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось создать команду';
        set({error: errorMessage});
        console.error('Failed to create team:', error);
        throw error;
      } finally {
        set({isCreatingTeam: false});
      }
    },

    updateTeam: async (teamId, teamData) => {
      if (isOSS()) return;
      try {
        set({error: null});
        const updatedTeam = await api.updateTeam(teamId, teamData);

        // Обновляем команду в списке
        const {userTeams, currentTeam} = get();
        const updatedTeams = userTeams.map((team) => (team.id === teamId ? updatedTeam : team));

        const newCurrentTeam = currentTeam?.id === teamId ? updatedTeam : currentTeam;
        set({
          userTeams: updatedTeams,
          currentTeam: newCurrentTeam
        });

        // Если обновляли текущую команду, сохраняем в localStorage
        if (currentTeam?.id === teamId) {
          saveTeamToStorage(updatedTeam);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить команду';
        set({error: errorMessage});
        console.error('Failed to update team:', error);
        throw error;
      }
    },

    deleteTeam: async (teamId) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.deleteTeam(teamId);

        // Удаляем команду из списка
        const {userTeams, currentTeam} = get();
        const filteredTeams = userTeams.filter((team) => team.id !== teamId);
        const isCurrentTeamDeleted = currentTeam?.id === teamId;

        // Обновляем список команд
        set({userTeams: filteredTeams});

        if (isCurrentTeamDeleted) {
          // Если удалили текущую команду, нужно переключиться на другую или на null
          if (filteredTeams.length > 0) {
            // Переключаемся на первую доступную команду
            const nextTeam = filteredTeams[0];
            get().switchTeam(nextTeam);
          } else {
            // Если команд больше нет, переключаемся на null (личные проекты)
            get().switchTeam(null);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить команду';
        set({error: errorMessage});
        console.error('Failed to delete team:', error);
        throw error;
      }
    },

    switchTeam: (team) => {
      set({
        currentTeam: team,
        teamMembers: team?.members || [],
        teamInvitations: team?.invitations || [],
        teamProjects: [],
        currentUserRole: null,
        isLoadingUserRole: false,
        error: null
      });

      // Принудительно обновляем localStorage
      saveTeamToStorage(team);

      // Загружаем дополнительные данные для новой команды
      if (team) {
        get().fetchCurrentUserRole(team.id);
        // Загружаем проекты новой команды
        get().loadTeamProjects(team.id);
      }
    },

    // === УЧАСТНИКИ ===
    loadTeamMembers: async (teamId) => {
      if (isOSS()) return;
      try {
        set({isLoading: true, error: null});
        const members = await api.getTeamMembers(teamId);
        set({teamMembers: members});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить участников';
        set({error: errorMessage});
        console.error('Failed to load team members:', error);
      } finally {
        set({isLoading: false});
      }
    },

    inviteMember: async (teamId, inviteData) => {
      if (isOSS()) return;
      try {
        set({isInvitingMember: true, error: null});
        const invitation = await api.inviteMember(teamId, inviteData);

        // Добавляем приглашение в список
        const {teamInvitations} = get();
        set({teamInvitations: [...teamInvitations, invitation]});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось отправить приглашение';
        set({error: errorMessage});
        console.error('Failed to invite member:', error);
        throw error;
      } finally {
        set({isInvitingMember: false});
      }
    },

    updateMemberRole: async (teamId, updateData) => {
      if (isOSS()) return;
      try {
        set({error: null});
        const updatedMember = await api.updateMemberRole(teamId, updateData);

        // Обновляем участника в списке
        const {teamMembers} = get();
        const updatedMembers = teamMembers.map((member) => (member.id === updateData.memberId ? updatedMember : member));
        set({teamMembers: updatedMembers});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить роль участника';
        set({error: errorMessage});
        console.error('Failed to update member role:', error);
        throw error;
      }
    },

    removeMember: async (teamId, memberId) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.removeMember(teamId, memberId);

        // Удаляем участника из списка
        const {teamMembers} = get();
        const filteredMembers = teamMembers.filter((member) => member.id !== memberId);
        set({teamMembers: filteredMembers});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить участника';
        set({error: errorMessage});
        console.error('Failed to remove member:', error);
        throw error;
      }
    },

    deactivateMember: async (teamId, memberId) => {
      if (isOSS()) return;
      try {
        set({error: null});
        const deactivatedMember = await api.deactivateMember(teamId, memberId);

        // Обновляем статус участника
        const {teamMembers} = get();
        const updatedMembers = teamMembers.map((member) => (member.id === memberId ? deactivatedMember : member));
        set({teamMembers: updatedMembers});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось деактивировать участника';
        set({error: errorMessage});
        console.error('Failed to deactivate member:', error);
        throw error;
      }
    },

    reactivateMember: async (teamId, memberId) => {
      if (isOSS()) return;
      try {
        set({error: null});
        const reactivatedMember = await api.reactivateMember(teamId, memberId);

        // Обновляем статус участника
        const {teamMembers} = get();
        const updatedMembers = teamMembers.map((member) => (member.id === memberId ? reactivatedMember : member));
        set({teamMembers: updatedMembers});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось реактивировать участника';
        set({error: errorMessage});
        console.error('Failed to reactivate member:', error);
        throw error;
      }
    },

    // === ПРИГЛАШЕНИЯ ===
    loadTeamInvitations: async (teamId) => {
      if (isOSS()) return;
      try {
        set({isLoading: true, error: null});
        const invitations = await api.getTeamInvitations(teamId);
        set({teamInvitations: invitations});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить приглашения';
        set({error: errorMessage});
        console.error('Failed to load team invitations:', error);
      } finally {
        set({isLoading: false});
      }
    },

    acceptInvitation: async (token) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.acceptInvitation(token);
        // После принятия приглашения перезагружаем команды пользователя
        await get().loadUserTeams();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось принять приглашение';
        set({error: errorMessage});
        console.error('Failed to accept invitation:', error);
        throw error;
      }
    },

    declineInvitation: async (token) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.declineInvitation(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось отклонить приглашение';
        set({error: errorMessage});
        console.error('Failed to decline invitation:', error);
        throw error;
      }
    },

    revokeInvitation: async (teamId, invitationId) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.revokeInvitation(teamId, invitationId);

        // Удаляем приглашение из списка
        const {teamInvitations} = get();
        const filteredInvitations = teamInvitations.filter((invitation) => invitation.id !== invitationId);
        set({teamInvitations: filteredInvitations});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось отозвать приглашение';
        set({error: errorMessage});
        console.error('Failed to revoke invitation:', error);
        throw error;
      }
    },

    // === ПРОЕКТЫ ===
    loadTeamProjects: async (teamId) => {
      if (isOSS()) return;
      try {
        set({isLoading: true, error: null});
        const projectsWithDetails = await api.getTeamProjects(teamId);

        // Преобразуем TeamProjectWithDetails в TeamProject
        const projects: TeamProject[] = projectsWithDetails.map((projectDetail) => ({
          id: projectDetail.projectId,
          name: projectDetail.project.name,
          teamId: projectDetail.teamId,
          ownerId: projectDetail.project.creator.id,
          accessLevel: projectDetail.accessLevel as ProjectAccessLevel,
          createdAt: projectDetail.project.createdAt,
          updatedAt: projectDetail.project.updatedAt,
          members: [], // Пока оставляем пустым, так как детали участников проекта не приходят в этом API
          projectInfo: projectDetail.project.projectInfo // Сохраняем информацию о проекте
        }));

        set({teamProjects: projects});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить проекты';
        set({error: errorMessage});
        console.error('Failed to load team projects:', error);
      } finally {
        set({isLoading: false});
      }
    },

    addProjectMember: async (teamId, projectData) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.addProjectMember(teamId, projectData);

        // Перезагружаем проекты чтобы получить обновленную информацию
        await get().loadTeamProjects(teamId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить участника в проект';
        set({error: errorMessage});
        console.error('Failed to add project member:', error);
        throw error;
      }
    },

    removeProjectMember: async (teamId, projectId, userId) => {
      if (isOSS()) return;
      try {
        set({error: null});
        await api.removeProjectMember(teamId, projectId, userId);

        // Перезагружаем проекты чтобы получить обновленную информацию
        await get().loadTeamProjects(teamId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить участника из проекта';
        set({error: errorMessage});
        console.error('Failed to remove project member:', error);
        throw error;
      }
    },

    updateProjectAccess: async (teamId, projectData) => {
      if (isOSS()) return;
      try {
        set({error: null});
        const updatedProject = await api.updateProjectAccess(teamId, projectData);

        // Обновляем проект в списке
        const {teamProjects} = get();
        const updatedProjects = teamProjects.map((project) => (project.id === projectData.projectId ? updatedProject : project));
        set({teamProjects: updatedProjects});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить доступ к проекту';
        set({error: errorMessage});
        console.error('Failed to update project access:', error);
        throw error;
      }
    },

    // === ВЫЧИСЛЯЕМЫЕ ДАННЫЕ ===
    getTeamMembersWithPermissions: (currentUserId) => {
      const {teamMembers, currentTeam} = get();

      if (!currentUserId || !currentTeam) return [];

      const currentUserMember = teamMembers.find((member) => member.userId === currentUserId);
      const currentUserRole = currentUserMember?.role;
      const isTeamCreator = currentTeam.creatorId === currentUserId;

      return teamMembers.map((member) => ({
        ...member,
        permissions: getTeamRolePermissions(member.role),
        canBeModified: currentUserRole ? canManageMember(currentUserRole, member.role, isTeamCreator) : false
      }));
    },

    getTeamProjectsWithAccess: (currentUserId) => {
      const {teamProjects, teamMembers} = get();

      if (!currentUserId) return [];

      const currentUserMember = teamMembers.find((member) => member.userId === currentUserId);
      if (!currentUserMember) return [];

      return teamProjects.map((project) => {
        const userProjectMember = project.members.find((member: ProjectTeamMember) => member.userId === currentUserId);
        const hasExplicitAccess = !!userProjectMember;
        const canAccess = canAccessProject(project.accessLevel, currentUserMember.role, hasExplicitAccess);

        return {
          ...project,
          canAccess,
          canEdit: userProjectMember ? canPerformProjectAction(userProjectMember.role, 'edit') : false,
          canManage: userProjectMember ? canPerformProjectAction(userProjectMember.role, 'manage') : false,
          userRole: userProjectMember?.role
        };
      });
    },

    getCurrentUserTeamRole: (currentUserId) => {
      const {teamMembers} = get();

      if (!currentUserId) return null;

      const currentUserMember = teamMembers.find((member) => member.userId === currentUserId);
      return currentUserMember?.role || null;
    },

    getCurrentUserPermissions: (currentUserId) => {
      const currentUserRole = get().getCurrentUserTeamRole(currentUserId);
      return currentUserRole ? getTeamRolePermissions(currentUserRole) : null;
    },

    // === УТИЛИТЫ ===
    clearTeamData: () => {
      set({
        teamMembers: [],
        teamInvitations: [],
        teamProjects: [],
        currentUserRole: null,
        isLoadingUserRole: false,
        error: null
      });
    },

    reset: () => {
      set(initialState);
      saveTeamToStorage(null);
    },

    // === НОВЫЕ ДЕЙСТВИЯ ===
    fetchCurrentUserRole: async (teamId: string) => {
      if (isOSS()) return;
      try {
        set({isLoadingUserRole: true});
        const roleData = await api.getUserRole(teamId);
        if (roleData) {
          set({currentUserRole: roleData.role as TeamRole, isLoadingUserRole: false});
        } else {
          set({currentUserRole: null, isLoadingUserRole: false});
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        set({currentUserRole: null, isLoadingUserRole: false});
      }
    }
  };
});
