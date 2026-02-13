module.exports = {
  displayName: 'AI Pipeline Tests',
  testMatch: [
    '<rootDir>/unit/**/*.test.ts',
    '<rootDir>/integration/**/*.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/../../setup.ts'],
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/../../../src/modules/ai/pipeline/**/*.ts',
    '!<rootDir>/../../../src/modules/ai/pipeline/**/*.d.ts',
    '!<rootDir>/../../../src/modules/ai/pipeline/**/index.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>'],
  testTimeout: 30000, // 30 секунд для integration тестов
  verbose: true,
  
  // Mock настройки
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../src/$1'
  }
}; 