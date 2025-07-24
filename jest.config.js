/**
 * Jest Configuration for VeritasAI Extension
 * Configuração para testes unitários e de integração
 */

module.exports = {
  // Ambiente de teste
  testEnvironment: 'jsdom',
  
  // Arquivos de setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Padrões de arquivos de teste
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.js',
    '<rootDir>/src/**/*.test.js'
  ],
  
  // Ignorar arquivos
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/python/'
  ],
  
  // Transformações
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Extensões de arquivo
  moduleFileExtensions: ['js', 'json'],
  

  
  // Arquivos a serem ignorados na transformação
  transformIgnorePatterns: [
    'node_modules/(?!(chrome-extension-async|webextension-polyfill)/)'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/assets/**',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  
  // Coverage thresholds (baixos para testes iniciais)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Globals
  globals: {
    'chrome': true,
    'browser': true,
    'testUtils': true
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Timeout for tests
  testTimeout: 10000,
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode
  notify: false,
  
  // Watch plugins (comentado até instalar)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ],
  
  // Reporter configuration
  reporters: [
    'default'
    // Comentado até instalar jest-html-reporters
    // [
    //   'jest-html-reporters',
    //   {
    //     publicPath: './coverage/html-report',
    //     filename: 'report.html',
    //     expand: true,
    //     hideIcon: false,
    //     pageTitle: 'VeritasAI Test Report'
    //   }
    // ]
  ],
  
  // Mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/tests/__mocks__/fileMock.js'
  },
  
  // Setup files
  setupFiles: [
    '<rootDir>/tests/__mocks__/chrome.js'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'https://example.com',
    userAgent: 'Mozilla/5.0 (Chrome Extension Test Environment)'
  },
  
  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
    }
  ],
  
  // Max workers
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Bail on first failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Force exit
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaks
  detectLeaks: false
};
