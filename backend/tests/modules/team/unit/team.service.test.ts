import { TeamRole, TeamInvitationStatus } from "@prisma/client";

// Мокаем Prisma клиент
const mockPrismaTeam = {
  create: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaTeamMember = {
  create: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaTeamInvitation = {
  create: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaUser = {
  findUnique: jest.fn(),
};

const mockPrismaTransaction = jest.fn();

// Мокаем модули
jest.mock("../../../../src/config/prisma", () => ({
  prisma: {
    team: mockPrismaTeam,
    teamMember: mockPrismaTeamMember,
    teamInvitation: mockPrismaTeamInvitation,
    user: mockPrismaUser,
    $transaction: mockPrismaTransaction,
  },
}));

jest.mock("../../../../src/utils/email", () => ({
  sendInvitationEmail: jest.fn(),
}));

// Импортируем сервисы после мокинга
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
  getUserRoleInTeam,
} from "../../../../src/modules/team/team.service";

import { sendInvitationEmail } from "../../../../src/utils/email";

describe('TeamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    const userId = 'user1';
    const teamData = {
      name: 'Test Team',
      description: 'Test team description',
      avatar: 'avatar-url',
      settings: { defaultAccess: 'READ' }
    };

    it('должен создать команду и добавить создателя как администратора', async () => {
      const expectedTeam = {
        id: 'team1',
        name: teamData.name,
        description: teamData.description,
        avatar: teamData.avatar,
        settings: teamData.settings,
        ownerId: userId,
        owner: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
          picture: null,
        },
        members: []
      };

      mockPrismaTeam.create.mockResolvedValue(expectedTeam);
      mockPrismaTeamMember.create.mockResolvedValue({});

      const result = await createTeam(userId, teamData);

      expect(mockPrismaTeam.create).toHaveBeenCalledWith({
        data: {
          name: teamData.name,
          description: teamData.description,
          avatar: teamData.avatar,
          settings: teamData.settings,
          ownerId: userId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  picture: true,
                },
              },
            },
          },
        },
      });

      expect(mockPrismaTeamMember.create).toHaveBeenCalledWith({
        data: {
          teamId: 'team1',
          userId: userId,
          role: TeamRole.ADMINISTRATOR,
        },
      });

      expect(result).toEqual(expectedTeam);
    });

    it('должен создать команду с настройками по умолчанию', async () => {
      const minimalTeamData = { name: 'Minimal Team' };
      const expectedTeam = {
        id: 'team1',
        name: minimalTeamData.name,
        settings: {},
        ownerId: userId,
      };

      mockPrismaTeam.create.mockResolvedValue(expectedTeam);
      mockPrismaTeamMember.create.mockResolvedValue({});

      await createTeam(userId, minimalTeamData);

      expect(mockPrismaTeam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: {},
          }),
        })
      );
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      mockPrismaTeam.create.mockRejectedValue(new Error('Database error'));

      await expect(createTeam(userId, teamData)).rejects.toThrow('Database error');
    });
  });

  describe('getUserTeams', () => {
    const userId = 'user1';

    it('должен вернуть все команды пользователя (владельца и участника)', async () => {
      const expectedTeams = [
        {
          id: 'team1',
          name: 'Team 1',
          ownerId: userId,
          members: [],
          _count: { members: 2, projects: 1 }
        },
        {
          id: 'team2',
          name: 'Team 2',
          ownerId: 'other-user',
          members: [{ userId, role: 'MEMBER' }],
          _count: { members: 3, projects: 2 }
        }
      ];

      mockPrismaTeam.findMany.mockResolvedValue(expectedTeams);

      const result = await getUserTeams(userId);

      expect(mockPrismaTeam.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: userId },
            {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  picture: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(expectedTeams);
    });

    it('должен вернуть пустой массив если у пользователя нет команд', async () => {
      mockPrismaTeam.findMany.mockResolvedValue([]);

      const result = await getUserTeams(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getTeamById', () => {
    const userId = 'user1';
    const teamId = 'team1';

    it('должен вернуть команду с полной информацией для участника', async () => {
      const expectedTeam = {
        id: teamId,
        name: 'Test Team',
        ownerId: userId,
        members: [{ userId, role: 'ADMINISTRATOR' }],
        invitations: [],
        projects: [],
      };

      mockPrismaTeam.findFirst.mockResolvedValue(expectedTeam);

      const result = await getTeamById(teamId, userId);

      expect(mockPrismaTeam.findFirst).toHaveBeenCalledWith({
        where: {
          id: teamId,
          OR: [
            { ownerId: userId },
            {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
        include: expect.objectContaining({
          owner: expect.any(Object),
          members: expect.any(Object),
          invitations: expect.any(Object),
          projects: expect.any(Object),
        }),
      });

      expect(result).toEqual(expectedTeam);
    });

    it('должен выбросить ошибку если команда не найдена или нет доступа', async () => {
      mockPrismaTeam.findFirst.mockResolvedValue(null);

      await expect(getTeamById(teamId, userId))
        .rejects.toThrow('Команда не найдена или нет доступа');
    });
  });

  describe('updateTeam', () => {
    const userId = 'user1';
    const teamId = 'team1';
    const updateData = {
      name: 'Updated Team',
      description: 'Updated description'
    };

    it('должен обновить команду если пользователь - владелец', async () => {
      const member = {
        role: TeamRole.ADMINISTRATOR,
        team: { ownerId: userId }
      };

      const updatedTeam = {
        id: teamId,
        name: updateData.name,
        description: updateData.description,
      };

      mockPrismaTeamMember.findFirst.mockResolvedValue(member);
      mockPrismaTeam.update.mockResolvedValue(updatedTeam);

      const result = await updateTeam(teamId, userId, updateData);

      expect(mockPrismaTeam.update).toHaveBeenCalledWith({
        where: { id: teamId },
        data: {
          name: updateData.name,
          description: updateData.description,
          avatar: undefined,
          settings: undefined,
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(updatedTeam);
    });

    it('должен выбросить ошибку если нет прав на редактирование', async () => {
      mockPrismaTeamMember.findFirst.mockResolvedValue(null);

      await expect(updateTeam(teamId, userId, updateData))
        .rejects.toThrow('Недостаточно прав для редактирования команды');
    });
  });

  describe('deleteTeam', () => {
    const userId = 'user1';
    const teamId = 'team1';

    it('должен удалить команду если пользователь - владелец', async () => {
      const team = {
        ownerId: userId,
        projects: [{ projectId: 'project1' }]
      };

      mockPrismaTeam.findUnique.mockResolvedValue(team);
      mockPrismaTransaction.mockImplementation(async (callback) => {
        // Имитируем выполнение транзакции
        const tx = {
          projectMember: { deleteMany: jest.fn() },
          project: { delete: jest.fn() },
          team: { delete: jest.fn() },
        };
        return callback(tx);
      });

      const result = await deleteTeam(teamId, userId);

      expect(mockPrismaTeam.findUnique).toHaveBeenCalledWith({
        where: { id: teamId },
        select: {
          ownerId: true,
          projects: {
            select: {
              projectId: true
            }
          }
        },
      });

      expect(result).toEqual({ message: "Команда и все связанные проекты успешно удалены" });
    });

    it('должен выбросить ошибку если команда не найдена', async () => {
      mockPrismaTeam.findUnique.mockResolvedValue(null);

      await expect(deleteTeam(teamId, userId))
        .rejects.toThrow('Команда не найдена');
    });

    it('должен выбросить ошибку если пользователь не владелец', async () => {
      const team = {
        ownerId: 'other-user',
        projects: []
      };

      mockPrismaTeam.findUnique.mockResolvedValue(team);

      await expect(deleteTeam(teamId, userId))
        .rejects.toThrow('Только владелец может удалить команду');
    });
  });

  describe('inviteMember', () => {
    const userId = 'user1';
    const teamId = 'team1';
    const inviteData = {
      email: 'new@example.com',
      role: TeamRole.MEMBER
    };

    it('должен создать приглашение если у пользователя есть права', async () => {
      const member = {
        role: TeamRole.ADMINISTRATOR,
      };

      const expectedInvitation = {
        id: 'invitation1',
        teamId,
        email: inviteData.email,
        role: inviteData.role,
        invitedBy: userId,
        token: 'test-token',
        team: { id: teamId, name: 'Test Team' },
        inviter: { id: userId, name: 'Test User', email: 'test@example.com' }
      };

      // Мокаем getUserRoleInTeam для проверки прав пользователя
      mockPrismaTeamMember.findFirst
        .mockResolvedValueOnce(member) // Права пользователя (getUserRoleInTeam)
        .mockResolvedValueOnce(null); // Нет существующего участника (проверка участия)
      mockPrismaTeamInvitation.findFirst.mockResolvedValue(null); // Нет активного приглашения
      mockPrismaTeamInvitation.create.mockResolvedValue(expectedInvitation);

      const result = await inviteMember(teamId, userId, inviteData);

      expect(mockPrismaTeamInvitation.create).toHaveBeenCalledWith({
        data: {
          teamId,
          email: inviteData.email,
          role: inviteData.role,
          invitedBy: userId,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        },
        include: expect.any(Object),
      });

      expect(sendInvitationEmail).toHaveBeenCalledWith(
        inviteData.email,
        expect.any(String),
        'Test Team',
        'Test User'
      );

      expect(result).toEqual(expectedInvitation);
    });

    it('должен выбросить ошибку если недостаточно прав', async () => {
      const member = {
        role: TeamRole.MEMBER, // Недостаточно прав
      };

      mockPrismaTeamMember.findFirst.mockResolvedValue(member);

      await expect(inviteMember(teamId, userId, inviteData))
        .rejects.toThrow('Недостаточно прав для приглашения участников');
    });

    it('должен выбросить ошибку если пользователь уже участник', async () => {
      const member = { role: TeamRole.ADMINISTRATOR };
      const existingMember = { userId: 'existing-user' };

      mockPrismaTeamMember.findFirst
        .mockResolvedValueOnce(member) // Права текущего пользователя
        .mockResolvedValueOnce(existingMember); // Существующий участник

      await expect(inviteMember(teamId, userId, inviteData))
        .rejects.toThrow('Пользователь уже является участником команды');
    });

    it('должен выбросить ошибку если приглашение уже отправлено', async () => {
      const member = { role: TeamRole.ADMINISTRATOR };
      const existingInvitation = { id: 'invitation1' };

      mockPrismaTeamMember.findFirst
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(null); // Не участник
      mockPrismaTeamInvitation.findFirst.mockResolvedValue(existingInvitation);

      await expect(inviteMember(teamId, userId, inviteData))
        .rejects.toThrow('Приглашение уже отправлено этому email');
    });
  });

  describe('acceptInvitation', () => {
    const userId = 'user1';
    const token = 'invitation-token';

    it('должен принять приглашение и добавить пользователя в команду', async () => {
      const invitation = {
        id: 'invitation1',
        teamId: 'team1',
        email: 'user@example.com',
        role: TeamRole.MEMBER,
        status: TeamInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Завтра
        team: { id: 'team1', name: 'Test Team' }
      };

      const user = { email: 'user@example.com' };

      mockPrismaTeamInvitation.findUnique.mockResolvedValue(invitation);
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaTeamMember.findFirst.mockResolvedValue(null); // Не участник
      mockPrismaTransaction.mockImplementation(async (operations) => {
        return operations;
      });

      const result = await acceptInvitation(token, userId);

      expect(mockPrismaTeamInvitation.findUnique).toHaveBeenCalledWith({
        where: { token },
        include: { team: true },
      });

      expect(result).toEqual(invitation.team);
    });

    it('должен выбросить ошибку если приглашение не найдено', async () => {
      mockPrismaTeamInvitation.findUnique.mockResolvedValue(null);

      await expect(acceptInvitation(token, userId))
        .rejects.toThrow('Приглашение не найдено');
    });

    it('должен выбросить ошибку если приглашение истекло', async () => {
      const expiredInvitation = {
        id: 'invitation1',
        status: TeamInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Вчера
      };

      mockPrismaTeamInvitation.findUnique.mockResolvedValue(expiredInvitation);
      mockPrismaTeamInvitation.update.mockResolvedValue({});

      await expect(acceptInvitation(token, userId))
        .rejects.toThrow('Приглашение истекло');

      expect(mockPrismaTeamInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation1' },
        data: { status: TeamInvitationStatus.EXPIRED },
      });
    });

    it('должен выбросить ошибку если email не совпадает', async () => {
      const invitation = {
        status: TeamInvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        email: 'other@example.com'
      };

      const user = { email: 'user@example.com' };

      mockPrismaTeamInvitation.findUnique.mockResolvedValue(invitation);
      mockPrismaUser.findUnique.mockResolvedValue(user);

      await expect(acceptInvitation(token, userId))
        .rejects.toThrow('Приглашение отправлено на другой email');
    });
  });

  describe('declineInvitation', () => {
    const token = 'invitation-token';

    it('должен отклонить приглашение', async () => {
      const invitation = {
        status: TeamInvitationStatus.PENDING
      };

      mockPrismaTeamInvitation.findUnique.mockResolvedValue(invitation);
      mockPrismaTeamInvitation.delete.mockResolvedValue({});

      const result = await declineInvitation(token);

      expect(mockPrismaTeamInvitation.delete).toHaveBeenCalledWith({
        where: { token }
      });

      expect(result).toEqual({ message: "Приглашение отклонено" });
    });

    it('должен выбросить ошибку если приглашение не найдено', async () => {
      mockPrismaTeamInvitation.findUnique.mockResolvedValue(null);

      await expect(declineInvitation(token))
        .rejects.toThrow('Приглашение не найдено или уже недействительно');
    });
  });

  describe('updateMemberRole', () => {
    const userId = 'user1';
    const teamId = 'team1';
    const memberId = 'member1';
    const newRole = { role: TeamRole.MANAGER };

    it('должен обновить роль участника если пользователь - администратор', async () => {
      const currentUserMember = { role: TeamRole.ADMINISTRATOR };
      const memberToUpdate = { id: memberId, userId: 'member-user-id', teamId: teamId };
      const updatedMember = {
        id: memberId,
        role: newRole.role,
        user: { id: 'member-user-id', name: 'Member', email: 'member@example.com' }
      };

      // Мокаем getUserRoleInTeam для проверки прав
      mockPrismaTeamMember.findFirst.mockResolvedValueOnce(currentUserMember);
      
      // Мокаем поиск участника для обновления (findUnique)
      mockPrismaTeamMember.findUnique.mockResolvedValue(memberToUpdate);

      mockPrismaTeamMember.update.mockResolvedValue(updatedMember);

      const result = await updateMemberRole(teamId, memberId, userId, newRole);

      expect(mockPrismaTeamMember.update).toHaveBeenCalledWith({
        where: { id: memberId, teamId: teamId },
        data: { role: newRole.role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
        },
      });

      expect(result).toEqual(updatedMember);
    });

    it('должен выбросить ошибку если недостаточно прав', async () => {
      const currentUserMember = { role: TeamRole.MEMBER };

      mockPrismaTeamMember.findFirst.mockResolvedValue(currentUserMember);

      await expect(updateMemberRole(teamId, memberId, userId, newRole))
        .rejects.toThrow('У вас нет прав для изменения роли');
    });

    it('должен выбросить ошибку если участник не найден', async () => {
      const currentUserMember = { role: TeamRole.ADMINISTRATOR };

      // Мокаем getUserRoleInTeam для проверки прав
      mockPrismaTeamMember.findFirst.mockResolvedValueOnce(currentUserMember);
      
      // Мокаем поиск участника - не найден (findUnique)
      mockPrismaTeamMember.findUnique.mockResolvedValueOnce(null);

      await expect(updateMemberRole(teamId, memberId, userId, newRole))
        .rejects.toThrow('Участник не найден');
    });
  });

  describe('removeMember', () => {
    const userId = 'user1';
    const teamId = 'team1';
    const memberId = 'member1';

    it('должен удалить участника если пользователь - администратор', async () => {
      const currentUserMember = { 
        role: TeamRole.ADMINISTRATOR,
        team: { ownerId: 'other-user', id: teamId }
      };
      const memberToRemove = { 
        id: memberId, 
        userId: 'member-user-id', 
        teamId: teamId, 
        user: { id: 'member-user-id', name: 'Member' }
      };

      // Мокаем getUserRoleInTeam для проверки прав текущего пользователя
      mockPrismaTeamMember.findFirst.mockResolvedValueOnce(currentUserMember);
      
      // Мокаем поиск участника для удаления (findUnique)
      mockPrismaTeamMember.findUnique.mockResolvedValueOnce(memberToRemove);
      mockPrismaTeamMember.delete.mockResolvedValue({});

      const result = await removeMember(teamId, memberId, userId);

      expect(mockPrismaTeamMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      });

      expect(result).toEqual({ message: "Участник удален из команды" });
    });

    it('должен выбросить ошибку если участник не найден', async () => {
      const currentUserMember = { 
        role: TeamRole.ADMINISTRATOR,
        team: { ownerId: 'other-user', id: teamId }
      };

      // Мокаем getUserRoleInTeam для проверки прав
      mockPrismaTeamMember.findFirst.mockResolvedValueOnce(currentUserMember);
      
      // Мокаем поиск участника - не найден (findUnique)
      mockPrismaTeamMember.findUnique.mockResolvedValueOnce(null);

      await expect(removeMember(teamId, memberId, userId))
        .rejects.toThrow('Участник не найден');
    });

    it('должен выбросить ошибку если недостаточно прав', async () => {
      const currentUserMember = { 
        role: TeamRole.MEMBER,
        team: { ownerId: 'other-user', id: teamId }
      };

      // Мокаем getUserRoleInTeam для проверки прав - недостаточно прав
      mockPrismaTeamMember.findFirst.mockResolvedValueOnce(currentUserMember);

      await expect(removeMember(teamId, memberId, userId))
        .rejects.toThrow('Недостаточно прав для удаления участника');
    });
  });

  describe('getUserRoleInTeam', () => {
    const userId = 'user1';
    const teamId = 'team1';

    it('должен вернуть роль пользователя в команде', async () => {
      const expectedMember = {
        role: TeamRole.ADMINISTRATOR,
        team: {
          id: teamId,
          ownerId: 'user1'
        }
      };

      mockPrismaTeamMember.findFirst.mockResolvedValue(expectedMember);

      const result = await getUserRoleInTeam(teamId, userId);

      expect(mockPrismaTeamMember.findFirst).toHaveBeenCalledWith({
        where: {
          teamId,
          userId
        },
        include: {
          team: {
            select: {
              id: true,
              ownerId: true,
            },
          },
        },
      });

      expect(result).toEqual(expectedMember);
    });

    it('должен вернуть null если пользователь не является участником', async () => {
      mockPrismaTeamMember.findFirst.mockResolvedValue(null);

      const result = await getUserRoleInTeam(teamId, userId);

      expect(result).toBeNull();
    });
  });
}); 