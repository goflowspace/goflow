import { Request, Response } from 'express';
import {
  getProjectInfo,
  createProjectInfo,
  updateProjectInfo
} from '../../../../src/modules/projectInfo/projectInfo.controller';
import * as projectInfoService from '../../../../src/modules/projectInfo/projectInfo.service';

jest.mock('../../../../src/modules/projectInfo/projectInfo.service');

describe('ProjectInfoController', () => {
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
      params: { id: 'project-123' },
    };

    jest.clearAllMocks();
  });

  describe('getProjectInfo', () => {
    it('должен вернуть информацию о проекте', async () => {
      const mockProjectInfo = {
        id: 'info-123',
        projectId: 'project-123',
        logline: 'Test logline',
        synopsis: 'Test synopsis',
        genres: ['rpg'],
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

      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(true);
      (projectInfoService.getProjectInfoService as jest.Mock).mockResolvedValue(mockProjectInfo);

      await getProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(projectInfoService.checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project-123');
      expect(projectInfoService.getProjectInfoService).toHaveBeenCalledWith('project-123');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockProjectInfo
      });
    });

    it('должен вернуть 403 если нет доступа к проекту', async () => {
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(false);

      await getProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Нет доступа к проекту"
      });
    });

    it('должен вернуть 404 если информация о проекте не найдена', async () => {
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(true);
      (projectInfoService.getProjectInfoService as jest.Mock).mockResolvedValue(null);

      await getProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Информация о проекте не найдена"
      });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Database error');
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockRejectedValue(error);

      await getProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('createProjectInfo', () => {
    const projectInfoData = {
      logline: 'Test logline',
      synopsis: 'Test synopsis',
      genres: ['rpg'],
      formats: ['visual_novel'],
      status: 'concept',
      setting: 'Fantasy world'
    };

    it('должен создать информацию о проекте', async () => {
      const mockCreatedInfo = {
        id: 'info-123',
        projectId: 'project-123',
        ...projectInfoData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = projectInfoData;
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(true);
      (projectInfoService.createProjectInfoService as jest.Mock).mockResolvedValue(mockCreatedInfo);

      await createProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(projectInfoService.checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project-123');
      expect(projectInfoService.createProjectInfoService).toHaveBeenCalledWith('project-123', projectInfoData);
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedInfo,
        message: "Информация о проекте создана"
      });
    });

    it('должен вернуть 403 если нет доступа к проекту', async () => {
      mockRequest.body = projectInfoData;
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(false);

      await createProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Нет доступа к проекту"
      });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Project not found');
      mockRequest.body = projectInfoData;
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(true);
      (projectInfoService.createProjectInfoService as jest.Mock).mockRejectedValue(error);

      await createProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
    });
  });

  describe('updateProjectInfo', () => {
    const updateData = {
      logline: 'Updated logline',
      status: 'production'
    };

    it('должен обновить информацию о проекте', async () => {
      const mockUpdatedInfo = {
        id: 'info-123',
        projectId: 'project-123',
        ...updateData,
        updatedAt: new Date()
      };

      mockRequest.body = updateData;
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(true);
      (projectInfoService.updateProjectInfoService as jest.Mock).mockResolvedValue(mockUpdatedInfo);

      await updateProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(projectInfoService.checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project-123');
      expect(projectInfoService.updateProjectInfoService).toHaveBeenCalledWith('project-123', updateData);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedInfo,
        message: "Информация о проекте обновлена"
      });
    });

    it('должен вернуть 403 если нет доступа к проекту', async () => {
      mockRequest.body = updateData;
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(false);

      await updateProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Нет доступа к проекту"
      });
    });

    it('должен обработать ошибку сервиса', async () => {
      const error = new Error('Update failed');
      mockRequest.body = updateData;
      (projectInfoService.checkUserProjectAccess as jest.Mock).mockResolvedValue(true);
      (projectInfoService.updateProjectInfoService as jest.Mock).mockRejectedValue(error);

      await updateProjectInfo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Update failed'
      });
    });
  });
}); 