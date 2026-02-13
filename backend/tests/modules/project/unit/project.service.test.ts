import { ProjectMember } from "@prisma/client";

// 1. Мокаем реальный путь к Prisma клиенту
jest.mock("../../../../src/config/prisma", () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      deleteMany: jest.fn(),
    },
    projectVersion: {
      create: jest.fn(),
    },
    teamMember: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// 2. Импортируем мокнутый инстанс Prisma
const { prisma } = require("../../../../src/config/prisma");

// 3. Импортируем сервисы, которые будем тестировать
import {
  createProjectService,
  updateProjectService,
  getUserProjectsService,
  deleteProjectService,
  importToProjectService,
  duplicateProjectService
} from "../../../../src/modules/project/project.service";


describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProjectService', () => {
    const userId = 'user1';
    const projectName = 'Test Project';
    const projectData = { nodes: [], connections: [] };

    it('должен создать новый проект с указанными данными', async () => {
      const expectedProject = { id: 'project1', name: projectName, creatorId: userId, data: projectData };
      prisma.project.create.mockResolvedValue(expectedProject);

      const result = await createProjectService(userId, projectName, projectData);

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
            name: projectName,
            creatorId: userId,
            data: projectData,
            members: {
                create: {
                    userId: userId,
                    role: 'OWNER',
                },
            },
            projectInfo: {
                create: {
                    status: 'concept',
                    genres: [],
                    formats: [],
                },
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            },
            projectInfo: true,
        },
      });
      expect(result).toEqual(expectedProject);
    });

    it('должен создать проект с именем "Untitled" если имя не указано', async () => {
      const expectedProject = { id: 'project1', name: 'Untitled', creatorId: userId, data: null };
      prisma.project.create.mockResolvedValue(expectedProject);
      await createProjectService(userId);
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Untitled' }),
        })
      );
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      prisma.project.create.mockRejectedValue(new Error('Database error'));
      await expect(createProjectService(userId, projectName)).rejects.toThrow('Database error');
    });
  });

  describe('getUserProjectsService', () => {
    const userId = 'user1';
    it('должен вернуть проекты пользователя', async () => {
      const expectedProjects = [{ id: 'project1', name: 'Project 1' }, { id: 'project2', name: 'Project 2' }];
      prisma.project.findMany.mockResolvedValue(expectedProjects);

      const result = await getUserProjectsService(userId);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId } } },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            },
            projectInfo: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
      });
      expect(result).toEqual(expectedProjects);
    });

    it('должен вернуть пустой массив если у пользователя нет проектов', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      const result = await getUserProjectsService(userId);
      expect(result).toEqual([]);
    });
  });

  describe('updateProjectService', () => {
    const userId = 'user1';
    const projectId = 'project1';
    const newName = 'New Project Name';

    it('должен обновить имя проекта для владельца', async () => {
        const project = { id: projectId, name: 'Old Name', members: [{ userId, role: 'OWNER' } as ProjectMember] };
        const updatedProject = { ...project, name: newName };
        prisma.project.findUnique.mockResolvedValue(project);
        prisma.project.update.mockResolvedValue(updatedProject);

        const result = await updateProjectService(userId, projectId, newName);

        expect(prisma.project.update).toHaveBeenCalledWith({
          where: { id: projectId },
          data: { name: newName },
          include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            },
          },
        });
        expect(result).toEqual(updatedProject);
    });

    it('должен обновить имя проекта для админа', async () => {
      const project = { id: projectId, members: [{ userId, role: 'ADMIN' } as ProjectMember] };
      prisma.project.findUnique.mockResolvedValue(project);
      prisma.project.update.mockResolvedValue(project);
      await updateProjectService(userId, projectId, newName);
      expect(prisma.project.update).toHaveBeenCalled();
    });

    it('должен выбросить ошибку если проект не найден', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(updateProjectService(userId, projectId, newName))
          .rejects.toThrow('Проект не найден');
    });

    it('должен выбросить ошибку если нет прав на редактирование', async () => {
      const project = { id: projectId, members: [{ userId, role: 'VIEWER' } as ProjectMember] };
      prisma.project.findUnique.mockResolvedValue(project);
      await expect(updateProjectService(userId, projectId, newName)).rejects.toThrow('Нет прав на редактирование проекта');
    });

    it('должен выбросить ошибку если пользователь не является участником', async () => {
      const project = { id: projectId, members: [{ userId: 'other-user', role: 'OWNER' } as ProjectMember] };
      prisma.project.findUnique.mockResolvedValue(project);
      await expect(updateProjectService(userId, projectId, newName))
          .rejects.toThrow('Нет прав на редактирование проекта');
    });
  });

  describe('deleteProjectService', () => {
    const userId = 'user1';
    const projectId = 'project1';

    it('должен удалить проект для владельца', async () => {
        const project = { id: projectId, members: [{ userId, role: 'OWNER' } as ProjectMember] };
        prisma.project.findUnique.mockResolvedValue(project);
        prisma.projectMember.deleteMany.mockResolvedValue({ count: 1 });
        prisma.project.delete.mockResolvedValue(project);

        const result = await deleteProjectService(userId, projectId);

        expect(prisma.projectMember.deleteMany).toHaveBeenCalledWith({ where: { projectId } });
        expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: projectId } });
        expect(result).toEqual(project);
    });

    it('должен выбросить ошибку если проект не найден', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(deleteProjectService(userId, projectId))
          .rejects.toThrow('Проект не найден');
    });

    it('должен выбросить ошибку если пользователь не владелец', async () => {
      const project = { id: projectId, members: [{ userId, role: 'ADMIN' } as ProjectMember] };
      prisma.project.findUnique.mockResolvedValue(project);
      await expect(deleteProjectService(userId, projectId)).rejects.toThrow('Удалять проект может только владелец');
    });
  });

  describe('importToProjectService', () => {
    const mockProject = {
      id: 'test-project-id',
      name: 'Test Project',
      members: [
        { userId: 'user-1', role: 'OWNER' }
      ]
    };

    const mockImportData = {
      title: 'Imported Project',
      data: {
        timelines: {
          'base-timeline': {
            layers: { root: { id: 'root', nodes: {}, edges: {}, nodeIds: [] } },
            metadata: {},
            variables: []
          }
        }
      }
    };

    it('должен импортировать данные в проект для владельца', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        return await callback({
          project: {
            findUnique: jest.fn().mockResolvedValue(mockProject),
            update: jest.fn().mockResolvedValue(mockProject),
          },
          projectVersion: {
            findUnique: jest.fn().mockResolvedValue({ version: 1 }),
            upsert: jest.fn().mockResolvedValue({ version: 2 }),
          },
          graphSnapshot: {
            upsert: jest.fn().mockResolvedValue({}),
          }
        });
      });

      prisma.$transaction = mockTransaction as any;

      await importToProjectService('user-1', 'test-project-id', mockImportData);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('должен выбросить ошибку если проект не найден', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        return await callback({
          project: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      prisma.$transaction = mockTransaction as any;

      await expect(
        importToProjectService('user-1', 'non-existent-project', mockImportData)
      ).rejects.toThrow('Проект не найден');
    });

    it('должен выбросить ошибку если нет прав на импорт', async () => {
      const mockProjectWithoutRights = {
        ...mockProject,
        members: [{ userId: 'other-user', role: 'OWNER' }]
      };

      const mockTransaction = jest.fn(async (callback) => {
        return await callback({
          project: {
            findUnique: jest.fn().mockResolvedValue(mockProjectWithoutRights),
          },
        });
      });

      prisma.$transaction = mockTransaction as any;

      await expect(
        importToProjectService('user-1', 'test-project-id', mockImportData)
      ).rejects.toThrow('Нет прав на импорт в проект');
    });

    it('должен работать с данными в старом формате', async () => {
      const oldFormatData = {
        title: 'Old Format Project',
        data: {
          layers: { root: { id: 'root', nodes: {}, edges: {}, nodeIds: [] } },
          layerMetadata: {},
          variables: []
        }
      };

      const mockTransaction = jest.fn(async (callback) => {
        return await callback({
          project: {
            findUnique: jest.fn().mockResolvedValue(mockProject),
            update: jest.fn().mockResolvedValue(mockProject),
          },
          projectVersion: {
            findUnique: jest.fn().mockResolvedValue({ version: 1 }),
            upsert: jest.fn().mockResolvedValue({ version: 2 }),
          },
          graphSnapshot: {
            upsert: jest.fn().mockResolvedValue({}),
          }
        });
      });

      prisma.$transaction = mockTransaction as any;

      await importToProjectService('user-1', 'test-project-id', oldFormatData);

      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('duplicateProjectService', () => {
    const userId = 'user-123';
    const projectId = 'project-456';
    const originalProject = {
      id: projectId,
      name: 'Оригинальный проект',
      data: { nodes: [{ id: 'node1', type: 'narrative' }], edges: [] },
      creatorId: 'original-creator',
      members: [
        { userId: userId, role: 'EDITOR' },
        { userId: 'original-creator', role: 'OWNER' }
      ],
      projectVersion: { version: 1 }
    };

    const duplicatedProject = {
      id: 'new-project-id',
      name: 'Оригинальный проект (copy)',
      data: originalProject.data,
      creatorId: userId,
      members: [
        {
          userId: userId,
          role: 'OWNER',
          user: { id: userId, email: 'test@example.com', name: 'Test User' }
        }
      ]
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('должен успешно дублировать проект для участника проекта', async () => {
      // Настраиваем мок транзакции
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            findUnique: jest.fn().mockResolvedValue(originalProject),
            create: jest.fn().mockResolvedValue(duplicatedProject)
          },
          projectVersion: {
            create: jest.fn().mockResolvedValue({ projectId: 'new-project-id', version: 0 })
          }
        };
        return await callback(mockTx);
      });

      prisma.$transaction = mockTransaction as any;

      const result = await duplicateProjectService(userId, projectId);

      expect(mockTransaction).toHaveBeenCalled();
      expect(result).toEqual(duplicatedProject);
      
      // Проверяем, что проект создается с правильными данными
      const transactionCallback = mockTransaction.mock.calls[0][0];
      const mockTx = {
        project: {
          findUnique: jest.fn().mockResolvedValue(originalProject),
          create: jest.fn().mockResolvedValue(duplicatedProject)
        },
        projectVersion: {
          create: jest.fn().mockResolvedValue({ projectId: 'new-project-id', version: 0 })
        }
      };
      
      await transactionCallback(mockTx);
      
      expect(mockTx.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Оригинальный проект (copy)',
          data: originalProject.data,
          creatorId: userId,
          members: {
            create: {
              userId: userId,
              role: 'OWNER'
            }
          }
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, email: true, name: true } }
            }
          }
        }
      });
    });

    it('должен создать начальную версию для дублированного проекта', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            findUnique: jest.fn().mockResolvedValue(originalProject),
            create: jest.fn().mockResolvedValue(duplicatedProject)
          },
          projectVersion: {
            create: jest.fn().mockResolvedValue({ projectId: 'new-project-id', version: 0 })
          }
        };
        return await callback(mockTx);
      });

      prisma.$transaction = mockTransaction as any;

      await duplicateProjectService(userId, projectId);

      const transactionCallback = mockTransaction.mock.calls[0][0];
      const mockTx = {
        project: {
          findUnique: jest.fn().mockResolvedValue(originalProject),
          create: jest.fn().mockResolvedValue(duplicatedProject)
        },
        projectVersion: {
          create: jest.fn().mockResolvedValue({ projectId: 'new-project-id', version: 0 })
        }
      };
      
      await transactionCallback(mockTx);

      expect(mockTx.projectVersion.create).toHaveBeenCalledWith({
        data: {
          projectId: 'new-project-id',
          version: 0,
          lastSync: expect.any(Date)
        }
      });
    });

    it('должен выбрасывать ошибку если проект не найден', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            findUnique: jest.fn().mockResolvedValue(null)
          }
        };
        return await callback(mockTx);
      });

      prisma.$transaction = mockTransaction as any;

      await expect(duplicateProjectService(userId, projectId))
        .rejects.toThrow('Проект не найден');
    });

    it('должен выбрасывать ошибку если пользователь не является участником проекта', async () => {
      const projectWithoutUser = {
        ...originalProject,
        members: [
          { userId: 'other-user', role: 'OWNER' }
        ]
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            findUnique: jest.fn().mockResolvedValue(projectWithoutUser)
          }
        };
        return await callback(mockTx);
      });

      prisma.$transaction = mockTransaction as any;

      await expect(duplicateProjectService(userId, projectId))
        .rejects.toThrow('Нет прав на дублирование проекта');
    });

    it('должен корректно обрабатывать проекты без версии', async () => {
      const projectWithoutVersion = {
        ...originalProject,
        projectVersion: null
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            findUnique: jest.fn().mockResolvedValue(projectWithoutVersion),
            create: jest.fn().mockResolvedValue(duplicatedProject)
          },
          projectVersion: {
            create: jest.fn()
          }
        };
        return await callback(mockTx);
      });

      prisma.$transaction = mockTransaction as any;

      const result = await duplicateProjectService(userId, projectId);

      expect(result).toEqual(duplicatedProject);
      
      // Проверяем, что версия НЕ создается для проектов без версии
      const transactionCallback = mockTransaction.mock.calls[0][0];
      const mockTx = {
        project: {
          findUnique: jest.fn().mockResolvedValue(projectWithoutVersion),
          create: jest.fn().mockResolvedValue(duplicatedProject)
        },
        projectVersion: {
          create: jest.fn()
        }
      };
      
      await transactionCallback(mockTx);
      
      expect(mockTx.projectVersion.create).not.toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      const mockTransaction = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      prisma.$transaction = mockTransaction as any;

      await expect(duplicateProjectService(userId, projectId))
        .rejects.toThrow('Database connection failed');
    });
  });
});