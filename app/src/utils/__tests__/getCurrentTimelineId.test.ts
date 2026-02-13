import {getCurrentTimelineId} from '../getCurrentTimelineId';

// Мокаем window.location
const mockLocation = (pathname: string) => {
  Object.defineProperty(window, 'location', {
    value: {
      pathname
    },
    writable: true
  });
};

describe('getCurrentTimelineId', () => {
  beforeEach(() => {
    // Сбрасываем window.location перед каждым тестом
    delete (window as any).location;
  });

  it('should return null when window is undefined (SSR)', () => {
    // Мокаем отсутствие window
    const originalWindow = global.window;
    delete (global as any).window;

    const result = getCurrentTimelineId();
    expect(result).toBe(null);

    // Восстанавливаем window
    global.window = originalWindow;
  });

  it('should return timeline id from valid editor path', () => {
    mockLocation('/project123/editor/timeline-1/layer-456');

    const result = getCurrentTimelineId();
    expect(result).toBe('timeline-1');
  });

  it('should return timeline id from editor path without layer', () => {
    mockLocation('/project123/editor/timeline-2');

    const result = getCurrentTimelineId();
    expect(result).toBe('timeline-2');
  });

  it('should return null for invalid path', () => {
    mockLocation('/invalid/path');

    const result = getCurrentTimelineId();
    expect(result).toBe(null);
  });

  it('should return null for non-editor path', () => {
    mockLocation('/project123/play/timeline-1');

    const result = getCurrentTimelineId();
    expect(result).toBe(null);
  });

  it('should return null for empty pathname', () => {
    mockLocation('');

    const result = getCurrentTimelineId();
    expect(result).toBe(null);
  });

  it('should return null for root path', () => {
    mockLocation('/');

    const result = getCurrentTimelineId();
    expect(result).toBe(null);
  });

  it('should handle path with query parameters', () => {
    mockLocation('/project123/editor/timeline-custom?param=value');

    const result = getCurrentTimelineId();
    expect(result).toBe('timeline-custom');
  });

  it('should handle path with hash', () => {
    mockLocation('/project123/editor/timeline-hash#section');

    const result = getCurrentTimelineId();
    expect(result).toBe('timeline-hash');
  });
});
