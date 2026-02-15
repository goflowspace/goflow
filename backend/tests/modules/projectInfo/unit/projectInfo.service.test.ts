// Мокаем Prisma клиент
const mockPrismaProject = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
};

const mockPrismaProjectInfo = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock("../../../../src/config/prisma", () => ({
  prisma: {
    project: mockPrismaProject,
    projectInfo: mockPrismaProjectInfo,
  },
}));

// Импортируем сервисы после мокинга
import {
  getProjectInfoService,
  createProjectInfoService,
  updateProjectInfoService,
  checkUserProjectAccess
} from "../../../../src/modules/projectInfo/projectInfo.service";

// Импортируем типы
import {
  ProjectGenre,
  ProjectFormat,
  ProjectInfoStatus
} from "../../../../src/types/types";

describe('ProjectInfoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectInfoService', () => {
    const projectId = 'project-123';

    it('должен возвращать информацию о проекте если она существует', async () => {
      const mockProjectInfo = {
        id: 'info-123',
        projectId: projectId,
        logline: 'Test logline',
        synopsis: 'Test synopsis',
        genres: ['rpg', 'adventure'],
        formats: ['visual_novel'],
        status: 'concept',
        setting: 'Fantasy world',
        targetAudience: 'Teens',
        mainThemes: 'Friendship',
        message: 'Be yourself',
        references: 'LOTR',
        uniqueFeatures: 'Magic system',
        atmosphere: 'Dark',
        constraints: 'Budget',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrismaProjectInfo.findUnique.mockResolvedValue(mockProjectInfo);

      const result = await getProjectInfoService(projectId);

      expect(mockPrismaProjectInfo.findUnique).toHaveBeenCalledWith({
        where: { projectId: projectId }
      });
      expect(result).toEqual(mockProjectInfo);
    });

    it('должен возвращать null если информация о проекте не найдена', async () => {
      mockPrismaProjectInfo.findUnique.mockResolvedValue(null);

      const result = await getProjectInfoService(projectId);

      expect(result).toBeNull();
    });
  });

  describe('createProjectInfoService', () => {
    const projectId = 'project-123';
    const projectInfoData = {
      logline: 'Test logline',
      synopsis: 'Test synopsis',
      genres: ['rpg' as ProjectGenre],
      formats: ['visual_novel' as ProjectFormat],
      status: 'concept' as ProjectInfoStatus,
      setting: 'Fantasy world'
    };

    it('должен создать информацию о проекте', async () => {
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockCreatedInfo = {
        id: 'info-123',
        projectId: projectId,
        ...projectInfoData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrismaProject.findUnique.mockResolvedValue(mockProject);
      mockPrismaProjectInfo.findUnique.mockResolvedValue(null);
      mockPrismaProjectInfo.create.mockResolvedValue(mockCreatedInfo);

      const result = await createProjectInfoService(projectId, projectInfoData);

      expect(mockPrismaProject.findUnique).toHaveBeenCalledWith({
        where: { id: projectId }
      });
      expect(mockPrismaProjectInfo.findUnique).toHaveBeenCalledWith({
        where: { projectId }
      });
      expect(mockPrismaProjectInfo.create).toHaveBeenCalledWith({
        data: {
          projectId,
          logline: projectInfoData.logline,
          synopsis: projectInfoData.synopsis,
          genres: projectInfoData.genres,
          formats: projectInfoData.formats,
          status: projectInfoData.status,
          setting: projectInfoData.setting,
          targetAudience: undefined,
          mainThemes: undefined,
          message: undefined,
          references: undefined,
          uniqueFeatures: undefined,
          atmosphere: undefined,
          constraints: undefined
        }
      });
      expect(result).toEqual(mockCreatedInfo);
    });

    it('должен выбросить ошибку если проект не найден', async () => {
      mockPrismaProject.findUnique.mockResolvedValue(null);

      await expect(createProjectInfoService(projectId, projectInfoData))
        .rejects.toThrow('Проект не найден');
    });

    it('должен выбросить ошибку если информация о проекте уже существует', async () => {
      const mockProject = { id: projectId, name: 'Test Project' };
      const existingInfo = { id: 'info-123', projectId };

      mockPrismaProject.findUnique.mockResolvedValue(mockProject);
      mockPrismaProjectInfo.findUnique.mockResolvedValue(existingInfo);

      await expect(createProjectInfoService(projectId, projectInfoData))
        .rejects.toThrow('Информация о проекте уже существует');
    });
  });

  describe('updateProjectInfoService', () => {
    const projectId = 'project-123';
    const updateData = {
      logline: 'Updated logline',
      status: 'production' as ProjectInfoStatus
    };

    it('должен обновить существующую информацию о проекте', async () => {
      const existingInfo = { id: 'info-123', projectId };
      const updatedInfo = {
        ...existingInfo,
        ...updateData,
        updatedAt: new Date()
      };

      mockPrismaProjectInfo.findUnique.mockResolvedValue(existingInfo);
      mockPrismaProjectInfo.update.mockResolvedValue(updatedInfo);

      const result = await updateProjectInfoService(projectId, updateData);

      expect(mockPrismaProjectInfo.findUnique).toHaveBeenCalledWith({
        where: { projectId }
      });
      expect(mockPrismaProjectInfo.update).toHaveBeenCalledWith({
        where: { projectId },
        data: {
          logline: updateData.logline,
          synopsis: undefined,
          genres: undefined,
          formats: undefined,
          status: updateData.status,
          setting: undefined,
          targetAudience: undefined,
          mainThemes: undefined,
          message: undefined,
          references: undefined,
          uniqueFeatures: undefined,
          atmosphere: undefined,
          constraints: undefined
        }
      });
      expect(result).toEqual(updatedInfo);
    });

    it('должен создать новую информацию если её не существует', async () => {
      mockPrismaProjectInfo.findUnique.mockResolvedValue(null);
      
      // Мокаем createProjectInfoService через его реализацию
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockCreatedInfo = {
        id: 'info-123',
        projectId: projectId,
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrismaProject.findUnique.mockResolvedValue(mockProject);
      mockPrismaProjectInfo.create.mockResolvedValue(mockCreatedInfo);

      const result = await updateProjectInfoService(projectId, updateData);

      expect(result).toEqual(mockCreatedInfo);
    });
  });

  describe('checkUserProjectAccess', () => {
    const userId = 'user-123';
    const projectId = 'project-123';

    it('должен возвращать true если пользователь создатель проекта', async () => {
      const mockProject = {
        id: projectId,
        creatorId: userId,
        members: [],
        teamProjects: []
      };

      mockPrismaProject.findFirst.mockResolvedValue(mockProject);

      const result = await checkUserProjectAccess(userId, projectId);

      expect(mockPrismaProject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: projectId,
            OR: expect.arrayContaining([
              { creatorId: userId },
              expect.objectContaining({ members: { some: { userId } } })
            ])
          })
        })
      );
      expect(result).toBe(true);
    });

    it('должен возвращать true если пользователь участник проекта', async () => {
      const mockProject = {
        id: projectId,
        creatorId: 'other-user',
        members: [{ userId: userId, role: 'EDITOR' }],
        teamProjects: []
      };

      mockPrismaProject.findFirst.mockResolvedValue(mockProject);

      const result = await checkUserProjectAccess(userId, projectId);

      expect(result).toBe(true);
    });

    it('должен возвращать false если пользователь не имеет доступа', async () => {
      mockPrismaProject.findFirst.mockResolvedValue(null);

      const result = await checkUserProjectAccess(userId, projectId);

      expect(result).toBe(false);
    });
  });
}); 