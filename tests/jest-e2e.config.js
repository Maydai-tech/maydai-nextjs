module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['**/tests/integration/**/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 10000,
  collectCoverage: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  }
};