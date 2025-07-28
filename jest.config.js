/**
 * Jest Configuration for VeritasAI Extension
 * Configuração para testes unitários e de integração
 * VER-024: Configuração robusta com suporte completo a Jest globais
 */

module.exports = {
  // Ambiente de teste
  testEnvironment: 'jsdom',

  // Arquivos de setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transformações
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Ignorar transformações para alguns módulos
  transformIgnorePatterns: [
    'node_modules/(?!(compromise|compromise-numbers|compromise-dates)/)'
  ],

  // Mapeamento de módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
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
  
  // Extensões de arquivo
  moduleFileExtensions: ['js', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/assets/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/content/content.js' // Arquivo com encoding issues
  ],
  
  // Coverage thresholds (apenas para arquivos específicos testados)
  coverageThreshold: {
    // Thresholds específicos para arquivos testados
    './src/utils/performance-monitor.js': {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
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
    'testUtils': true,
    'testHelpers': true,
    'setupCompromise': true,
    'performance': true,
    'WeakRef': true,
    'PerformanceObserver': true
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
  
  // Force exit para evitar memory leaks
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaks
  detectLeaks: false
};
