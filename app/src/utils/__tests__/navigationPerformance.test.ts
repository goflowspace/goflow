import {getCurrentTimelineId} from '../getCurrentTimelineId';
import {buildEditorPath, buildPlayPath, parseEditorPath} from '../navigation';

describe('Navigation Performance', () => {
  describe('buildEditorPath performance', () => {
    it('should build paths quickly for normal use cases', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        buildEditorPath(`project-${i}`, `timeline-${i}`, `layer-${i}`);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(20);
    });

    it('should handle large batches efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        buildEditorPath(`project-${i}`, `timeline-${i}`, `layer-${i}`);
      }

      const end = performance.now();
      const duration = end - start;

      // Должно масштабироваться линейно (менее 100ms для 10000 операций)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('parseEditorPath performance', () => {
    it('should parse paths quickly for normal use cases', () => {
      const paths = Array.from({length: 1000}, (_, i) => `/project-${i}/editor/timeline-${i}/layer-${i}`);

      const start = performance.now();

      paths.forEach((path) => parseEditorPath(path));

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(20);
    });

    it('should handle regex matching efficiently', () => {
      const validPaths = Array.from({length: 5000}, (_, i) => `/project-${i}/editor/timeline-${i}/layer-${i}`);
      const invalidPaths = Array.from({length: 5000}, (_, i) => `/invalid-${i}/path-${i}`);

      const allPaths = [...validPaths, ...invalidPaths];

      const start = performance.now();

      allPaths.forEach((path) => parseEditorPath(path));

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('getCurrentTimelineId performance', () => {
    beforeEach(() => {
      delete (window as any).location;
    });

    it('should extract timeline ID quickly', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/project123/editor/timeline-1/layer-456'
        },
        writable: true
      });

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        getCurrentTimelineId();
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(20);
    });

    it('should handle fallback efficiently', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/invalid/path'
        },
        writable: true
      });

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        getCurrentTimelineId();
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(20);
    });
  });

  describe('Memory usage', () => {
    it('should not create excessive objects during path building', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Создаем много путей
      const paths = [];
      for (let i = 0; i < 10000; i++) {
        paths.push(buildEditorPath(`project-${i}`, `timeline-${i}`, `layer-${i}`));
      }

      const afterMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = afterMemory - initialMemory;

      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }

      // Очищаем массив для GC
      paths.length = 0;
    });

    it('should not leak memory during parsing', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Парсим много путей
      for (let i = 0; i < 10000; i++) {
        parseEditorPath(`/project-${i}/editor/timeline-${i}/layer-${i}`);
        parseEditorPath(`/invalid-path-${i}`);
      }

      // Принудительно запускаем GC если доступно
      if ((global as any).gc) {
        (global as any).gc();
      }

      const afterMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = afterMemory - initialMemory;

      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      }
    });
  });

  describe('Stress testing', () => {
    it('should handle concurrent path operations', async () => {
      const operations = Array.from({length: 100}, (_, i) =>
        Promise.resolve().then(() => {
          // Смешиваем операции
          buildEditorPath(`project-${i}`, `timeline-${i}`, `layer-${i}`);
          parseEditorPath(`/project-${i}/editor/timeline-${i}/layer-${i}`);
          buildPlayPath(`project-${i}`, `timeline-${i}`, `node-${i}`);
        })
      );

      const start = performance.now();
      await Promise.all(operations);
      const end = performance.now();

      const duration = end - start;

      expect(duration).toBeLessThan(100);
    });

    it('should maintain consistency under load', () => {
      const results = new Set();

      // Генерируем одинаковые пути много раз
      for (let i = 0; i < 1000; i++) {
        const path = buildEditorPath('project', 'timeline', 'layer');
        results.add(path);
      }

      // Все результаты должны быть одинаковыми
      expect(results.size).toBe(1);
      expect(results.has('/project/editor/timeline/layer')).toBe(true);
    });

    it('should handle edge cases consistently', () => {
      const edgeCases = [
        ['', '', ''],
        ['project', '', ''],
        ['project', 'timeline', ''],
        ['project', 'timeline', 'root'],
        ['project-with-dashes', 'timeline_with_underscores', 'layer.with.dots']
      ];

      const start = performance.now();

      // Тестируем каждый edge case много раз
      edgeCases.forEach(([project, timeline, layer]) => {
        for (let i = 0; i < 100; i++) {
          const path = buildEditorPath(project, timeline, layer);
          const parsed = parseEditorPath(path);

          // Проверяем консистентность
          if (parsed) {
            expect(parsed.projectId).toBe(project);
            expect(parsed.timelineId).toBe(timeline || 'root');
            expect(parsed.layerId).toBe(layer || 'root');
          }
        }
      });

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(400);
    });
  });
});
