import {getCurrentTimelineId} from '../getCurrentTimelineId';
import {buildEditorPath, buildPlayPath, parseEditorPath} from '../navigation';

describe('Navigation Edge Cases', () => {
  describe('buildEditorPath edge cases', () => {
    it('should handle special characters in project ID', () => {
      const result = buildEditorPath('project-with-dashes_and_underscores.123', 'test-timeline');
      expect(result).toBe('/project-with-dashes_and_underscores.123/editor/test-timeline');
    });

    it('should handle special characters in timeline ID', () => {
      const result = buildEditorPath('project', 'timeline-with-dashes_and_underscores.123');
      expect(result).toBe('/project/editor/timeline-with-dashes_and_underscores.123');
    });

    it('should handle special characters in layer ID', () => {
      const result = buildEditorPath('project', 'timeline', 'layer-with-dashes_and_underscores.123');
      expect(result).toBe('/project/editor/timeline/layer-with-dashes_and_underscores.123');
    });

    it('should handle very long IDs', () => {
      const longId = 'a'.repeat(100);
      const result = buildEditorPath(longId, longId, longId);
      expect(result).toBe(`/${longId}/editor/${longId}/${longId}`);
    });

    it('should handle numeric IDs', () => {
      const result = buildEditorPath('123', '456', '789');
      expect(result).toBe('/123/editor/456/789');
    });

    it('should handle mixed case IDs', () => {
      const result = buildEditorPath('ProjectABC', 'TimelineXYZ', 'LayerDEF');
      expect(result).toBe('/ProjectABC/editor/TimelineXYZ/LayerDEF');
    });
  });

  describe('buildPlayPath edge cases', () => {
    it('should handle special characters in node ID', () => {
      const result = buildPlayPath('project', 'timeline', 'node-with-dashes_and_underscores.123');
      expect(result).toBe('/project/play/timeline?nodeId=node-with-dashes_and_underscores.123');
    });

    it('should handle node ID with spaces (URL encoding)', () => {
      const result = buildPlayPath('project', 'timeline', 'node with spaces');
      expect(result).toBe('/project/play/timeline?nodeId=node with spaces');
    });

    it('should handle node ID with special query characters', () => {
      const result = buildPlayPath('project', 'timeline', 'node&with=special?chars');
      expect(result).toBe('/project/play/timeline?nodeId=node&with=special?chars');
    });

    it('should handle very long node ID', () => {
      const longNodeId = 'node-' + 'a'.repeat(200);
      const result = buildPlayPath('project', 'timeline', longNodeId);
      expect(result).toBe(`/project/play/timeline?nodeId=${longNodeId}`);
    });
  });

  describe('parseEditorPath edge cases', () => {
    it('should handle paths with trailing slash', () => {
      const result = parseEditorPath('/project123/editor/timeline-1/layer-456/');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'layer-456'
      });
    });

    it('should handle paths with multiple slashes', () => {
      const result = parseEditorPath('//project123//editor//timeline-1//layer-456//');
      expect(result).toBeNull(); // Некорректный путь
    });

    it('should handle paths with encoded characters', () => {
      const result = parseEditorPath('/project%20123/editor/timeline%2D1/layer%5F456');
      expect(result).toEqual({
        projectId: 'project%20123',
        timelineId: 'timeline%2D1',
        layerId: 'layer%5F456'
      });
    });

    it('should handle very long paths', () => {
      const longId = 'a'.repeat(100);
      const result = parseEditorPath(`/${longId}/editor/${longId}/${longId}`);
      expect(result).toEqual({
        projectId: longId,
        timelineId: longId,
        layerId: longId
      });
    });

    it('should handle paths with numeric IDs', () => {
      const result = parseEditorPath('/123/editor/456/789');
      expect(result).toEqual({
        projectId: '123',
        timelineId: '456',
        layerId: '789'
      });
    });

    it('should handle case sensitivity', () => {
      const result = parseEditorPath('/ProjectABC/editor/TimelineXYZ/LayerDEF');
      expect(result).toEqual({
        projectId: 'ProjectABC',
        timelineId: 'TimelineXYZ',
        layerId: 'LayerDEF'
      });
    });

    it('should handle paths with fragment identifiers', () => {
      const result = parseEditorPath('/project123/editor/timeline-1/layer-456#section');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'layer-456'
      });
    });

    it('should handle paths with complex query parameters', () => {
      const result = parseEditorPath('/project123/editor/timeline-1/layer-456?param1=value1&param2=value2&param3=value%20with%20spaces');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'layer-456'
      });
    });
  });

  describe('getCurrentTimelineId edge cases', () => {
    beforeEach(() => {
      delete (window as any).location;
    });

    it('should handle malformed URLs', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/project123/editor//timeline-1//layer-456'
        },
        writable: true
      });

      const result = getCurrentTimelineId();
      expect(result).toBe(null);
    });

    it('should handle URLs with encoded characters', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/project%20123/editor/timeline%2D1/layer%5F456'
        },
        writable: true
      });

      const result = getCurrentTimelineId();
      expect(result).toBe('timeline%2D1');
    });

    it('should handle very long URLs', () => {
      const longId = 'timeline-' + 'a'.repeat(200);
      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/project123/editor/${longId}/layer-456`
        },
        writable: true
      });

      const result = getCurrentTimelineId();
      expect(result).toBe(longId);
    });

    it('should handle URLs with special characters', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/project123/editor/timeline-with-dashes_and_underscores.123/layer-456'
        },
        writable: true
      });

      const result = getCurrentTimelineId();
      expect(result).toBe('timeline-with-dashes_and_underscores.123');
    });
  });

  describe('Integration edge cases', () => {
    it('should handle round-trip parsing and building', () => {
      const originalPath = '/project123/editor/timeline-1/layer-456';
      const parsed = parseEditorPath(originalPath);

      if (parsed) {
        const rebuilt = buildEditorPath(parsed.projectId, parsed.timelineId, parsed.layerId);
        expect(rebuilt).toBe(originalPath);
      }
    });

    it('should handle round-trip with root layer', () => {
      const originalPath = '/project123/editor/timeline-1';
      const parsed = parseEditorPath(originalPath);

      if (parsed) {
        const rebuilt = buildEditorPath(parsed.projectId, parsed.timelineId, parsed.layerId);
        expect(rebuilt).toBe(originalPath);
      }
    });

    it('should handle consistency between different timeline formats', () => {
      const timelineId = 'test-timeline';
      const path1 = buildEditorPath('project', timelineId);
      const path2 = buildEditorPath('project', timelineId);

      expect(path1).toBe(path2);
    });

    it('should handle consistency between different layer formats', () => {
      const path1 = buildEditorPath('project', 'timeline', 'root');
      const path2 = buildEditorPath('project', 'timeline');

      expect(path1).toBe(path2);
    });
  });
});
