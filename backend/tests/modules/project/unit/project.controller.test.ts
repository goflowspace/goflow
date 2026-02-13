import { Request, Response } from 'express';
import {
  createProject,
  getUserProjects,
  updateProject,
  deleteProject,
  createProjectFromImport,
  duplicateProject
} from '../../../../src/modules/project/project.controller';
import * as projectService from '../../../../src/modules/project/project.service';

jest.mock('../../../../src/modules/project/project.service');

describe('ProjectController', () => {
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
    (projectService.deleteProjectService as jest.Mock).mockClear();
  });

  describe('createProject', () => {
    it('должен создать проект и вернуть статус 201', async () => {
      const projectData = {
        name: 'Test Project',
        data: { nodes: [] }
      };
      const createdProject = {
        id: 'project1',
        name: projectData.name,
        data: projectData.data,
        members: []
      };

      mockRequest.body = projectData;
      (projectService.createProjectService as jest.Mock).mockResolvedValue(createdProject);

      await createProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.createProjectService).toHaveBeenCalledWith('user1', projectData.name, projectData.data);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        message: "Project was created",
        project: createdProject
      });
    });

    it('должен обработать ошибку и вернуть статус 400', async () => {
      const error = new Error('Database error');
      (projectService.createProjectService as jest.Mock).mockRejectedValue(error);

      await expect(createProject(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Database error');

      expect(projectService.createProjectService).toHaveBeenCalledWith('user1', undefined, undefined);
    });

    it('должен обработать неизвестную ошибку', async () => {
      (projectService.createProjectService as jest.Mock).mockRejectedValue('Unknown error');

      await expect(createProject(mockRequest as Request, mockResponse as Response))
        .rejects.toBe('Unknown error');
    });
  });

  describe('createProjectFromImport', () => {
    it('должен создать проект из импортированных данных', async () => {
      const importData = {
        data: {
          name: 'Imported Project',
          nodes: [{ id: 'node1' }]
        }
      };
      const createdProject = {
        id: 'project1',
        name: 'Imported Project',
        data: importData.data
      };

      mockRequest.body = importData;
      (projectService.createProjectService as jest.Mock).mockResolvedValue(createdProject);

      await createProjectFromImport(mockRequest as Request, mockResponse as Response);

      expect(projectService.createProjectService).toHaveBeenCalledWith('user1', 'Imported Project', importData.data);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(createdProject);
    });

    it('должен использовать "Untitled" если имя не указано в данных', async () => {
      const importData = {
        data: {
          nodes: [{ id: 'node1' }]
        }
      };

      mockRequest.body = importData;
      (projectService.createProjectService as jest.Mock).mockResolvedValue({});

      await createProjectFromImport(mockRequest as Request, mockResponse as Response);

      expect(projectService.createProjectService).toHaveBeenCalledWith('user1', 'Untitled', importData.data);
    });

    it('должен вернуть ошибку если data не предоставлена', async () => {
      mockRequest.body = {};

      await createProjectFromImport(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: "Поле 'data' обязательно и должно быть объектом"
      });
    });
  });

  describe('getUserProjects', () => {
    it('должен вернуть список проектов пользователя', async () => {
      const projects = [
        { id: 'project1', name: 'Project 1' },
        { id: 'project2', name: 'Project 2' }
      ];

      (projectService.getUserProjectsService as jest.Mock).mockResolvedValue(projects);

      await getUserProjects(mockRequest as Request, mockResponse as Response);

      expect(projectService.getUserProjectsService).toHaveBeenCalledWith('user1');
      expect(responseJson).toHaveBeenCalledWith({ projects });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Service error');
      (projectService.getUserProjectsService as jest.Mock).mockRejectedValue(error);

      await expect(getUserProjects(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Service error');

      expect(projectService.getUserProjectsService).toHaveBeenCalledWith('user1');
    });
  });

  describe('updateProject', () => {
    it('должен обновить проект и вернуть обновленные данные', async () => {
      const updatedProject = {
        id: 'project1',
        name: 'Updated Project',
        members: []
      };

      mockRequest.params = { id: 'project1' };
      mockRequest.body = { name: 'Updated Project' };
      (projectService.updateProjectService as jest.Mock).mockResolvedValue(updatedProject);

      await updateProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.updateProjectService).toHaveBeenCalledWith('user1', 'project1', 'Updated Project');
      expect(responseJson).toHaveBeenCalledWith({
        message: "Проект обновлен",
        project: updatedProject
      });
    });

    it('должен вернуть ошибку если имя не предоставлено', async () => {
      mockRequest.params = { id: 'project1' };
      mockRequest.body = {};

      await updateProject(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: "Название проекта обязательно"
      });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Нет прав на редактирование проекта');
      mockRequest.params = { id: 'project1' };
      mockRequest.body = { name: 'Updated Project' };
      (projectService.updateProjectService as jest.Mock).mockRejectedValue(error);

      await expect(updateProject(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Нет прав на редактирование проекта');

      expect(projectService.updateProjectService).toHaveBeenCalledWith('user1', 'project1', 'Updated Project');
    });
  });

  describe('deleteProject', () => {
    it('должен удалить проект и вернуть сообщение об успехе', async () => {
      mockRequest.params = { id: 'project1' };
      (projectService.deleteProjectService as jest.Mock).mockResolvedValue(undefined);

      await deleteProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.deleteProjectService).toHaveBeenCalledWith('user1', 'project1');
      expect(responseJson).toHaveBeenCalledWith({
        message: "Проект удален"
      });
    });

    it('должен обработать ошибку если проект не найден', async () => {
      const error = new Error('Проект не найден');
      mockRequest.params = { id: 'project1' };
      (projectService.deleteProjectService as jest.Mock).mockRejectedValue(error);

      await expect(deleteProject(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Проект не найден');

      expect(projectService.deleteProjectService).toHaveBeenCalledWith('user1', 'project1');
    });

    it('должен обработать ошибку нет прав на удаление', async () => {
      const error = new Error('Удалять проект может только владелец');
      mockRequest.params = { id: 'project1' };
      (projectService.deleteProjectService as jest.Mock).mockRejectedValue(error);

      await expect(deleteProject(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Удалять проект может только владелец');

      expect(projectService.deleteProjectService).toHaveBeenCalledWith('user1', 'project1');
    });
  });

  describe('duplicateProject', () => {
    it('должен дублировать проект и вернуть статус 201', async () => {
      const projectId = 'project-123';
      const duplicatedProject = {
        id: 'new-project-456',
        name: 'Test Project (copy)',
        data: { nodes: [], edges: [] },
        creatorId: 'user1',
        members: [
          {
            userId: 'user1',
            role: 'OWNER',
            user: { id: 'user1', email: 'test@example.com', name: 'Test User' }
          }
        ]
      };

      mockRequest.params = { id: projectId };
      (projectService.duplicateProjectService as jest.Mock).mockResolvedValue(duplicatedProject);

      await duplicateProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.duplicateProjectService).toHaveBeenCalledWith('user1', projectId);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        message: 'Проект успешно дублирован',
        project: duplicatedProject
      });
    });

    it('должен вернуть ошибку 404 если проект не найден', async () => {
      const projectId = 'non-existent-project';
      const error = new Error('Проект не найден');
      
      mockRequest.params = { id: projectId };
      (projectService.duplicateProjectService as jest.Mock).mockRejectedValue(error);

      await duplicateProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.duplicateProjectService).toHaveBeenCalledWith('user1', projectId);
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Проект не найден'
      });
    });

    it('должен вернуть ошибку 403 если нет прав на дублирование', async () => {
      const projectId = 'project-123';
      const error = new Error('Нет прав на дублирование проекта');
      
      mockRequest.params = { id: projectId };
      (projectService.duplicateProjectService as jest.Mock).mockRejectedValue(error);

      await duplicateProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.duplicateProjectService).toHaveBeenCalledWith('user1', projectId);
      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Нет прав на дублирование проекта'
      });
    });

    it('должен вернуть ошибку 500 при неожиданных ошибках', async () => {
      const projectId = 'project-123';
      const error = new Error('Database connection failed');
      
      mockRequest.params = { id: projectId };
      (projectService.duplicateProjectService as jest.Mock).mockRejectedValue(error);

      // Мокаем console.error чтобы не засорять вывод тестов
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await duplicateProject(mockRequest as Request, mockResponse as Response);

      expect(projectService.duplicateProjectService).toHaveBeenCalledWith('user1', projectId);
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Внутренняя ошибка сервера'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error duplicating project:', error);

      consoleSpy.mockRestore();
    });
  });
});