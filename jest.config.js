const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/page.tsx'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1', // <-- CORRECTION CRITIQUE ICI
    '^@mistralai/mistralai$': '<rootDir>/lib/mistral/__mocks__/mistralai.ts',
  },
}

module.exports = async () => {
  const baseConfig = await createJestConfig(customJestConfig)()

  // Fusion stricte pour garantir que l'alias @/ survit à la création des sous-projets
  const sharedConfig = {
    ...baseConfig,
    moduleNameMapper: {
      ...baseConfig.moduleNameMapper,
      ...customJestConfig.moduleNameMapper,
    },
  }

  return {
    ...sharedConfig,
    projects: [
      {
        ...sharedConfig,
        displayName: 'backend',
        testEnvironment: 'node',
        setupFilesAfterEnv: [],
        testMatch: [
          '<rootDir>/lib/**/*.{test,spec}.{js,ts}',
          '<rootDir>/app/api/**/*.{test,spec}.{js,ts}',
          '<rootDir>/tests/unit/**/*.{test,spec}.{js,ts}',
          '<rootDir>/app/**/utils/**/*.{test,spec}.{js,ts}',
          '<rootDir>/app/**/lib/**/*.{test,spec}.{js,ts}',
        ],
      },
      {
        ...sharedConfig,
        displayName: 'frontend',
        testEnvironment: 'jest-environment-jsdom',
        setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
        testMatch: [
          '<rootDir>/app/**/hooks/**/*.{test,spec}.{js,ts}',
          '<rootDir>/app/**/components/**/*.{test,spec}.{js,ts,tsx}',
          '<rootDir>/components/**/*.{test,spec}.{js,ts,tsx}',
        ],
      },
    ],
  }
}
