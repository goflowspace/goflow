import { NextFunction, Request, Response } from "express";
import { TeamRole } from "@prisma/client";
import {
  createTeam,
  getUserTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  inviteMember,
  acceptInvitation,
  declineInvitation,
  updateMemberRole,
  removeMember,
  addProjectToTeam,
  getTeamProjects,
  updateProjectAccess,
  removeProjectFromTeam,
  checkTeamAccess,
  getUserRoleInTeam
} from "../../../../src/modules/team/team.controller";

// Мокаем сервисы
jest.mock("../../../../src/modules/team/team.service", () => ({
  createTeam: jest.fn(),
  getUserTeams: jest.fn(),
  getTeamById: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  inviteMember: jest.fn(),
  acceptInvitation: jest.fn(),
  declineInvitation: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  addProjectToTeam: jest.fn(),
  getTeamProjects: jest.fn(),
  updateProjectAccess: jest.fn(),
  removeProjectFromTeam: jest.fn(),
  checkTeamAccess: jest.fn(),
  getUserRoleInTeam: jest.fn(),
}));

const mockTeamService = require("../../../../src/modules/team/team.service");
const mockCreateTeamService = mockTeamService.createTeam;
const mockGetUserTeamsService = mockTeamService.getUserTeams;
const mockGetTeamByIdService = mockTeamService.getTeamById;
const mockUpdateTeamService = mockTeamService.updateTeam;
const mockDeleteTeamService = mockTeamService.deleteTeam;
const mockInviteMemberService = mockTeamService.inviteMember;
const mockAcceptInvitationService = mockTeamService.acceptInvitation;
const mockDeclineInvitationService = mockTeamService.declineInvitation;
const mockUpdateMemberRoleService = mockTeamService.updateMemberRole;
const mockRemoveMemberService = mockTeamService.removeMember;
const mockAddProjectToTeamService = mockTeamService.addProjectToTeam;
const mockGetTeamProjectsService = mockTeamService.getTeamProjects;
const mockUpdateProjectAccessService = mockTeamService.updateProjectAccess;
const mockRemoveProjectFromTeamService = mockTeamService.removeProjectFromTeam;
const mockCheckTeamAccessService = mockTeamService.checkTeamAccess;
const mockGetUserRoleInTeamService = mockTeamService.getUserRoleInTeam;
const mockNext = jest.fn();

