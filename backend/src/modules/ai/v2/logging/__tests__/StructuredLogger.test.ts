// backend/src/modules/ai/v2/logging/__tests__/StructuredLogger.test.ts
import { StructuredLogger } from '../StructuredLogger';
import { LogLevel, LogContext, LogMetadata } from '../types';

// Mock console для тестирования вывода
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
let logOutput: string[] = [];

beforeEach(() => {
  logOutput = [];
  console.log = jest.fn((message: string) => {
    logOutput.push(message);
  });
  console.error = jest.fn((message: string) => {
    logOutput.push(message);
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('StructuredLogger', () => {
  describe('basic logging', () => {
    it('should log info messages', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      
      logger.info('Test message');
      
      expect(logOutput).toHaveLength(1);
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should not log debug messages when level is INFO', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      
      logger.debug('Debug message');
      
      expect(logOutput).toHaveLength(0);
    });

    it('should log debug messages when level is DEBUG', () => {
      const logger = new StructuredLogger({ level: LogLevel.DEBUG, pretty: false });
      
      logger.debug('Debug message');
      
      expect(logOutput).toHaveLength(1);
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.level).toBe('debug');
    });

    it('should always log error messages', () => {
      const logger = new StructuredLogger({ level: LogLevel.ERROR, pretty: false });
      
      logger.error('Error message');
      
      expect(logOutput).toHaveLength(1);
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.level).toBe('error');
    });
  });

  describe('context and metadata', () => {
    it('should include context in log entry', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      const context: LogContext = {
        userId: 'user123',
        projectId: 'project456',
        requestId: 'req789'
      };
      
      logger.info('Test with context', context);
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.context).toEqual(context);
    });

    it('should include metadata in log entry', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      const metadata: LogMetadata = {
        duration: 150,
        provider: 'openai',
        model: 'gpt-4'
      };
      
      logger.info('Test with metadata', undefined, metadata);
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.metadata).toEqual(metadata);
    });

    it('should include both context and metadata', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      const context: LogContext = { userId: 'user123' };
      const metadata: LogMetadata = { duration: 100 };
      
      logger.info('Test message', context, metadata);
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.context).toEqual(context);
      expect(logEntry.metadata).toEqual(metadata);
    });
  });

  describe('message sanitization', () => {
    it('should truncate long messages', () => {
      const logger = new StructuredLogger({ 
        level: LogLevel.INFO, 
        pretty: false,
        maxMessageLength: 10
      });
      
      logger.info('This is a very long message that should be truncated');
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.message).toBe('This is...');
    });

    it('should sanitize sensitive data in metadata', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      const metadata: LogMetadata = {
        password: 'secret123',
        apiKey: 'key456',
        normalField: 'value'
      };
      
      logger.info('Test message', undefined, metadata);
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.metadata.password).toBe('[REDACTED]');
      expect(logEntry.metadata.apiKey).toBe('[REDACTED]');
      expect(logEntry.metadata.normalField).toBe('value');
    });
  });

  describe('pretty formatting', () => {
    it('should format logs nicely in development mode', () => {
      const logger = new StructuredLogger({ 
        level: LogLevel.INFO, 
        pretty: true 
      });
      
      logger.info('Test message');
      
      expect(logOutput[0]).toContain('INFO');
      expect(logOutput[0]).toContain('Test message');
      expect(logOutput[0]).toContain('\x1b[32m'); // Green color code
    });

    it('should include context in pretty format', () => {
      const logger = new StructuredLogger({ 
        level: LogLevel.INFO, 
        pretty: true 
      });
      const context: LogContext = { userId: 'user123' };
      
      logger.info('Test message', context);
      
      expect(logOutput[0]).toContain('userId=user123');
    });
  });

  describe('error logging', () => {
    it('should handle error objects in metadata', () => {
      const logger = new StructuredLogger({ level: LogLevel.ERROR, pretty: false });
      const error = new Error('Test error');
      const metadata: LogMetadata = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };
      
      logger.error('Operation failed', undefined, metadata);
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.metadata.error.name).toBe('Error');
      expect(logEntry.metadata.error.message).toBe('Test error');
      expect(logEntry.metadata.error.stack).toBeDefined();
    });
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const logger1 = StructuredLogger.getInstance();
      const logger2 = StructuredLogger.getInstance();
      
      expect(logger1).toBe(logger2);
    });
  });

  describe('child logger', () => {
    it('should create contextual logger', () => {
      const logger = new StructuredLogger({ level: LogLevel.INFO, pretty: false });
      const context: LogContext = { userId: 'user123' };
      
      const childLogger = logger.child(context);
      childLogger.info('Child message');
      
      const logEntry = JSON.parse(logOutput[0]);
      expect(logEntry.context.userId).toBe('user123');
    });
  });
});
