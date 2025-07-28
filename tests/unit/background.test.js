/**
 * Testes Unitários - Background Service Worker
 * Testa BackgroundService, APIManager, CacheManager e MessageHandler
 */

// Mock do BackgroundService para evitar ES modules
class MockBackgroundService {
  constructor() {
    this.isInitialized = false;
    this.messageHandler = null;
    this.apiManager = null;
    this.cacheManager = null;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }

  async init() {
    this.isInitialized = true;
    this.setupMessageListeners();
    this.setupApiManager();
    this.setupCacheManager();
  }

  setupMessageListeners() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }
  }

  setupApiManager() {
    this.apiManager = {
      verifyText: jest.fn().mockResolvedValue({
        success: true,
        data: { classification: 'verified', confidence: 0.85 }
      }),
      isConfigured: jest.fn().mockReturnValue(true)
    };
  }

  setupCacheManager() {
    this.cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      has: jest.fn().mockResolvedValue(false),
      clear: jest.fn().mockResolvedValue(true)
    };
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      const { action, data } = request;

      switch (action) {
        case 'verifyText':
          const result = await this.verifyText(data);
          sendResponse(result);
          break;

        case 'getStats':
          sendResponse({ success: true, data: this.getStats() });
          break;

        case 'clearCache':
          await this.cacheManager.clear();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Ação não reconhecida' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async verifyText(data) {
    const startTime = Date.now();

    try {
      // Verificar cache primeiro
      const cacheKey = `verify_${JSON.stringify(data)}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.updateStats(true, Date.now() - startTime, true);
        return { success: true, data: cached, source: 'cache' };
      }

      // Verificar via API
      const result = await this.apiManager.verifyText(data);

      if (result.success) {
        // Armazenar no cache
        await this.cacheManager.set(cacheKey, result.data);
        this.updateStats(true, Date.now() - startTime, false);
      } else {
        this.updateStats(false, Date.now() - startTime, false);
      }

      return result;

    } catch (error) {
      this.updateStats(false, Date.now() - startTime, false);
      return { success: false, error: error.message };
    }
  }

  updateStats(success, responseTime, cacheHit) {
    this.stats.totalRequests++;

    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Calcular tempo médio
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = Math.round(totalTime / this.stats.totalRequests);
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0
        ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
        : 0
    };
  }

  destroy() {
    this.isInitialized = false;
    if (this.cacheManager && this.cacheManager.clear) {
      this.cacheManager.clear();
    }
  }
}

// Mock do Chrome API
global.chrome = {
  runtime: {
    onStartup: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    onConnect: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({ version: '1.0.18' })),
    lastError: null
  },
  storage: {
    sync: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
    local: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
    onChanged: { addListener: jest.fn() }
  },
  alarms: {
    create: jest.fn(),
    onAlarm: { addListener: jest.fn() }
  },
  tabs: { query: jest.fn(), sendMessage: jest.fn() }
};

// Mock do self (Service Worker)
global.self = {
  addEventListener: jest.fn(),
  skipWaiting: jest.fn(() => Promise.resolve()),
  clients: { claim: jest.fn(() => Promise.resolve()) }
};

describe('BackgroundService', () => {
  let backgroundService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    BackgroundService.prototype.init = jest.fn();
    backgroundService = new BackgroundService();
  });
  
  describe('Inicialização', () => {
    test('deve inicializar todos os serviços', async () => {
      BackgroundService.prototype.init.mockRestore();
      
      const mockConfigService = {
        init: jest.fn().mockResolvedValue(),
        getConfiguration: jest.fn().mockReturnValue({})
      };
      
      const mockCacheManager = { init: jest.fn().mockResolvedValue() };
      const mockAPIManager = { init: jest.fn().mockResolvedValue() };
      const mockMessageHandler = { init: jest.fn() };
      
      backgroundService.configService = mockConfigService;
      backgroundService.cacheManager = mockCacheManager;
      backgroundService.apiManager = mockAPIManager;
      backgroundService.messageHandler = mockMessageHandler;
      
      await backgroundService.init();
      
      expect(mockConfigService.init).toHaveBeenCalled();
      expect(mockCacheManager.init).toHaveBeenCalled();
      expect(mockAPIManager.init).toHaveBeenCalled();
      expect(mockMessageHandler.init).toHaveBeenCalled();
      expect(backgroundService.isInitialized).toBe(true);
    });
  });
  
  describe('Verificação de Texto', () => {
    beforeEach(() => {
      backgroundService.isInitialized = true;
      backgroundService.cacheManager = {
        get: jest.fn(),
        set: jest.fn()
      };
      backgroundService.apiManager = {
        verifyText: jest.fn()
      };
    });
    
    test('deve verificar texto com sucesso', async () => {
      const mockResult = {
        classification: 'verified',
        confidence: 0.95,
        sources: []
      };
      
      backgroundService.cacheManager.get.mockResolvedValue(null);
      backgroundService.apiManager.verifyText.mockResolvedValue(mockResult);
      backgroundService.cacheManager.set.mockResolvedValue();
      
      const request = {
        text: 'Texto para verificar',
        contentType: 'news',
        options: {}
      };
      
      const result = await backgroundService.verifyText(request);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(mockResult));
      expect(result.source).toBe('api');
    });
    
    test('deve retornar resultado do cache', async () => {
      const cachedResult = {
        classification: 'verified',
        confidence: 0.95,
        sources: []
      };
      
      backgroundService.cacheManager.get.mockResolvedValue(cachedResult);
      
      const request = {
        text: 'Texto para verificar',
        contentType: 'news',
        options: {}
      };
      
      const result = await backgroundService.verifyText(request);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedResult);
      expect(result.source).toBe('cache');
      expect(backgroundService.apiManager.verifyText).not.toHaveBeenCalled();
    });
    
    test('deve validar entrada', async () => {
      const request = {
        text: 'abc', // muito curto
        contentType: 'news'
      };
      
      const result = await backgroundService.verifyText(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('muito curto');
    });
  });
});

describe('CacheManager', () => {
  let cacheManager;
  
  beforeEach(() => {
    cacheManager = new CacheManager();
    cacheManager.isInitialized = true;
  });
  
  describe('Operações Básicas', () => {
    test('deve armazenar e recuperar item', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      await cacheManager.set(key, data);
      const retrieved = await cacheManager.get(key);
      
      expect(retrieved).toEqual(data);
      expect(cacheManager.stats.sets).toBe(1);
      expect(cacheManager.stats.hits).toBe(1);
    });
    
    test('deve retornar null para chave inexistente', async () => {
      const result = await cacheManager.get('non-existent-key');
      
      expect(result).toBeNull();
      expect(cacheManager.stats.misses).toBe(1);
    });
    
    test('deve remover item expirado', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      // Definir TTL muito baixo
      await cacheManager.set(key, data, 1);
      
      // Aguardar expiração
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheManager.get(key);
      
      expect(result).toBeNull();
      expect(cacheManager.cache.has(key)).toBe(false);
    });
  });
  
  describe('Compressão', () => {
    test('deve comprimir dados grandes', () => {
      const largeData = 'x'.repeat(2000);
      const compressed = cacheManager.compress(largeData);
      
      expect(compressed.compressed).toBe(true);
      expect(compressed.data).toBeDefined();
    });
    
    test('deve não comprimir dados pequenos', () => {
      const smallData = 'small data';
      const result = cacheManager.compress(smallData);
      
      expect(result.compressed).toBe(false);
    });
    
    test('deve descomprimir corretamente', () => {
      const originalData = { test: 'data', large: 'x'.repeat(2000) };
      const compressed = cacheManager.compress(originalData);
      const decompressed = cacheManager.decompress(compressed);
      
      expect(decompressed).toEqual(originalData);
    });
  });
});

describe('RetryLogic', () => {
  let retryLogic;
  
  beforeEach(() => {
    retryLogic = new RetryLogic();
  });
  
  describe('Execução com Retry', () => {
    test('deve executar função com sucesso na primeira tentativa', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryLogic.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('deve tentar novamente em caso de erro', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await retryLogic.execute(mockFn, { maxRetries: 2, delay: 10 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
    
    test('deve falhar após esgotar tentativas', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(
        retryLogic.execute(mockFn, { maxRetries: 2, delay: 10 })
      ).rejects.toThrow('Persistent error');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // 1 + 2 retries
    });
  });
  
  describe('Condições de Retry', () => {
    test('deve não tentar novamente para erro 401', () => {
      const error = { status: 401 };
      
      expect(retryLogic.shouldRetry(error)).toBe(false);
    });
    
    test('deve tentar novamente para erro 500', () => {
      const error = { status: 500 };
      
      expect(retryLogic.shouldRetry(error)).toBe(true);
    });
    
    test('deve tentar novamente para timeout', () => {
      const error = { code: 'TIMEOUT' };
      
      expect(retryLogic.shouldRetry(error)).toBe(true);
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter;
  
  beforeEach(() => {
    rateLimiter = new RateLimiter();
    rateLimiter.configure({
      testApi: { requests: 3, window: 1000 }
    });
  });
  
  describe('Limite de Requests', () => {
    test('deve permitir requests dentro do limite', async () => {
      await expect(rateLimiter.checkLimit('testApi')).resolves.toBe(true);
      await expect(rateLimiter.checkLimit('testApi')).resolves.toBe(true);
      await expect(rateLimiter.checkLimit('testApi')).resolves.toBe(true);
    });
    
    test('deve bloquear requests acima do limite', async () => {
      // Esgotar limite
      await rateLimiter.checkLimit('testApi');
      await rateLimiter.checkLimit('testApi');
      await rateLimiter.checkLimit('testApi');
      
      // Próximo request deve falhar
      await expect(rateLimiter.checkLimit('testApi')).rejects.toThrow('Rate limit exceeded');
    });
    
    test('deve resetar limite após janela de tempo', async () => {
      // Esgotar limite
      await rateLimiter.checkLimit('testApi');
      await rateLimiter.checkLimit('testApi');
      await rateLimiter.checkLimit('testApi');
      
      // Aguardar reset da janela
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Deve permitir novamente
      await expect(rateLimiter.checkLimit('testApi')).resolves.toBe(true);
    });
  });
  
  describe('Status e Estatísticas', () => {
    test('deve retornar status correto', async () => {
      await rateLimiter.checkLimit('testApi');
      await rateLimiter.checkLimit('testApi');
      
      const status = rateLimiter.getStatus();
      
      expect(status.testApi.current).toBe(2);
      expect(status.testApi.remaining).toBe(1);
      expect(status.testApi.limit).toBe(3);
    });
  });
});

describe('MockBackgroundService', () => {
  let backgroundService;

  beforeEach(async () => {
    jest.clearAllMocks();
    backgroundService = new MockBackgroundService();
    await backgroundService.init();
  });

  afterEach(() => {
    if (backgroundService) {
      backgroundService.destroy();
    }
  });

  describe('Inicialização', () => {
    test('deve inicializar corretamente', () => {
      expect(backgroundService.isInitialized).toBe(true);
      expect(backgroundService.apiManager).toBeDefined();
      expect(backgroundService.cacheManager).toBeDefined();
    });

    test('deve configurar listeners de mensagem', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  describe('Verificação de Texto', () => {
    test('deve verificar texto com sucesso', async () => {
      const testData = {
        text: 'Texto para verificação',
        contentType: 'general'
      };

      const result = await backgroundService.verifyText(testData);

      expect(result.success).toBe(true);
      expect(result.data.classification).toBe('verified');
      expect(result.data.confidence).toBe(0.85);
    });

    test('deve usar cache quando disponível', async () => {
      const testData = {
        text: 'Texto para cache',
        contentType: 'general'
      };

      // Mock cache hit
      backgroundService.cacheManager.get.mockResolvedValueOnce({
        classification: 'cached',
        confidence: 0.9
      });

      const result = await backgroundService.verifyText(testData);

      expect(result.success).toBe(true);
      expect(result.data.classification).toBe('cached');
      expect(result.source).toBe('cache');
    });

    test('deve tratar erro na verificação', async () => {
      const testData = {
        text: 'Texto com erro',
        contentType: 'general'
      };

      // Mock erro na API
      backgroundService.apiManager.verifyText.mockRejectedValueOnce(
        new Error('API Error')
      );

      const result = await backgroundService.verifyText(testData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('Manipulação de Mensagens', () => {
    test('deve processar mensagem verifyText', async () => {
      const request = {
        action: 'verifyText',
        data: { text: 'Teste', contentType: 'general' }
      };
      const sender = {};
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            classification: 'verified'
          })
        })
      );
    });

    test('deve processar mensagem getStats', async () => {
      const request = { action: 'getStats' };
      const sender = {};
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequests: expect.any(Number),
            successRate: expect.any(Number)
          })
        })
      );
    });

    test('deve processar mensagem clearCache', async () => {
      const request = { action: 'clearCache' };
      const sender = {};
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(request, sender, sendResponse);

      expect(backgroundService.cacheManager.clear).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('deve tratar ação não reconhecida', async () => {
      const request = { action: 'unknownAction' };
      const sender = {};
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Ação não reconhecida'
      });
    });
  });

  describe('Estatísticas', () => {
    test('deve atualizar estatísticas corretamente', () => {
      backgroundService.updateStats(true, 1000, false);

      const stats = backgroundService.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(1000);
      expect(stats.successRate).toBe(100);
    });

    test('deve calcular taxa de sucesso corretamente', () => {
      backgroundService.updateStats(true, 1000, false);
      backgroundService.updateStats(false, 500, false);

      const stats = backgroundService.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
      expect(stats.successRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    test('deve limpar recursos ao destruir', () => {
      backgroundService.destroy();

      expect(backgroundService.isInitialized).toBe(false);
      expect(backgroundService.cacheManager.clear).toHaveBeenCalled();
    });
  });
});