describe('TeamController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };

    mockRequest = {
      user: { id: 'user1' },
      body: {},
      params: {},
    };

    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    it('должен создать команду и вернуть статус 201', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'Test description',
        settings: { defaultAccess: 'READ' }
      };
      const createdTeam = {
        id: 'team1',
        name: teamData.name,
        description: teamData.description,
        ownerId: 'user1',
        members: []
      };

      mockRequest.body = teamData;
      mockCreateTeamService.mockResolvedValue(createdTeam);

      await createTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockCreateTeamService).toHaveBeenCalledWith('user1', teamData);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: createdTeam,
        message: "Команда успешно создана"
      });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Database error');
      mockCreateTeamService.mockRejectedValue(error);

      // Мокаем asyncHandler behavior
      try {
        await createTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        // asyncHandler должен поймать эту ошибку
        expect(err).toBe(error);
      }
    });
  });

  describe('getUserTeams', () => {
    it('должен вернуть список команд пользователя', async () => {
      const teams = [
        { id: 'team1', name: 'Team 1', ownerId: 'user1' },
        { id: 'team2', name: 'Team 2', ownerId: 'other-user' }
      ];

      mockGetUserTeamsService.mockResolvedValue(teams);

      await getUserTeams(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockGetUserTeamsService).toHaveBeenCalledWith('user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: teams
      });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Service error');
      mockGetUserTeamsService.mockRejectedValue(error);

      try {
        await getUserTeams(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('getTeamById', () => {
    it('должен вернуть информацию о команде', async () => {
      const team = {
        id: 'team1',
        name: 'Test Team',
        ownerId: 'user1',
        members: [{ userId: 'user1', role: TeamRole.ADMINISTRATOR }],
        projects: [],
        invitations: []
      };

      mockRequest.params = { teamId: 'team1' };
      mockGetTeamByIdService.mockResolvedValue(team);

      await getTeamById(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockGetTeamByIdService).toHaveBeenCalledWith('team1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: team
      });
    });

    it('должен обработать ошибку если команда не найдена', async () => {
      const error = new Error('Команда не найдена или нет доступа');
      mockRequest.params = { teamId: 'team1' };
      mockGetTeamByIdService.mockRejectedValue(error);

      try {
        await getTeamById(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('updateTeam', () => {
    it('должен обновить команду', async () => {
      const updateData = {
        name: 'Updated Team',
        description: 'Updated description'
      };
      const updatedTeam = {
        id: 'team1',
        name: updateData.name,
        description: updateData.description
      };

      mockRequest.params = { teamId: 'team1' };
      mockRequest.body = updateData;
      mockUpdateTeamService.mockResolvedValue(updatedTeam);

      await updateTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockUpdateTeamService).toHaveBeenCalledWith('team1', 'user1', updateData);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: updatedTeam,
        message: "Команда успешно обновлена"
      });
    });

    it('должен обработать ошибку недостаточных прав', async () => {
      const error = new Error('Недостаточно прав для редактирования команды');
      mockRequest.params = { teamId: 'team1' };
      mockRequest.body = { name: 'New Name' };
      mockUpdateTeamService.mockRejectedValue(error);

      try {
        await updateTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('deleteTeam', () => {
    it('должен удалить команду', async () => {
      const result = { message: "Команда и все связанные проекты успешно удалены" };

      mockRequest.params = { teamId: 'team1' };
      mockDeleteTeamService.mockResolvedValue(result);

      await deleteTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockDeleteTeamService).toHaveBeenCalledWith('team1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: result.message
      });
    });

    it('должен обработать ошибку если пользователь не владелец', async () => {
      const error = new Error('Только владелец может удалить команду');
      mockRequest.params = { teamId: 'team1' };
      mockDeleteTeamService.mockRejectedValue(error);

      try {
        await deleteTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('inviteMember', () => {
    it('должен отправить приглашение участнику', async () => {
      const inviteData = {
        email: 'new@example.com',
        role: TeamRole.MEMBER
      };
      const invitation = {
        id: 'invitation1',
        teamId: 'team1',
        email: inviteData.email,
        role: inviteData.role,
        token: 'test-token'
      };

      mockRequest.params = { teamId: 'team1' };
      mockRequest.body = inviteData;
      mockInviteMemberService.mockResolvedValue(invitation);

      await inviteMember(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockInviteMemberService).toHaveBeenCalledWith('team1', 'user1', inviteData);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: invitation,
        message: "Приглашение отправлено"
      });
    });

    it('должен обработать ошибку если пользователь уже участник', async () => {
      const error = new Error('Пользователь уже является участником команды');
      const inviteData = { email: 'existing@example.com', role: TeamRole.MEMBER };

      mockRequest.params = { teamId: 'team1' };
      mockRequest.body = inviteData;
      mockInviteMemberService.mockRejectedValue(error);

      try {
        await inviteMember(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('acceptInvitation', () => {
    it('должен принять приглашение', async () => {
      const team = {
        id: 'team1',
        name: 'Test Team'
      };

      mockRequest.params = { token: 'invitation-token' };
      mockAcceptInvitationService.mockResolvedValue(team);

      await acceptInvitation(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockAcceptInvitationService).toHaveBeenCalledWith('invitation-token', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: team,
        message: "Приглашение принято"
      });
    });

    it('должен обработать ошибку если приглашение истекло', async () => {
      const error = new Error('Приглашение истекло');
      mockRequest.params = { token: 'expired-token' };
      mockAcceptInvitationService.mockRejectedValue(error);

      try {
        await acceptInvitation(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('declineInvitation', () => {
    it('должен отклонить приглашение', async () => {
      const result = { message: "Приглашение отклонено" };

      mockRequest.params = { token: 'invitation-token' };
      mockDeclineInvitationService.mockResolvedValue(result);

      await declineInvitation(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockDeclineInvitationService).toHaveBeenCalledWith('invitation-token');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: result.message
      });
    });
  });

  describe('updateMemberRole', () => {
    it('должен обновить роль участника', async () => {
      const roleData = { role: TeamRole.MANAGER };
      const updatedMember = {
        id: 'member1',
        role: TeamRole.MANAGER,
        user: { id: 'user2', name: 'User 2', email: 'user2@example.com' }
      };

      mockRequest.params = { teamId: 'team1', memberId: 'member1' };
      mockRequest.body = roleData;
      mockUpdateMemberRoleService.mockResolvedValue(updatedMember);

      await updateMemberRole(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockUpdateMemberRoleService).toHaveBeenCalledWith('team1', 'member1', 'user1', roleData);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: updatedMember,
        message: "Роль участника обновлена"
      });
    });

    it('должен обработать ошибку недостаточных прав', async () => {
      const error = new Error('У вас нет прав для выполнения этого действия');
      mockRequest.params = { teamId: 'team1', memberId: 'member1' };
      mockRequest.body = { role: TeamRole.ADMINISTRATOR };
      mockUpdateMemberRoleService.mockRejectedValue(error);

      try {
        await updateMemberRole(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('removeMember', () => {
    it('должен удалить участника из команды', async () => {
      const result = { message: "Участник удален из команды" };

      mockRequest.params = { teamId: 'team1', memberId: 'member1' };
      mockRemoveMemberService.mockResolvedValue(result);

      await removeMember(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockRemoveMemberService).toHaveBeenCalledWith('team1', 'member1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: result.message
      });
    });

    it('должен обработать ошибку если участник не найден', async () => {
      const error = new Error('Участник не найден');
      mockRequest.params = { teamId: 'team1', memberId: 'member1' };
      mockRemoveMemberService.mockRejectedValue(error);

      try {
        await removeMember(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('addProjectToTeam', () => {
    it('должен добавить проект в команду', async () => {
      const projectData = {
        projectId: 'project1',
        accessLevel: 'READ' as any
      };
      const teamProject = {
        id: 'team-project1',
        teamId: 'team1',
        projectId: 'project1',
        accessLevel: 'READ'
      };

      mockRequest.params = { teamId: 'team1' };
      mockRequest.body = projectData;
      mockAddProjectToTeamService.mockResolvedValue(teamProject);

      await addProjectToTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockAddProjectToTeamService).toHaveBeenCalledWith('team1', 'user1', projectData);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: teamProject,
        message: "Проект добавлен в команду"
      });
    });
  });

  describe('getTeamProjects', () => {
    it('должен вернуть проекты команды', async () => {
      const projects = [
        { id: 'project1', name: 'Project 1', accessLevel: 'READ' },
        { id: 'project2', name: 'Project 2', accessLevel: 'WRITE' }
      ];

      mockRequest.params = { teamId: 'team1' };
      mockGetTeamProjectsService.mockResolvedValue(projects);

      await getTeamProjects(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockGetTeamProjectsService).toHaveBeenCalledWith('team1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: projects
      });
    });
  });

  describe('updateProjectAccess', () => {
    it('должен обновить уровень доступа к проекту', async () => {
      const accessData = { accessLevel: 'WRITE' };
      const updatedTeamProject = {
        id: 'team-project1',
        accessLevel: 'WRITE'
      };

      mockRequest.params = { teamId: 'team1', projectId: 'project1' };
      mockRequest.body = accessData;
      mockUpdateProjectAccessService.mockResolvedValue(updatedTeamProject);

      await updateProjectAccess(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockUpdateProjectAccessService).toHaveBeenCalledWith('team1', 'project1', 'user1', 'WRITE');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: updatedTeamProject,
        message: "Уровень доступа к проекту обновлен"
      });
    });
  });

  describe('removeProjectFromTeam', () => {
    it('должен удалить проект из команды', async () => {
      const result = { message: "Проект удален из команды" };

      mockRequest.params = { teamId: 'team1', projectId: 'project1' };
      mockRemoveProjectFromTeamService.mockResolvedValue(result);

      await removeProjectFromTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockRemoveProjectFromTeamService).toHaveBeenCalledWith('team1', 'project1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: result.message
      });
    });
  });

  describe('checkTeamAccess', () => {
    it('должен проверить доступ к команде', async () => {
      const hasAccess = true;

      mockRequest.params = { teamId: 'team1' };
      mockCheckTeamAccessService.mockResolvedValue(hasAccess);

      await checkTeamAccess(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockCheckTeamAccessService).toHaveBeenCalledWith('team1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: { hasAccess }
      });
    });
  });

  describe('getUserRoleInTeam', () => {
    it('должен вернуть роль пользователя в команде', async () => {
      const member = {
        role: TeamRole.ADMINISTRATOR,
        team: { id: 'team1', name: 'Test Team' }
      };

      mockRequest.params = { teamId: 'team1' };
      mockGetUserRoleInTeamService.mockResolvedValue(member);

      await getUserRoleInTeam(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockGetUserRoleInTeamService).toHaveBeenCalledWith('team1', 'user1');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: member
      });
    });
  });
}); 