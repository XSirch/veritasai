/**
 * Setup global para testes Jest
 * Configurações e mocks globais para todos os testes
 * VER-024: Setup robusto com suporte completo a Jest globais
 */

// Jest setup file
require('jest-environment-jsdom');

// Configurar timeout global para testes
jest.setTimeout(30000);

// Mock do fetch global
global.fetch = jest.fn();

// Mock do console para reduzir ruído nos testes (mas preservar para debug)
const originalConsole = global.console;
global.console = {
  ...console,
  log: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  warn: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.warn,
  error: originalConsole.error, // Manter errors visíveis
  info: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.info,
  debug: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.debug
};

// Mock chrome extension APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    },
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    }
  },
  runtime: {
    sendMessage: jest.fn(() => Promise.resolve()),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
    id: 'test-extension-id'
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([])),
    sendMessage: jest.fn(() => Promise.resolve()),
    create: jest.fn(() => Promise.resolve())
  },
  scripting: {
    executeScript: jest.fn(() => Promise.resolve()),
    insertCSS: jest.fn(() => Promise.resolve())
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn()
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn()
  }
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock IndexedDB
const mockIDB = {
  open: jest.fn(() => Promise.resolve({
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve()),
        put: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
        clear: jest.fn(() => Promise.resolve())
      }))
    }))
  }))
};

global.indexedDB = mockIDB;

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  }
});

// Mock navigator
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock window.location (apenas se window existir)
if (typeof window !== 'undefined') {
  delete window.location;
  window.location = {
    href: 'https://example.com',
    hostname: 'example.com',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
  };
}

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup DOM (apenas se document existir)
if (typeof document !== 'undefined') {
  document.body.innerHTML = '';
}

// Global test utilities
global.testUtils = {
  createMockElement: (tag = 'div', attributes = {}) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  },
  
  createMockSelection: (text = 'test text') => {
    const selection = {
      toString: () => text,
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
    
    window.getSelection = jest.fn(() => selection);
    return selection;
  },
  
  mockApiResponse: (data, status = 200) => {
    global.fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data))
    });
  },
  
  mockApiError: (error, status = 500) => {
    global.fetch.mockRejectedValueOnce(
      Object.assign(new Error(error), { status })
    );
  }
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();

  // Reset DOM apenas se document existir
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }

  // Reset chrome mocks com verificação segura
  if (global.chrome) {
    // Reset storage mocks com verificação
    if (chrome.storage && chrome.storage.sync) {
      Object.values(chrome.storage.sync).forEach(fn => {
        if (fn && fn.mockClear) fn.mockClear();
      });
    }
    if (chrome.storage && chrome.storage.local) {
      Object.values(chrome.storage.local).forEach(fn => {
        if (fn && fn.mockClear) fn.mockClear();
      });
    }

    // Reset runtime mocks
    if (chrome.runtime && chrome.runtime.sendMessage && chrome.runtime.sendMessage.mockClear) {
      chrome.runtime.sendMessage.mockClear();
    }
  }

  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
});

// Configuração global de timeout para testes
jest.setTimeout(30000);

// Setup para evitar memory leaks
beforeAll(() => {
  // Mock de setTimeout/setInterval para evitar handles
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;

  global.setTimeout = jest.fn((fn, delay) => {
    if (delay === 0 || delay < 100) {
      // Executar imediatamente para testes rápidos
      setImmediate(fn);
      return 1;
    }
    return originalSetTimeout(fn, delay);
  });

  global.setInterval = jest.fn(() => {
    // Para testes, não criar intervals reais
    return 1;
  });
});

// Cleanup adicional após cada teste
afterEach(() => {
  // Limpar todos os timers reais que possam ter sido criados
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i <= highestTimeoutId; i++) {
    clearTimeout(i);
  }

  const highestIntervalId = setInterval(() => {}, 0);
  for (let i = 0; i <= highestIntervalId; i++) {
    clearInterval(i);
  }
});

// VER-024: Helpers globais adicionais para Jest

// Mock do performance API global mais robusto
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 10 * 1024 * 1024, // 10MB
      totalJSHeapSize: 50 * 1024 * 1024, // 50MB
      jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
    }
  };
}

// Mock para WeakRef se não existir
if (typeof WeakRef === 'undefined') {
  global.WeakRef = class WeakRef {
    constructor(target) {
      this.target = target;
    }

    deref() {
      return this.target;
    }
  };
}

// Mock para PerformanceObserver se não existir
if (typeof PerformanceObserver === 'undefined') {
  global.PerformanceObserver = class PerformanceObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      // Mock implementation
    }

    disconnect() {
      // Mock implementation
    }
  };
}

// Setup para compromise.js (resolver problema de plugin null)
global.setupCompromise = () => {
  try {
    const compromise = require('compromise');

    // Mock dos plugins se não estiverem disponíveis
    if (!compromise.plugin) {
      compromise.plugin = jest.fn();
    }

    return compromise;
  } catch (error) {
    // Retornar mock se compromise não estiver disponível
    return {
      plugin: jest.fn(),
      extend: jest.fn()
    };
  }
};

// Helpers globais para testes
global.testHelpers = {
  // Helper para aguardar próximo tick
  nextTick: () => new Promise(resolve => process.nextTick(resolve)),

  // Helper para aguardar timeout
  wait: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper para criar mock de função com implementação
  createMockFn: (implementation) => jest.fn(implementation),

  // Helper para resetar todos os mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
    if (global.resetChromeMocks) {
      global.resetChromeMocks();
    }
  },

  // Helper para criar elemento DOM mock
  createMockElement: (tagName = 'div') => ({
    tagName: tagName.toUpperCase(),
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
      toggle: jest.fn()
    },
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getBoundingClientRect: jest.fn(() => ({
      top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0
    }))
  }),

  // Helper para simular evento DOM
  createMockEvent: (type, properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: null,
    currentTarget: null,
    ...properties
  })
};

// Mock para módulos problemáticos
jest.mock('compromise-numbers', () => ({}), { virtual: true });
jest.mock('compromise-dates', () => ({}), { virtual: true });

// Mock para setImmediate se não existir (Node.js specific)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (cb) => setTimeout(cb, 0);
}

// Mock para clearImmediate se não existir
if (typeof clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}
