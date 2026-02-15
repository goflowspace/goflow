import request from 'supertest';
import express from 'express';
import { TeamRole } from '@prisma/client';

// Мокаем сервисы команд перед импортом контроллера
const mockCreateTeamService = jest.fn();
const mockGetUserTeamsService = jest.fn();
const mockGetTeamByIdService = jest.fn();
const mockUpdateTeamService = jest.fn();
const mockDeleteTeamService = jest.fn();
const mockInviteMemberService = jest.fn();
const mockAcceptInvitationService = jest.fn();
const mockDeclineInvitationService = jest.fn();
const mockUpdateMemberRoleService = jest.fn();
const mockRemoveMemberService = jest.fn();
const mockAddProjectToTeamService = jest.fn();
const mockGetTeamProjectsService = jest.fn();
const mockUpdateProjectAccessService = jest.fn();
const mockRemoveProjectFromTeamService = jest.fn();
const mockCheckTeamAccessService = jest.fn();
const mockGetUserRoleInTeamService = jest.fn();
const mockGetTeamMembersService = jest.fn();

jest.mock('../../../../src/modules/team/team.service', () => ({
  createTeam: mockCreateTeamService,
  getUserTeams: mockGetUserTeamsService,
  getTeamById: mockGetTeamByIdService,
  updateTeam: mockUpdateTeamService,
  deleteTeam: mockDeleteTeamService,
  inviteMember: mockInviteMemberService,
  acceptInvitation: mockAcceptInvitationService,
  declineInvitation: mockDeclineInvitationService,
  updateMemberRole: mockUpdateMemberRoleService,
  removeMember: mockRemoveMemberService,
  addProjectToTeam: mockAddProjectToTeamService,
  getTeamProjects: mockGetTeamProjectsService,
  updateProjectAccess: mockUpdateProjectAccessService,
  removeProjectFromTeam: mockRemoveProjectFromTeamService,
  checkTeamAccess: mockCheckTeamAccessService,
  getUserRoleInTeam: mockGetUserRoleInTeamService,
  getTeamMembers: mockGetTeamMembersService,
}));

// Импортируем контроллер (использует замоканный team.service)
import * as teamController from '../../../../src/modules/team/team.controller';
import { errorHandler } from '../../../../src/middlewares/errorHandler';

