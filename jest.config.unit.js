/**
 * Jest Configuration for Unit Tests Only
 * Configuração específica para testes unitários sem thresholds globais rígidos
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
  
  // Extensões de arquivo
  moduleFileExtensions: ['js', 'json'],
  
  // Padrões de teste
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js'
  ],
  
  // Arquivos a serem ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Cobertura de código (apenas para arquivos testados)
  collectCoverageFrom: [
    'src/utils/performance-monitor.js',
    'src/utils/memory-optimizer.js',
    'src/utils/response-optimizer.js',
    'src/utils/keyword-extractor.js'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Thresholds apenas para arquivos específicos (sem global)
  coverageThreshold: {
    './src/utils/performance-monitor.js': {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    }
  },
  
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
  
  // Configurações de timeout
  testTimeout: 30000,
  
  // Verbose para debug
  verbose: false,
  
  // Configurações de mock
  clearMocks: true,
  restoreMocks: true,
  
  // Configurações de watch
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ]
};
