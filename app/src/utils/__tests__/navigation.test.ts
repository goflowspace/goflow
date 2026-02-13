import {buildEditorPath, buildPlayPath, parseEditorPath} from '../navigation';

describe('navigation utils', () => {
  describe('buildEditorPath', () => {
    it('should require timeline parameter', () => {
      // buildEditorPath теперь требует обязательный timelineId параметр
      const result = buildEditorPath('project123', 'default-timeline');
      expect(result).toBe('/project123/editor/default-timeline');
    });

    it('should build path with custom timeline and root layer', () => {
      const result = buildEditorPath('project123', 'timeline-1');
      expect(result).toBe('/project123/editor/timeline-1');
    });

    it('should build path with custom timeline and specific layer', () => {
      const result = buildEditorPath('project123', 'timeline-1', 'layer-456');
      expect(result).toBe('/project123/editor/timeline-1/layer-456');
    });

    it('should ignore root layer id and build timeline path', () => {
      const result = buildEditorPath('project123', 'timeline-1', 'root');
      expect(result).toBe('/project123/editor/timeline-1');
    });

    it('should handle empty layer id', () => {
      const result = buildEditorPath('project123', 'timeline-1', '');
      expect(result).toBe('/project123/editor/timeline-1');
    });
  });

  describe('buildPlayPath', () => {
    it('should build play path without node id', () => {
      const result = buildPlayPath('project123', 'timeline-1');
      expect(result).toBe('/project123/play/timeline-1');
    });

    it('should build play path with node id', () => {
      const result = buildPlayPath('project123', 'timeline-1', 'node-789');
      expect(result).toBe('/project123/play/timeline-1?nodeId=node-789');
    });

    it('should handle empty node id', () => {
      const result = buildPlayPath('project123', 'timeline-1', '');
      expect(result).toBe('/project123/play/timeline-1');
    });
  });

  describe('parseEditorPath', () => {
    it('should parse valid editor path with layer', () => {
      const result = parseEditorPath('/project123/editor/timeline-1/layer-456');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'layer-456'
      });
    });

    it('should parse valid editor path without layer (root)', () => {
      const result = parseEditorPath('/project123/editor/timeline-1');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'root'
      });
    });

    it('should return null for invalid path', () => {
      const result = parseEditorPath('/invalid/path');
      expect(result).toBeNull();
    });

    it('should return null for non-editor path', () => {
      const result = parseEditorPath('/project123/play/timeline-1');
      expect(result).toBeNull();
    });

    it('should return null for empty path', () => {
      const result = parseEditorPath('');
      expect(result).toBeNull();
    });

    it('should handle path with query parameters', () => {
      const result = parseEditorPath('/project123/editor/timeline-1/layer-456?param=value');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'layer-456'
      });
    });

    it('should handle path with hash', () => {
      const result = parseEditorPath('/project123/editor/timeline-1#section');
      expect(result).toEqual({
        projectId: 'project123',
        timelineId: 'timeline-1',
        layerId: 'root'
      });
    });
  });
});