// Создаем тестовый app с нужными роутами (вместо импорта реального app.ts с top-level await)
const mockAuthMiddleware = (req: any, _res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

const app = express();
app.use(express.json());
app.use(mockAuthMiddleware);

// Роуты команд
app.post('/teams', teamController.createTeam);
app.get('/teams', teamController.getUserTeams);
app.get('/teams/:teamId', teamController.getTeamById);
app.put('/teams/:teamId', teamController.updateTeam);
app.delete('/teams/:teamId', teamController.deleteTeam);

// Участники
app.post('/teams/:teamId/members/invite', teamController.inviteMember);
app.put('/teams/:teamId/members/:memberId/role', teamController.updateMemberRole);
app.delete('/teams/:teamId/members/:memberId', teamController.removeMember);

// Приглашения
app.post('/teams/invitations/:token/accept', teamController.acceptInvitation);
app.post('/teams/invitations/:token/decline', teamController.declineInvitation);

// Проекты команды
app.post('/teams/:teamId/projects', teamController.addProjectToTeam);
app.get('/teams/:teamId/projects', teamController.getTeamProjects);
app.put('/teams/:teamId/projects/:projectId/access', teamController.updateProjectAccess);
app.delete('/teams/:teamId/projects/:projectId', teamController.removeProjectFromTeam);

// Вспомогательные
app.get('/teams/:teamId/access', teamController.checkTeamAccess);
app.get('/teams/:teamId/role', teamController.getUserRoleInTeam);

// Обработчик ошибок
app.use(errorHandler);

describe('Team API Integration Tests', () => {
  const userId = 'test-user-id';
  const authToken = 'Bearer test-jwt-token';
  const teamId = '667f1b9b1b9b1b9b1b9b1b9b';
  const memberId = '667f1b9b1b9b1b9b1b9b1b9c';
  const projectId = '667f1b9b1b9b1b9b1b9b1b9d';
  const invitationToken = 'a8a6d6cc-7b0b-4aee-8a38-232e54125438';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /teams', () => {
    it('должен создать новую команду', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'Test team description',
        settings: { defaultAccess: 'READ' }
      };

      const mockTeam = {
        id: teamId,
        name: teamData.name,
        description: teamData.description,
        settings: teamData.settings,
        ownerId: userId,
        owner: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
        },
        members: []
      };

      mockCreateTeamService.mockResolvedValue(mockTeam);

      const response = await request(app)
        .post('/teams')
        .set('Authorization', authToken)
        .send(teamData)
        .expect(201);

      expect(mockCreateTeamService).toHaveBeenCalledWith(userId, teamData);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTeam);
      expect(response.body.message).toBe('Команда успешно создана');
    });

    it('должен обработать ошибку сервиса', async () => {
      mockCreateTeamService.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/teams')
        .set('Authorization', authToken)
        .send({ name: 'Test Team' })
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('GET /teams', () => {
    it('должен вернуть список команд пользователя', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Team 1',
          ownerId: userId,
          members: [],
          _count: { members: 2, projects: 1 }
        },
        {
          id: 'team-2',
          name: 'Team 2',
          ownerId: 'other-user',
          members: [{ userId, role: TeamRole.MEMBER }],
          _count: { members: 3, projects: 2 }
        }
      ];

      mockGetUserTeamsService.mockResolvedValue(mockTeams);

      const response = await request(app)
        .get('/teams')
        .set('Authorization', authToken)
        .expect(200);

      expect(mockGetUserTeamsService).toHaveBeenCalledWith(userId);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTeams);
    });

    it('должен вернуть пустой список если у пользователя нет команд', async () => {
      mockGetUserTeamsService.mockResolvedValue([]);

      const response = await request(app)
        .get('/teams')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /teams/:teamId', () => {
    it('должен вернуть информацию о команде', async () => {
      const mockTeam = {
        id: teamId,
        name: 'Test Team',
        ownerId: userId,
        members: [
          {
            userId,
            role: TeamRole.ADMINISTRATOR,
            user: { id: userId, name: 'Test User', email: 'test@example.com' }
          }
        ],
        projects: [],
        invitations: []
      };

      mockGetTeamByIdService.mockResolvedValue(mockTeam);

      const response = await request(app)
        .get(`/teams/${teamId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockGetTeamByIdService).toHaveBeenCalledWith(teamId, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTeam);
    });

    it('должен вернуть ошибку если команда не найдена', async () => {
      mockGetTeamByIdService.mockRejectedValue(new Error('Команда не найдена или нет доступа'));

      const response = await request(app)
        .get(`/teams/${teamId}`)
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('PUT /teams/:teamId', () => {
    it('должен обновить команду', async () => {
      const updateData = {
        name: 'Updated Team',
        description: 'Updated description'
      };

      const mockUpdatedTeam = {
        id: teamId,
        name: updateData.name,
        description: updateData.description,
        ownerId: userId
      };

      mockUpdateTeamService.mockResolvedValue(mockUpdatedTeam);

      const response = await request(app)
        .put(`/teams/${teamId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(mockUpdateTeamService).toHaveBeenCalledWith(teamId, userId, updateData);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedTeam);
      expect(response.body.message).toBe('Команда успешно обновлена');
    });

    it('должен обработать ошибку недостаточных прав', async () => {
      mockUpdateTeamService.mockRejectedValue(new Error('Недостаточно прав для редактирования команды'));

      const response = await request(app)
        .put(`/teams/${teamId}`)
        .set('Authorization', authToken)
        .send({ name: 'New Name' })
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('DELETE /teams/:teamId', () => {
    it('должен удалить команду', async () => {
      const mockResult = { message: "Команда и все связанные проекты успешно удалены" };

      mockDeleteTeamService.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/teams/${teamId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockDeleteTeamService).toHaveBeenCalledWith(teamId, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(mockResult.message);
    });

    it('должен обработать ошибку если пользователь не владелец', async () => {
      mockDeleteTeamService.mockRejectedValue(new Error('Только владелец может удалить команду'));

      const response = await request(app)
        .delete(`/teams/${teamId}`)
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('POST /teams/:teamId/members/invite', () => {
    it('должен отправить приглашение участнику', async () => {
      const inviteData = {
        email: 'new@example.com',
        role: TeamRole.MEMBER
      };

      const mockInvitation = {
        id: 'invitation-1',
        teamId,
        email: inviteData.email,
        role: inviteData.role,
        token: 'test-token',
        team: { id: teamId, name: 'Test Team' },
        inviter: { id: userId, name: 'Test User', email: 'test@example.com' }
      };

      mockInviteMemberService.mockResolvedValue(mockInvitation);

      const response = await request(app)
        .post(`/teams/${teamId}/members/invite`)
        .set('Authorization', authToken)
        .send(inviteData)
        .expect(201);

      expect(mockInviteMemberService).toHaveBeenCalledWith(teamId, userId, inviteData);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInvitation);
      expect(response.body.message).toBe('Приглашение отправлено');
    });

    it('должен обработать ошибку если пользователь уже участник', async () => {
      mockInviteMemberService.mockRejectedValue(new Error('Пользователь уже является участником команды'));

      const response = await request(app)
        .post(`/teams/${teamId}/members/invite`)
        .set('Authorization', authToken)
        .send({ email: 'existing@example.com', role: TeamRole.MEMBER })
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('POST /teams/invitations/:token/accept', () => {
    it('должен принять приглашение', async () => {
      const mockTeam = {
        id: teamId,
        name: 'Test Team'
      };

      mockAcceptInvitationService.mockResolvedValue(mockTeam);

      const response = await request(app)
        .post(`/teams/invitations/${invitationToken}/accept`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockAcceptInvitationService).toHaveBeenCalledWith(invitationToken, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTeam);
      expect(response.body.message).toBe('Приглашение принято');
    });

    it('должен обработать ошибку если приглашение истекло', async () => {
      mockAcceptInvitationService.mockRejectedValue(new Error('Приглашение истекло'));

      const response = await request(app)
        .post(`/teams/invitations/${invitationToken}/accept`)
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('POST /teams/invitations/:token/decline', () => {
    it('должен отклонить приглашение', async () => {
      const mockResult = { message: "Приглашение отклонено" };

      mockDeclineInvitationService.mockResolvedValue(mockResult);

      const response = await request(app)
        .post(`/teams/invitations/${invitationToken}/decline`)
        .expect(200);

      expect(mockDeclineInvitationService).toHaveBeenCalledWith(invitationToken);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(mockResult.message);
    });
  });

  describe('PUT /teams/:teamId/members/:memberId/role', () => {
    it('должен обновить роль участника', async () => {
      const roleData = { role: TeamRole.MANAGER };
      const mockUpdatedMember = {
        id: memberId,
        role: TeamRole.MANAGER,
        user: { id: 'user2', name: 'User 2', email: 'user2@example.com' }
      };

      mockUpdateMemberRoleService.mockResolvedValue(mockUpdatedMember);

      const response = await request(app)
        .put(`/teams/${teamId}/members/${memberId}/role`)
        .set('Authorization', authToken)
        .send(roleData)
        .expect(200);

      expect(mockUpdateMemberRoleService).toHaveBeenCalledWith(teamId, memberId, userId, roleData);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedMember);
      expect(response.body.message).toBe('Роль участника обновлена');
    });

    it('должен обработать ошибку недостаточных прав', async () => {
      mockUpdateMemberRoleService.mockRejectedValue(new Error('У вас нет прав для выполнения этого действия'));

      const response = await request(app)
        .put(`/teams/${teamId}/members/${memberId}/role`)
        .set('Authorization', authToken)
        .send({ role: TeamRole.ADMINISTRATOR })
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('DELETE /teams/:teamId/members/:memberId', () => {
    it('должен удалить участника из команды', async () => {
      const mockResult = { message: "Участник удален из команды" };

      mockRemoveMemberService.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/teams/${teamId}/members/${memberId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockRemoveMemberService).toHaveBeenCalledWith(teamId, memberId, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(mockResult.message);
    });

    it('должен обработать ошибку если участник не найден', async () => {
      mockRemoveMemberService.mockRejectedValue(new Error('Участник не найден'));

      const response = await request(app)
        .delete(`/teams/${teamId}/members/${memberId}`)
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.error).toBe('Внутренняя ошибка сервера');
    });
  });

  describe('POST /teams/:teamId/projects', () => {
    it('должен добавить проект в команду', async () => {
      const projectData = {
        projectId,
        accessLevel: 'RESTRICTED'
      };

      const mockTeamProject = {
        id: 'team-project-1',
        teamId,
        projectId,
        accessLevel: 'RESTRICTED'
      };

      mockAddProjectToTeamService.mockResolvedValue(mockTeamProject);

      const response = await request(app)
        .post(`/teams/${teamId}/projects`)
        .set('Authorization', authToken)
        .send(projectData)
        .expect(201);

      expect(mockAddProjectToTeamService).toHaveBeenCalledWith(teamId, userId, projectData);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTeamProject);
      expect(response.body.message).toBe('Проект добавлен в команду');
    });
  });

  describe('GET /teams/:teamId/projects', () => {
    it('должен вернуть проекты команды', async () => {
      const mockProjects = [
        { id: 'project-1', name: 'Project 1', accessLevel: 'READ' },
        { id: 'project-2', name: 'Project 2', accessLevel: 'WRITE' }
      ];

      mockGetTeamProjectsService.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get(`/teams/${teamId}/projects`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockGetTeamProjectsService).toHaveBeenCalledWith(teamId, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProjects);
    });
  });

  describe('PUT /teams/:teamId/projects/:projectId/access', () => {
    it('должен обновить уровень доступа к проекту', async () => {
      const accessData = { accessLevel: 'OPEN' };
      const mockTeamProject = {
        id: 'team-project-1',
        teamId,
        projectId,
        accessLevel: 'OPEN'
      };

      mockUpdateProjectAccessService.mockResolvedValue(mockTeamProject);

      const response = await request(app)
        .put(`/teams/${teamId}/projects/${projectId}/access`)
        .set('Authorization', authToken)
        .send(accessData)
        .expect(200);

      expect(mockUpdateProjectAccessService).toHaveBeenCalledWith(teamId, projectId, userId, 'OPEN');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTeamProject);
      expect(response.body.message).toBe('Уровень доступа к проекту обновлен');
    });
  });

  describe('DELETE /teams/:teamId/projects/:projectId', () => {
    it('должен удалить проект из команды', async () => {
      const mockResult = { message: "Проект удален из команды" };

      mockRemoveProjectFromTeamService.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/teams/${teamId}/projects/${projectId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockRemoveProjectFromTeamService).toHaveBeenCalledWith(teamId, projectId, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(mockResult.message);
    });
  });

  describe('GET /teams/:teamId/access', () => {
    it('должен проверить доступ к команде', async () => {
      const hasAccess = true;

      mockCheckTeamAccessService.mockResolvedValue(hasAccess);

      const response = await request(app)
        .get(`/teams/${teamId}/access`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockCheckTeamAccessService).toHaveBeenCalledWith(teamId, userId);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ hasAccess });
    });
  });

  describe('GET /teams/:teamId/role', () => {
    it('должен вернуть роль пользователя в команде', async () => {
      const mockMember = {
        role: TeamRole.ADMINISTRATOR,
        team: { id: teamId, name: 'Test Team' }
      };

      mockGetUserRoleInTeamService.mockResolvedValue(mockMember);

      const response = await request(app)
        .get(`/teams/${teamId}/role`)
        .set('Authorization', authToken)
        .expect(200);

      expect(mockGetUserRoleInTeamService).toHaveBeenCalledWith(teamId, userId);
      expect(response.body.success).toBe(true);
      // Контроллер возвращает только { role: member.role }
      expect(response.body.data).toEqual({ role: TeamRole.ADMINISTRATOR });
    });
  });
});
