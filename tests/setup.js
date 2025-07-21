// Jest setup file
import 'jest-environment-jsdom';

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

// Mock window.location
delete window.location;
window.location = {
  href: 'https://example.com',
  hostname: 'example.com',
  pathname: '/',
  search: '',
  hash: ''
};

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup DOM
document.body.innerHTML = '';

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
  document.body.innerHTML = '';
  
  // Reset chrome mocks
  Object.values(chrome.storage.sync).forEach(fn => fn.mockClear());
  Object.values(chrome.storage.local).forEach(fn => fn.mockClear());
  chrome.runtime.sendMessage.mockClear();
  
  // Reset fetch mock
  global.fetch.mockClear();
});
