// 1. Мокаем реальный путь к Prisma клиенту
jest.mock("../../../../src/config/prisma", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    bibleQuality: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// 2. Импортируем мокнутый инстанс Prisma
const { prisma } = require("../../../../src/config/prisma");

// 3. Импортируем сервисы, которые будем тестировать
import {
  getBibleQualityService,
  createOrUpdateBibleQualityService,
  checkUserProjectAccess
} from "../../../../src/modules/bibleQuality/bibleQuality.service";

describe('BibleQualityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBibleQualityService', () => {
    const projectId = 'project1';

    it('должен вернуть null если оценка качества не найдена', async () => {
      prisma.bibleQuality.findUnique.mockResolvedValue(null);

      const result = await getBibleQualityService(projectId);

      expect(prisma.bibleQuality.findUnique).toHaveBeenCalledWith({
        where: { projectId }
      });
      expect(result).toBeNull();
    });

    it('должен вернуть оценку качества если она существует', async () => {
      const mockBibleQuality = {
        id: 'quality1',
        projectId: 'project1',
        totalScore: 85,
        completenessScore: 90,
        qualityScore: 80,
        consistencyScore: 85,
        completeness: {
          critical: {
            logline: true,
            synopsis: true,
            genres: true
          },
          important: {
            setting: true,
            targetAudience: false,
            mainThemes: true,
            atmosphere: true
          },
          optional: {
            message: false,
            references: true,
            uniqueFeatures: false,
            constraints: false
          }
        },
        recommendations: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      prisma.bibleQuality.findUnique.mockResolvedValue(mockBibleQuality);

      const result = await getBibleQualityService(projectId);

      expect(result).toEqual(mockBibleQuality);
    });
  });

  describe('createOrUpdateBibleQualityService', () => {
    const projectId = 'project1';
    const userId = 'user1';

    const mockProject = {
      id: projectId,
      name: 'Test Project',
      creatorId: userId,
      projectInfo: {
        logline: 'Краткое описание проекта длиной около 80 символов для тестирования качества',
        synopsis: 'Развернутый синопсис проекта, который описывает основные события и сюжетные линии. Этот текст должен быть достаточно длинным, чтобы соответствовать требованиям минимальной длины синопсиса для корректной оценки качества библии проекта. В нем должны быть раскрыты ключевые моменты сюжета, главные герои и основной конфликт истории.',
        genres: ['драма', 'триллер'],
        setting: 'Современный город с его проблемами и возможностями, где разворачиваются основные события',
        targetAudience: '',
        mainThemes: 'Темы дружбы, предательства и поиска смысла жизни',
        atmosphere: 'Напряженная атмосфера с элементами саспенса',
        message: '',
        references: 'Ссылки на классические произведения драматургии',
        uniqueFeatures: '',
        constraints: ''
      }
    };

    it('должен выбросить ошибку если проект не найден', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(createOrUpdateBibleQualityService(projectId)).rejects.toThrow('Проект не найден');

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { projectInfo: true }
      });
    });

    it('должен вернуть существующую оценку если она есть и не требуется пересчет', async () => {
      const existingQuality = {
        id: 'quality1',
        projectId: 'project1',
        totalScore: 85,
        completenessScore: 90,
        qualityScore: 80,
        consistencyScore: 85,
        completeness: {},
        recommendations: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.bibleQuality.findUnique.mockResolvedValue(existingQuality);

      const result = await createOrUpdateBibleQualityService(projectId, false);

      expect(result).toEqual(existingQuality);
      expect(prisma.bibleQuality.upsert).not.toHaveBeenCalled();
    });

    it('должен создать новую оценку если она не существует', async () => {
      const newQuality = {
        id: 'quality1',
        projectId: 'project1',
        totalScore: 64,
        completenessScore: 70,
        qualityScore: 65,
        consistencyScore: 60,
        completeness: expect.any(Object),
        recommendations: expect.any(Array),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.bibleQuality.findUnique.mockResolvedValue(null);
      prisma.bibleQuality.upsert.mockResolvedValue(newQuality);

      const result = await createOrUpdateBibleQualityService(projectId);

      expect(prisma.bibleQuality.upsert).toHaveBeenCalled();
      expect(result).toEqual(newQuality);
    });

    it('должен принудительно пересчитать оценку когда forceRecalculate = true', async () => {
      const existingQuality = {
        id: 'quality1',
        projectId: 'project1',
        totalScore: 85,
        completenessScore: 90,
        qualityScore: 80,
        consistencyScore: 85,
        completeness: {},
        recommendations: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      const updatedQuality = {
        ...existingQuality,
        totalScore: 70,
        updatedAt: new Date('2024-01-02')
      };

      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.bibleQuality.findUnique.mockResolvedValue(existingQuality);
      prisma.bibleQuality.upsert.mockResolvedValue(updatedQuality);

      const result = await createOrUpdateBibleQualityService(projectId, true);

      expect(prisma.bibleQuality.upsert).toHaveBeenCalled();
      expect(result).toEqual(updatedQuality);
    });

    describe('расчет качества', () => {
      beforeEach(() => {
        prisma.project.findUnique.mockResolvedValue(mockProject);
        prisma.bibleQuality.findUnique.mockResolvedValue(null);
      });

      it('должен правильно рассчитать заполненность для полного проекта', async () => {
        const completeProject = {
          ...mockProject,
          projectInfo: {
            ...mockProject.projectInfo,
            targetAudience: 'Взрослая аудитория 18-35 лет',
            message: 'Основное послание истории',
            uniqueFeatures: 'Уникальные особенности проекта',
            constraints: 'Ограничения производства'
          }
        };

        prisma.project.findUnique.mockResolvedValue(completeProject);
        prisma.bibleQuality.upsert.mockImplementation((args: any) => {
          return Promise.resolve({
            id: 'quality1',
            projectId: 'project1',
            ...args.create,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        const result = await createOrUpdateBibleQualityService(projectId);

        expect(result.completenessScore).toBe(100); // Все поля заполнены (100% после масштабирования)
      });

      it('должен правильно рассчитать заполненность для проекта с минимальными данными', async () => {
        const minimalProject = {
          ...mockProject,
          projectInfo: {
            logline: 'Минимальный логлайн для теста',
            synopsis: '',
            genres: [],
            setting: '',
            targetAudience: '',
            mainThemes: '',
            atmosphere: '',
            message: '',
            references: '',
            uniqueFeatures: '',
            constraints: ''
          }
        };

        prisma.project.findUnique.mockResolvedValue(minimalProject);
        prisma.bibleQuality.upsert.mockImplementation((args: any) => {
          return Promise.resolve({
            id: 'quality1',
            projectId: 'project1',
            ...args.create,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        const result = await createOrUpdateBibleQualityService(projectId);

        expect(result.completenessScore).toBe(19); // Только логлайн заполнен (1/3 критичных = ~19% после масштабирования)
      });

      it('должен генерировать рекомендации для незаполненных критичных полей', async () => {
        const incompleteProject = {
          ...mockProject,
          projectInfo: {
            logline: '',
            synopsis: '',
            genres: [],
            setting: 'Современный город',
            targetAudience: '',
            mainThemes: '',
            atmosphere: '',
            message: '',
            references: '',
            uniqueFeatures: '',
            constraints: ''
          }
        };

        prisma.project.findUnique.mockResolvedValue(incompleteProject);
        prisma.bibleQuality.upsert.mockImplementation((args: any) => {
          return Promise.resolve({
            id: 'quality1',
            projectId: 'project1',
            ...args.create,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        const result = await createOrUpdateBibleQualityService(projectId);

        const recommendationTypes = result.recommendations.map(r => r.type);
        expect(recommendationTypes).toContain('MISSING_FIELD');
        
        const recommendationFields = result.recommendations.map(r => r.field);
        expect(recommendationFields).toContain('logline');
        expect(recommendationFields).toContain('synopsis');
        expect(recommendationFields).toContain('genres');
      });

      it('должен генерировать рекомендации по длине логлайна', async () => {
        const shortLoglineProject = {
          ...mockProject,
          projectInfo: {
            ...mockProject.projectInfo,
            logline: 'Короткий'
          }
        };

        prisma.project.findUnique.mockResolvedValue(shortLoglineProject);
        prisma.bibleQuality.upsert.mockImplementation((args: any) => {
          return Promise.resolve({
            id: 'quality1',
            projectId: 'project1',
            ...args.create,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        const result = await createOrUpdateBibleQualityService(projectId);

        const loglineRecommendations = result.recommendations.filter(r => r.field === 'logline');
        expect(loglineRecommendations).toHaveLength(1);
        expect(loglineRecommendations[0].type).toBe('TOO_SHORT');
      });

      it('должен генерировать рекомендации по длине синопсиса', async () => {
        const shortSynopsisProject = {
          ...mockProject,
          projectInfo: {
            ...mockProject.projectInfo,
            synopsis: 'Слишком короткий синопсис'
          }
        };

        prisma.project.findUnique.mockResolvedValue(shortSynopsisProject);
        prisma.bibleQuality.upsert.mockImplementation((args: any) => {
          return Promise.resolve({
            id: 'quality1',
            projectId: 'project1',
            ...args.create,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        const result = await createOrUpdateBibleQualityService(projectId);

        const synopsisRecommendations = result.recommendations.filter(r => r.field === 'synopsis');
        expect(synopsisRecommendations).toHaveLength(1);
        expect(synopsisRecommendations[0].type).toBe('TOO_SHORT');
      });
    });
  });

  describe('checkUserProjectAccess', () => {
    const userId = 'user1';
    const projectId = 'project1';

    it('должен вернуть true если пользователь является создателем проекта', async () => {
      const mockProject = {
        id: projectId,
        creatorId: userId,
        members: [],
        teamProjects: []
      };

      prisma.project.findFirst.mockResolvedValue(mockProject);

      const result = await checkUserProjectAccess(userId, projectId);

      expect(result).toBe(true);
      expect(prisma.project.findFirst).toHaveBeenCalledWith(
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
    });

    it('должен вернуть true если пользователь является участником проекта', async () => {
      const mockProject = {
        id: projectId,
        creatorId: 'other-user',
        members: [{ userId: userId }],
        teamProjects: []
      };

      prisma.project.findFirst.mockResolvedValue(mockProject);

      const result = await checkUserProjectAccess(userId, projectId);

      expect(result).toBe(true);
    });

    it('должен вернуть false если пользователь не имеет доступа к проекту', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      const result = await checkUserProjectAccess(userId, projectId);

      expect(result).toBe(false);
    });

    it('должен вернуть false если проект не найден', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      const result = await checkUserProjectAccess(userId, 'non-existent-project');

      expect(result).toBe(false);
    });
  });
}); 