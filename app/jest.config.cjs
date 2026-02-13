const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Путь к Next.js приложению для загрузки next.config.js и .env файлов
  dir: './'
});

// Конфигурация Jest, которую вы хотите передать
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Определение алиасов для импортов
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^nanoid(/(.*)|$)': 'nanoid$1',
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    // Использование babel-jest для транспиляции файлов с расширениями js, jsx, ts, tsx
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {presets: ['next/babel']}]
  },
  transformIgnorePatterns: [
    // По умолчанию Jest игнорирует все файлы в node_modules
    // Здесь мы указываем, что некоторые модули, использующие ESM, должны быть трансформированы
    '/node_modules/(?!(nanoid|@\\w+.*esm.*)/)'
  ],
  // Зоны, которые коллективно покрывают все источники, чтобы считать процент покрытия
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.{js,jsx,ts,tsx}', '!**/node_modules/**', '!**/.next/**']
};

// createJestConfig автоматически объединяет все параметры, которые мы передаем
// с дефолтными настройками Next.js для Jest
module.exports = createJestConfig(customJestConfig);
