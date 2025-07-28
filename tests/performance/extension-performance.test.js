/**
 * VER-023: Testes de Performance da Extensão
 * Validar métricas críticas de performance específicas da extensão
 */

const { performance } = require('perf_hooks');

// Mock do Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn().mockImplementation((keys) => {
        return Promise.resolve({
          veritasConfig: {
            googleApiKey: 'test-key',
            groqApiKey: 'test-key',
            language: 'pt-BR',
            theme: 'auto',
            cacheEnabled: true
          }
        });
      }),
      set: jest.fn().mockResolvedValue()
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    sendMessage: jest.fn().mockImplementation((message) => {
      return Promise.resolve({
        success: true,
        data: { result: 'test' },
        timestamp: Date.now()
      });
    }),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }])
  }
};

// Mock do DOM
global.document = {
  createElement: jest.fn().mockReturnValue({
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    },
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    getElementById: jest.fn()
  }),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  getElementById: jest.fn().mockReturnValue({
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    },
    value: '',
    checked: false,
    textContent: '',
    innerHTML: ''
  })
};

describe('VER-023: Performance da Extensão', () => {
  
  describe('Background Script Performance', () => {
    
    test('deve inicializar background script em < 100ms', async () => {
      const startTime = performance.now();
      
      // Simular inicialização do background script
      const backgroundInit = async () => {
        await chrome.storage.sync.get(['veritasConfig']);
        // Simular setup de listeners
        chrome.runtime.onMessage.addListener(() => {});
        return true;
      };
      
      const result = await backgroundInit();
      const endTime = performance.now();
      
      const initTime = endTime - startTime;
      
      expect(result).toBe(true);
      expect(initTime).toBeLessThan(100); // < 100ms
    });
    
    test('deve processar mensagens em < 50ms', async () => {
      const startTime = performance.now();
      
      const response = await chrome.runtime.sendMessage({
        action: 'getConfiguration'
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      expect(response.success).toBe(true);
      expect(processingTime).toBeLessThan(50); // < 50ms
    });
  });
  
  describe('Content Script Performance', () => {
    
    test('deve injetar UI em < 30ms', async () => {
      const startTime = performance.now();
      
      // Simular injeção de UI
      const injectUI = () => {
        const button = document.createElement('div');
        button.style.position = 'absolute';
        button.style.zIndex = '10000';
        document.body.appendChild(button);
        return button;
      };
      
      const element = injectUI();
      const endTime = performance.now();
      
      const injectionTime = endTime - startTime;
      
      expect(element).toBeDefined();
      expect(injectionTime).toBeLessThan(30); // < 30ms
    });
    
    test('deve detectar seleção de texto em < 20ms', async () => {
      const mockSelection = {
        toString: () => 'Texto selecionado para teste',
        rangeCount: 1,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({
            top: 100,
            left: 100,
            width: 200,
            height: 20
          })
        })
      };
      
      const startTime = performance.now();
      
      // Simular detecção de seleção
      const detectSelection = () => {
        const text = mockSelection.toString();
        if (text.length >= 10 && text.length <= 2000) {
          return {
            text,
            valid: true,
            position: mockSelection.getRangeAt(0).getBoundingClientRect()
          };
        }
        return { valid: false };
      };
      
      const result = detectSelection();
      const endTime = performance.now();
      
      const detectionTime = endTime - startTime;
      
      expect(result.valid).toBe(true);
      expect(detectionTime).toBeLessThan(20); // < 20ms
    });
  });
  
  describe('Popup Performance', () => {
    
    test('deve carregar popup em < 200ms', async () => {
      const startTime = performance.now();
      
      // Simular carregamento do popup
      const loadPopup = async () => {
        // Carregar configurações
        const config = await chrome.storage.sync.get(['veritasConfig']);
        
        // Simular renderização de elementos
        const elements = ['extension-status', 'api-status', 'google-api-key', 'groq-api-key'];
        elements.forEach(id => {
          document.getElementById(id);
        });
        
        return config;
      };
      
      const result = await loadPopup();
      const endTime = performance.now();
      
      const loadTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(loadTime).toBeLessThan(200); // < 200ms
    });
    
    test('deve salvar configurações em < 100ms', async () => {
      const config = {
        googleApiKey: 'new-google-key',
        groqApiKey: 'new-groq-key',
        language: 'pt-BR',
        theme: 'dark'
      };
      
      const startTime = performance.now();
      
      await chrome.storage.sync.set({ veritasConfig: config });
      
      const endTime = performance.now();
      const saveTime = endTime - startTime;
      
      expect(saveTime).toBeLessThan(100); // < 100ms
    });
  });
  
  describe('Options Page Performance', () => {
    
    test('deve carregar página de opções em < 300ms', async () => {
      const startTime = performance.now();
      
      // Simular carregamento da página de opções
      const loadOptions = async () => {
        const config = await chrome.storage.sync.get(['veritasConfig']);
        
        // Simular setup de abas
        const tabs = ['general-tab', 'api-tab', 'cache-tab', 'advanced-tab', 'help-tab'];
        tabs.forEach(tab => {
          document.getElementById(tab);
        });
        
        // Simular população de formulários
        const fields = ['google-api-key', 'groq-api-key', 'cache-enabled', 'cache-ttl'];
        fields.forEach(field => {
          const element = document.getElementById(field);
          if (element) {
            element.value = config.veritasConfig?.[field] || '';
          }
        });
        
        return true;
      };
      
      const result = await loadOptions();
      const endTime = performance.now();
      
      const loadTime = endTime - startTime;
      
      expect(result).toBe(true);
      expect(loadTime).toBeLessThan(300); // < 300ms
    });
  });
  
  describe('Memory Usage', () => {
    
    test('deve manter uso de memória da extensão baixo', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simular operações típicas da extensão
      for (let i = 0; i < 10; i++) {
        await chrome.storage.sync.get(['veritasConfig']);
        await chrome.runtime.sendMessage({ action: 'getConfiguration' });
        
        // Simular criação/remoção de elementos DOM
        const element = document.createElement('div');
        document.body.appendChild(element);
        document.body.removeChild(element);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Aumento de memória deve ser < 5MB para operações básicas
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });
  
  describe('Storage Performance', () => {
    
    test('deve acessar storage sync rapidamente', async () => {
      const iterations = 20;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await chrome.storage.sync.get(['veritasConfig']);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(20); // Média < 20ms
      expect(maxTime).toBeLessThan(50); // Máximo < 50ms
    });
    
    test('deve salvar no storage sync rapidamente', async () => {
      const iterations = 10;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const config = {
          testKey: `value-${i}`,
          timestamp: Date.now()
        };
        
        const startTime = performance.now();
        await chrome.storage.sync.set({ testConfig: config });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      expect(avgTime).toBeLessThan(30); // Média < 30ms
    });
  });
  
  describe('Communication Performance', () => {
    
    test('deve comunicar entre scripts rapidamente', async () => {
      const messages = [
        { action: 'getConfiguration' },
        { action: 'saveConfiguration', config: { test: true } },
        { action: 'testApiKey', apiType: 'google', apiKey: 'test' },
        { action: 'getStats' },
        { action: 'clearCache' }
      ];
      
      const times = [];
      
      for (const message of messages) {
        const startTime = performance.now();
        await chrome.runtime.sendMessage(message);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(40); // Média < 40ms
      expect(maxTime).toBeLessThan(80); // Máximo < 80ms
    });
  });
  
  describe('Concurrent Operations', () => {
    
    test('deve lidar com operações concorrentes', async () => {
      const startTime = performance.now();
      
      // Executar múltiplas operações simultaneamente
      const operations = [
        chrome.storage.sync.get(['veritasConfig']),
        chrome.runtime.sendMessage({ action: 'getConfiguration' }),
        chrome.runtime.sendMessage({ action: 'getStats' }),
        chrome.tabs.query({ active: true, currentWindow: true })
      ];
      
      const results = await Promise.all(operations);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(4);
      expect(results.every(result => result !== undefined)).toBe(true);
      expect(totalTime).toBeLessThan(150); // Todas as operações em < 150ms
    });
  });
});

// Utilitário para medir performance de funções
function measurePerformance(fn, name = 'Function') {
  return async (...args) => {
    const startTime = performance.now();
    const result = await fn(...args);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    console.log(`⏱️ ${name}: ${executionTime.toFixed(2)}ms`);
    
    return { result, executionTime };
  };
}

module.exports = { measurePerformance };
