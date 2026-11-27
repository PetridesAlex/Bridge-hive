/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@bridge-hive/domain$': '<rootDir>../../packages/domain/src/index.ts',
    '^expo-file-system/legacy$': '<rootDir>/test-mocks/expo-file-system-legacy.js',
    '^expo-image-manipulator$': '<rootDir>/test-mocks/expo-image-manipulator.js',
    '^expo-document-picker$': '<rootDir>/test-mocks/expo-document-picker.js',
    '^expo-image-picker$': '<rootDir>/test-mocks/expo-image-picker.js',
  },
};
