/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Resolve workspace packages from this worktree, not a sibling checkout's node_modules.
    '^@bridge-hive/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@bridge-hive/supabase-types$': '<rootDir>/../../packages/supabase-types/src/index.ts',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.test.ts',
    '!lib/**/__tests__/**',
  ],
};

module.exports = config;
