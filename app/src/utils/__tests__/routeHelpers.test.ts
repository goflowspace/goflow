import {extractProjectId, isInProjectWorkspace} from '../routeHelpers';

describe('routeHelpers', () => {
  describe('isInProjectWorkspace', () => {
    test('должен возвращать true для страниц проектов', () => {
      expect(isInProjectWorkspace('/project-123')).toBe(true);
      expect(isInProjectWorkspace('/project-123/entities')).toBe(true);
      expect(isInProjectWorkspace('/project-123/entities/character')).toBe(true);
      expect(isInProjectWorkspace('/project-123/entities/character/hero-123')).toBe(true);
      expect(isInProjectWorkspace('/project-123/editor')).toBe(true);
      expect(isInProjectWorkspace('/project-123/editor/timeline-123')).toBe(true);
      expect(isInProjectWorkspace('/project-123/editor/timeline-123/layer-123')).toBe(true);
      expect(isInProjectWorkspace('/project-123/play/timeline-123')).toBe(true);
    });

    test('должен возвращать false для не-проектных страниц', () => {
      expect(isInProjectWorkspace('/')).toBe(false);
      expect(isInProjectWorkspace('/projects')).toBe(false);
      expect(isInProjectWorkspace('/usage')).toBe(false);
      expect(isInProjectWorkspace('/settings')).toBe(false);
      expect(isInProjectWorkspace('/billing')).toBe(false);
      expect(isInProjectWorkspace('/members')).toBe(false);
      expect(isInProjectWorkspace('/teams')).toBe(false);
      expect(isInProjectWorkspace('/auth/login')).toBe(false);
    });
  });

  describe('extractProjectId', () => {
    test('должен извлекать project_id из URL проектов', () => {
      expect(extractProjectId('/project-123')).toBe('project-123');
      expect(extractProjectId('/project-123/entities')).toBe('project-123');
      expect(extractProjectId('/project-123/entities/character')).toBe('project-123');
      expect(extractProjectId('/project-123/editor/timeline-123')).toBe('project-123');
    });

    test('должен возвращать null для не-проектных страниц', () => {
      expect(extractProjectId('/')).toBe(null);
      expect(extractProjectId('/projects')).toBe(null);
      expect(extractProjectId('/usage')).toBe(null);
      expect(extractProjectId('/settings')).toBe(null);
    });
  });
});
