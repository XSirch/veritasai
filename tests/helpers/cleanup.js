/**
 * Test Cleanup Helpers
 * Utilitários para limpeza de recursos em testes
 */

/**
 * Limpa todos os timers ativos
 */
export function clearAllTimers() {
  // Limpar todos os timeouts
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i <= highestTimeoutId; i++) {
    clearTimeout(i);
  }
  
  // Limpar todos os intervals
  const highestIntervalId = setInterval(() => {}, 0);
  for (let i = 0; i <= highestIntervalId; i++) {
    clearInterval(i);
  }
}

/**
 * Mock para cache manager que não cria timers
 */
export function createMockCacheManager() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(true),
    has: jest.fn().mockResolvedValue(false),
    size: jest.fn().mockResolvedValue(0),
    cleanup: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0
    }),
    // Não iniciar timer de cleanup
    _startCleanupTimer: jest.fn()
  };
}

/**
 * Mock para Google Fact Check Service sem timers
 */
export function createMockGoogleFactCheckService() {
  return {
    checkFacts: jest.fn().mockResolvedValue({
      success: true,
      claims: [],
      summary: { total: 0, verified: 0, disputed: 0, mixed: 0 }
    }),
    checkFactsBatch: jest.fn().mockResolvedValue([]),
    getStats: jest.fn().mockReturnValue({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    }),
    isConfigured: jest.fn().mockReturnValue(true),
    // Não criar cache com timers
    cache: createMockCacheManager()
  };
}

/**
 * Mock para Groq LLM Service sem timers
 */
export function createMockGroqLLMService() {
  return {
    analyzeText: jest.fn().mockResolvedValue({
      success: true,
      classification: 'uncertain',
      confidence: 0.5,
      reasoning: 'Mock analysis'
    }),
    getStats: jest.fn().mockReturnValue({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      averageResponseTime: 0
    }),
    isConfigured: jest.fn().mockReturnValue(true),
    // Não criar cache com timers
    cache: createMockCacheManager()
  };
}

/**
 * Mock para Integration Service sem timers
 */
export function createMockIntegrationService() {
  return {
    isInitialized: true,
    activeVerifications: new Map(),
    stats: {
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      cacheHits: 0,
      averageResponseTime: 0
    },
    
    init: jest.fn().mockResolvedValue(),
    setupMessageListeners: jest.fn(),
    setupEventListeners: jest.fn(),
    
    validateInput: jest.fn().mockReturnValue({ valid: true }),
    executeVerificationFlow: jest.fn().mockResolvedValue({
      success: true,
      data: { classification: 'verified', confidence: 0.85 },
      verificationId: 'test-id',
      responseTime: 1000
    }),
    
    generateVerificationId: jest.fn().mockReturnValue('test-verification-id'),
    getVerificationStatus: jest.fn().mockReturnValue({ status: 'not_found' }),
    cancelVerification: jest.fn().mockReturnValue(false),
    
    updateStats: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      activeVerifications: 0,
      successRate: 0,
      cacheHitRate: 0
    }),
    
    destroy: jest.fn()
  };
}

/**
 * Setup global para testes sem memory leaks
 */
export function setupTestEnvironment() {
  // Mock de fetch global
  global.fetch = jest.fn();
  
  // Mock de AbortController
  global.AbortController = jest.fn(() => ({
    abort: jest.fn(),
    signal: { aborted: false }
  }));
  
  // Mock de setTimeout/setInterval que não criam handles reais
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;
  const originalClearTimeout = global.clearTimeout;
  const originalClearInterval = global.clearInterval;
  
  global.setTimeout = jest.fn((fn, delay) => {
    if (delay === 0) {
      // Executar imediatamente para testes
      fn();
      return 1;
    }
    return originalSetTimeout(fn, delay);
  });
  
  global.setInterval = jest.fn((fn, delay) => {
    // Para testes, não criar intervals reais
    return 1;
  });
  
  global.clearTimeout = jest.fn(originalClearTimeout);
  global.clearInterval = jest.fn(originalClearInterval);
}

/**
 * Cleanup global após testes
 */
export function cleanupTestEnvironment() {
  // Limpar todos os mocks
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  // Limpar timers reais se existirem
  clearAllTimers();
  
  // Reset de fetch
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
}

/**
 * Helper para aguardar que todos os promises sejam resolvidos
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Helper para aguardar um tempo específico em testes
 */
export async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock completo do Chrome API sem side effects
 */
export function createMockChromeAPI() {
  return {
    runtime: {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn().mockReturnValue(false)
      },
      getURL: jest.fn(path => `chrome-extension://test/${path}`),
      id: 'test-extension-id'
    },
    storage: {
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        clear: jest.fn().mockResolvedValue()
      },
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        clear: jest.fn().mockResolvedValue()
      },
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    tabs: {
      query: jest.fn().mockResolvedValue([]),
      sendMessage: jest.fn().mockResolvedValue({ success: true })
    }
  };
}
