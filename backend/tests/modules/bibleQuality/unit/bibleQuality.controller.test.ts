import { Request, Response } from "express";

// Мокаем сервисы
jest.mock("../../../../src/modules/bibleQuality/bibleQuality.service", () => ({
  getBibleQualityService: jest.fn(),
  createOrUpdateBibleQualityService: jest.fn(),
  checkUserProjectAccess: jest.fn(),
}));

// Импортируем мокнутые сервисы
const {
  getBibleQualityService,
  createOrUpdateBibleQualityService,
  checkUserProjectAccess,
} = require("../../../../src/modules/bibleQuality/bibleQuality.service");

// Импортируем контроллеры
import {
  getBibleQuality,
  recalculateBibleQuality
} from "../../../../src/modules/bibleQuality/bibleQuality.controller";

describe('BibleQualityController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    mockRequest = {
      params: {
        id: 'project1'
      },
      user: {
        id: 'user1'
      }
    } as any;

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('getBibleQuality', () => {
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

    it('должен вернуть оценку качества если пользователь имеет доступ и оценка существует', async () => {
      checkUserProjectAccess.mockResolvedValue(true);
      getBibleQualityService.mockResolvedValue(mockBibleQuality);

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project1');
      expect(getBibleQualityService).toHaveBeenCalledWith('project1');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBibleQuality
      });
    });

    it('должен создать новую оценку если она не существует и вернуть ее', async () => {
      const newBibleQuality = {
        ...mockBibleQuality,
        id: 'quality2',
        totalScore: 70
      };

      checkUserProjectAccess.mockResolvedValue(true);
      getBibleQualityService.mockResolvedValue(null);
      createOrUpdateBibleQualityService.mockResolvedValue(newBibleQuality);

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project1');
      expect(getBibleQualityService).toHaveBeenCalledWith('project1');
      expect(createOrUpdateBibleQualityService).toHaveBeenCalledWith('project1');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: newBibleQuality
      });
    });

    it('должен вернуть 403 если пользователь не имеет доступа к проекту', async () => {
      checkUserProjectAccess.mockResolvedValue(false);

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project1');
      expect(getBibleQualityService).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Нет доступа к проекту"
      });
    });

    it('должен вернуть 500 при ошибке в сервисе проверки доступа', async () => {
      const error = new Error('Database error');
      checkUserProjectAccess.mockRejectedValue(error);

      // Мокаем console.error чтобы избежать вывода в тестах
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при получении оценки качества библии"
      });
      expect(consoleSpy).toHaveBeenCalledWith('Get Bible Quality Error:', error);

      consoleSpy.mockRestore();
    });

    it('должен вернуть 500 при ошибке в сервисе получения оценки', async () => {
      const error = new Error('Service error');
      checkUserProjectAccess.mockResolvedValue(true);
      getBibleQualityService.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при получении оценки качества библии"
      });
      expect(consoleSpy).toHaveBeenCalledWith('Get Bible Quality Error:', error);

      consoleSpy.mockRestore();
    });

    it('должен обрабатывать отсутствие user в request', async () => {
      mockRequest.user = undefined;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при получении оценки качества библии"
      });

      consoleSpy.mockRestore();
    });

    it('должен обрабатывать отсутствие id проекта в params', async () => {
      mockRequest.params = {};

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при получении оценки качества библии"
      });

      consoleSpy.mockRestore();
    });
  });

  describe('recalculateBibleQuality', () => {
    const mockUpdatedQuality = {
      id: 'quality1',
      projectId: 'project1',
      totalScore: 95,
      completenessScore: 100,
      qualityScore: 90,
      consistencyScore: 95,
      completeness: {
        critical: {
          logline: true,
          synopsis: true,
          genres: true
        },
        important: {
          setting: true,
          targetAudience: true,
          mainThemes: true,
          atmosphere: true
        },
        optional: {
          message: true,
          references: true,
          uniqueFeatures: true,
          constraints: true
        }
      },
      recommendations: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02')
    };

    it('должен пересчитать и вернуть обновленную оценку качества', async () => {
      checkUserProjectAccess.mockResolvedValue(true);
      createOrUpdateBibleQualityService.mockResolvedValue(mockUpdatedQuality);

      await recalculateBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project1');
      expect(createOrUpdateBibleQualityService).toHaveBeenCalledWith('project1', true);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedQuality
      });
    });

    it('должен вернуть 403 если пользователь не имеет доступа к проекту', async () => {
      checkUserProjectAccess.mockResolvedValue(false);

      await recalculateBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(checkUserProjectAccess).toHaveBeenCalledWith('user1', 'project1');
      expect(createOrUpdateBibleQualityService).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Нет доступа к проекту"
      });
    });

    it('должен вернуть 500 при ошибке в сервисе проверки доступа', async () => {
      const error = new Error('Access check error');
      checkUserProjectAccess.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await recalculateBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при пересчете оценки качества библии"
      });
      expect(consoleSpy).toHaveBeenCalledWith('Recalculate Bible Quality Error:', error);

      consoleSpy.mockRestore();
    });

    it('должен вернуть 500 при ошибке в сервисе пересчета', async () => {
      const error = new Error('Recalculate error');
      checkUserProjectAccess.mockResolvedValue(true);
      createOrUpdateBibleQualityService.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await recalculateBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при пересчете оценки качества библии"
      });
      expect(consoleSpy).toHaveBeenCalledWith('Recalculate Bible Quality Error:', error);

      consoleSpy.mockRestore();
    });

    it('должен обрабатывать отсутствие user в request', async () => {
      mockRequest.user = undefined;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await recalculateBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при пересчете оценки качества библии"
      });

      consoleSpy.mockRestore();
    });

    it('должен обрабатывать отсутствие id проекта в params', async () => {
      mockRequest.params = {};

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await recalculateBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при пересчете оценки качества библии"
      });

      consoleSpy.mockRestore();
    });
  });

  describe('error handling edge cases', () => {
    it('должен обрабатывать ошибки при создании новой оценки в getBibleQuality', async () => {
      const error = new Error('Creation error');
      checkUserProjectAccess.mockResolvedValue(true);
      getBibleQualityService.mockResolvedValue(null);
      createOrUpdateBibleQualityService.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: "Ошибка при получении оценки качества библии"
      });
      expect(consoleSpy).toHaveBeenCalledWith('Get Bible Quality Error:', error);

      consoleSpy.mockRestore();
    });

    it('должен корректно работать с различными значениями параметров', async () => {
      mockRequest.params = { id: 'very-long-project-id-that-might-cause-issues-12345' };
      mockRequest.user = { id: 'user-with-special-chars-123!' };

      checkUserProjectAccess.mockResolvedValue(true);
      getBibleQualityService.mockResolvedValue(null);
      createOrUpdateBibleQualityService.mockResolvedValue({
        id: 'new-quality',
        projectId: 'very-long-project-id-that-might-cause-issues-12345',
        totalScore: 50,
        completenessScore: 50,
        qualityScore: 50,
        consistencyScore: 50,
        completeness: {},
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await getBibleQuality(mockRequest as Request, mockResponse as Response);

      expect(checkUserProjectAccess).toHaveBeenCalledWith('user-with-special-chars-123!', 'very-long-project-id-that-might-cause-issues-12345');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'new-quality',
          projectId: 'very-long-project-id-that-might-cause-issues-12345'
        })
      });
    });
  });
}); 