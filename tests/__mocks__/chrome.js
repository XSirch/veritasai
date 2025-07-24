/**
 * Chrome Extension API Mocks
 * Mocks adicionais para APIs específicas do Chrome
 */

// Mock para chrome.action (Manifest V3)
global.chrome = global.chrome || {};

global.chrome.action = {
  setIcon: jest.fn(() => Promise.resolve()),
  setTitle: jest.fn(() => Promise.resolve()),
  setBadgeText: jest.fn(() => Promise.resolve()),
  setBadgeBackgroundColor: jest.fn(() => Promise.resolve()),
  enable: jest.fn(() => Promise.resolve()),
  disable: jest.fn(() => Promise.resolve()),
  openPopup: jest.fn(() => Promise.resolve())
};

// Mock para chrome.commands
global.chrome.commands = {
  onCommand: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn(() => false)
  },
  getAll: jest.fn(() => Promise.resolve([]))
};

// Mock para chrome.permissions
global.chrome.permissions = {
  request: jest.fn(() => Promise.resolve(true)),
  remove: jest.fn(() => Promise.resolve(true)),
  contains: jest.fn(() => Promise.resolve(true)),
  getAll: jest.fn(() => Promise.resolve({
    permissions: ['storage', 'activeTab'],
    origins: []
  }))
};

// Mock para chrome.alarms
global.chrome.alarms = {
  create: jest.fn(),
  clear: jest.fn(() => Promise.resolve(true)),
  clearAll: jest.fn(() => Promise.resolve(true)),
  get: jest.fn(() => Promise.resolve(null)),
  getAll: jest.fn(() => Promise.resolve([])),
  onAlarm: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

// Mock para chrome.offscreen (Manifest V3)
global.chrome.offscreen = {
  createDocument: jest.fn(() => Promise.resolve()),
  closeDocument: jest.fn(() => Promise.resolve()),
  hasDocument: jest.fn(() => Promise.resolve(false))
};

// Mock para chrome.sidePanel (Chrome 114+)
global.chrome.sidePanel = {
  open: jest.fn(() => Promise.resolve()),
  setOptions: jest.fn(() => Promise.resolve()),
  getOptions: jest.fn(() => Promise.resolve({}))
};

// Mock para chrome.declarativeNetRequest
global.chrome.declarativeNetRequest = {
  updateDynamicRules: jest.fn(() => Promise.resolve()),
  getDynamicRules: jest.fn(() => Promise.resolve([])),
  updateSessionRules: jest.fn(() => Promise.resolve()),
  getSessionRules: jest.fn(() => Promise.resolve([]))
};

// Mock para chrome.webNavigation
global.chrome.webNavigation = {
  onBeforeNavigate: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onCompleted: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onDOMContentLoaded: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

// Mock para chrome.cookies
global.chrome.cookies = {
  get: jest.fn(() => Promise.resolve(null)),
  getAll: jest.fn(() => Promise.resolve([])),
  set: jest.fn(() => Promise.resolve({})),
  remove: jest.fn(() => Promise.resolve({}))
};

// Mock para chrome.downloads
global.chrome.downloads = {
  download: jest.fn(() => Promise.resolve(1)),
  search: jest.fn(() => Promise.resolve([])),
  cancel: jest.fn(() => Promise.resolve()),
  erase: jest.fn(() => Promise.resolve([])
};

// Mock para chrome.history
global.chrome.history = {
  search: jest.fn(() => Promise.resolve([])),
  addUrl: jest.fn(() => Promise.resolve()),
  deleteUrl: jest.fn(() => Promise.resolve()),
  deleteRange: jest.fn(() => Promise.resolve())
};

// Mock para chrome.bookmarks
global.chrome.bookmarks = {
  get: jest.fn(() => Promise.resolve([])),
  getChildren: jest.fn(() => Promise.resolve([])),
  create: jest.fn(() => Promise.resolve({})),
  remove: jest.fn(() => Promise.resolve()),
  search: jest.fn(() => Promise.resolve([]))
};

// Mock para chrome.identity
global.chrome.identity = {
  getAuthToken: jest.fn(() => Promise.resolve('mock-token')),
  removeCachedAuthToken: jest.fn(() => Promise.resolve()),
  launchWebAuthFlow: jest.fn(() => Promise.resolve('mock-redirect-url'))
};

// Mock para chrome.i18n
global.chrome.i18n = {
  getMessage: jest.fn((key) => `mock-message-${key}`),
  getUILanguage: jest.fn(() => 'en'),
  detectLanguage: jest.fn(() => Promise.resolve({ languages: [{ language: 'en', percentage: 100 }] }))
};

// Mock para chrome.management
global.chrome.management = {
  getSelf: jest.fn(() => Promise.resolve({
    id: 'test-extension-id',
    name: 'VeritasAI Test',
    version: '1.0.0',
    enabled: true
  })),
  getAll: jest.fn(() => Promise.resolve([]))
};

// Mock para chrome.system
global.chrome.system = {
  cpu: {
    getInfo: jest.fn(() => Promise.resolve({
      numOfProcessors: 4,
      archName: 'x86_64',
      modelName: 'Test CPU'
    }))
  },
  memory: {
    getInfo: jest.fn(() => Promise.resolve({
      capacity: 8589934592,
      availableCapacity: 4294967296
    }))
  }
};

// Mock para chrome.enterprise (se necessário)
global.chrome.enterprise = {
  platformKeys: {
    getTokens: jest.fn(() => Promise.resolve([])),
    getCertificates: jest.fn(() => Promise.resolve([]))
  }
};

// Mock para eventos globais
global.chrome.runtime.onInstalled = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(() => false)
};

global.chrome.runtime.onStartup = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(() => false)
};

global.chrome.runtime.onSuspend = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(() => false)
};

global.chrome.runtime.onUpdateAvailable = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(() => false)
};

// Mock para chrome.storage events
global.chrome.storage.onChanged = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(() => false)
};

// Mock para chrome.tabs events
global.chrome.tabs.onActivated = {
  addListener: jest.fn(),
  removeListener: jest.fn()
};

global.chrome.tabs.onUpdated = {
  addListener: jest.fn(),
  removeListener: jest.fn()
};

global.chrome.tabs.onCreated = {
  addListener: jest.fn(),
  removeListener: jest.fn()
};

global.chrome.tabs.onRemoved = {
  addListener: jest.fn(),
  removeListener: jest.fn()
};

// Utility para resetar todos os mocks
global.resetChromeMocks = () => {
  Object.values(global.chrome).forEach(api => {
    if (typeof api === 'object' && api !== null) {
      Object.values(api).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    }
  });
};
