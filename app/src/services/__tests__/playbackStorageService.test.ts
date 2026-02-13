import {type ProjectData, cleanupOldPlaybackData, deletePlaybackData, loadPlaybackData, loadProject, savePlaybackData} from '../dbService';
import {PlaybackStorageService} from '../playbackStorageService';

// Мокаем зависимости
jest.mock('../dbService');

const mockLoadProject = loadProject as jest.MockedFunction<typeof loadProject>;
const mockSavePlaybackData = savePlaybackData as jest.MockedFunction<typeof savePlaybackData>;
const mockLoadPlaybackData = loadPlaybackData as jest.MockedFunction<typeof loadPlaybackData>;
const mockDeletePlaybackData = deletePlaybackData as jest.MockedFunction<typeof deletePlaybackData>;
const mockCleanupOldPlaybackData = cleanupOldPlaybackData as jest.MockedFunction<typeof cleanupOldPlaybackData>;

describe('PlaybackStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // Настраиваем моки по умолчанию
    mockCleanupOldPlaybackData.mockResolvedValue();
  });

  describe('savePlaybackData', () => {
    it('должен сохранить данные воспроизведения в IndexedDB', async () => {
      const mockProjectData: ProjectData = {
        projectId: 'test-project',
        projectName: 'Test Project',
        timelines: {
          'base-timeline': {
            layers: {
              root: {
                nodeIds: ['node1'],
                nodes: {
                  node1: {
                    id: 'node1',
                    type: 'narrative',
                    coordinates: {x: 100, y: 200},
                    data: {title: 'Test Node', text: 'Test content'}
                  }
                },
                edges: {}
              }
            },
            metadata: {},
            variables: [{id: 'var1', name: 'Test Variable', type: 'string', value: 'test'}],
            lastLayerNumber: 1
          }
        },
        _lastModified: Date.now()
      };

      mockLoadProject.mockResolvedValue(mockProjectData);
      mockSavePlaybackData.mockResolvedValue();

      const result = await PlaybackStorageService.savePlaybackData('test-project', 'team-id', 'base-timeline', 'Test Project', 'node1');

      expect(result).toBe('test-project_base-timeline');
      expect(mockCleanupOldPlaybackData).toHaveBeenCalled();
      expect(mockLoadProject).toHaveBeenCalledWith('test-project');
      expect(mockSavePlaybackData).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-project_base-timeline',
          projectId: 'test-project',
          timelineId: 'base-timeline',
          projectName: 'Test Project',
          data: expect.objectContaining({
            nodes: expect.arrayContaining([
              expect.objectContaining({
                id: 'node1',
                type: 'narrative'
              })
            ]),
            edges: expect.any(Array),
            variables: expect.arrayContaining([
              expect.objectContaining({
                id: 'var1',
                name: 'Test Variable'
              })
            ])
          }),
          metadata: expect.objectContaining({
            startNodeId: 'node1'
          })
        })
      );
    });

    it('должен выбросить ошибку если проект не найден', async () => {
      mockLoadProject.mockResolvedValue(undefined);

      await expect(PlaybackStorageService.savePlaybackData('missing-project', 'team-id', 'base-timeline', 'Test Project')).rejects.toThrow('Project missing-project not found in IndexedDB');
    });

    it('должен выбросить ошибку если таймлайн не найден', async () => {
      const mockProjectData: ProjectData = {
        projectId: 'test-project',
        projectName: 'Test Project',
        timelines: {},
        _lastModified: Date.now()
      };

      mockLoadProject.mockResolvedValue(mockProjectData);

      await expect(PlaybackStorageService.savePlaybackData('test-project', 'team-id', 'missing-timeline', 'Test Project')).rejects.toThrow(
        'Timeline missing-timeline not found in project test-project'
      );
    });

    it('должен обработать ошибку при сохранении в IndexedDB', async () => {
      const mockProjectData: ProjectData = {
        projectId: 'test-project',
        projectName: 'Test Project',
        timelines: {
          'base-timeline': {
            layers: {root: {nodeIds: [], nodes: {}, edges: {}}},
            metadata: {},
            variables: [],
            lastLayerNumber: 1
          }
        },
        _lastModified: Date.now()
      };

      mockLoadProject.mockResolvedValue(mockProjectData);
      mockSavePlaybackData.mockRejectedValue(new Error('IndexedDB save error'));

      await expect(PlaybackStorageService.savePlaybackData('test-project', 'team-id', 'base-timeline', 'Test Project')).rejects.toThrow('IndexedDB save error');
    });
  });

  describe('loadPlaybackData', () => {
    it('должен загрузить данные воспроизведения из IndexedDB', async () => {
      const mockPlaybackData = {
        id: 'test-project_base-timeline',
        projectId: 'test-project',
        teamId: 'test-team',
        timelineId: 'base-timeline',
        projectName: 'Test Project',
        data: {
          nodes: [],
          edges: [],
          variables: []
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        },
        _lastModified: Date.now()
      };

      mockLoadPlaybackData.mockResolvedValue(mockPlaybackData);

      const result = await PlaybackStorageService.loadPlaybackData('test-project_base-timeline');

      expect(result).toEqual(mockPlaybackData);
      expect(mockLoadPlaybackData).toHaveBeenCalledWith('test-project_base-timeline');
    });

    it('должен вернуть null если данные не найдены', async () => {
      mockLoadPlaybackData.mockResolvedValue(undefined);

      const result = await PlaybackStorageService.loadPlaybackData('missing-data');

      expect(result).toBeNull();
    });

    it('должен удалить устаревшие данные', async () => {
      const oldData = {
        id: 'test-project_base-timeline',
        projectId: 'test-project',
        teamId: 'test-team',
        timelineId: 'base-timeline',
        projectName: 'Test Project',
        data: {
          nodes: [],
          edges: [],
          variables: []
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        },
        _lastModified: Date.now() - 2 * 60 * 60 * 1000 // 2 часа назад
      };

      mockLoadPlaybackData.mockResolvedValue(oldData);
      mockDeletePlaybackData.mockResolvedValue();

      const result = await PlaybackStorageService.loadPlaybackData('test-project_base-timeline');

      expect(result).toBeNull();
      expect(mockDeletePlaybackData).toHaveBeenCalledWith('test-project_base-timeline');
    });

    it('должен вернуть null при ошибке загрузки', async () => {
      mockLoadPlaybackData.mockRejectedValue(new Error('IndexedDB error'));

      const result = await PlaybackStorageService.loadPlaybackData('test-project_base-timeline');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Failed to load playback data:', expect.any(Error));
    });
  });

  describe('deletePlaybackData', () => {
    it('должен удалить данные воспроизведения', async () => {
      mockDeletePlaybackData.mockResolvedValue();

      await PlaybackStorageService.deletePlaybackData('test-project_base-timeline');

      expect(mockDeletePlaybackData).toHaveBeenCalledWith('test-project_base-timeline');
      expect(console.log).toHaveBeenCalledWith('Playback data deleted:', 'test-project_base-timeline');
    });

    it('должен обработать ошибку при удалении', async () => {
      mockDeletePlaybackData.mockRejectedValue(new Error('Delete error'));

      await PlaybackStorageService.deletePlaybackData('test-project_base-timeline');

      expect(console.error).toHaveBeenCalledWith('Failed to delete playback data:', expect.any(Error));
    });
  });

  describe('buildPlaybackUrl', () => {
    it('должен создать корректный URL для воспроизведения', () => {
      const url = PlaybackStorageService.buildPlaybackUrl('test-project', 'base-timeline', 'node1');

      expect(url).toBe('/test-project/play/base-timeline?playbackId=test-project_base-timeline&startNode=node1');
    });

    it('должен создать URL без startNode если он не указан', () => {
      const url = PlaybackStorageService.buildPlaybackUrl('test-project', 'base-timeline');

      expect(url).toBe('/test-project/play/base-timeline?playbackId=test-project_base-timeline');
    });
  });
});
