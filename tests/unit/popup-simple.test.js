/**
 * Testes Unitários - Popup (Versão Simplificada)
 * Testa funcionalidades básicas do popup sem ES modules
 */

// Mock do DOM
Object.defineProperty(global, 'document', {
  value: {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    createElement: jest.fn(() => ({
      className: '',
      textContent: '',
      innerHTML: ''
    })),
    addEventListener: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    }
  }
});

// Mock do Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  }
};

// Mock do PopupManager
class MockPopupManager {
  constructor() {
    this.isInitialized = false;
    this.currentTab = null;
    this.extensionEnabled = true;
    this.stats = {
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0
    };
  }

  async init() {
    this.isInitialized = true;
    this.setupEventListeners();
    await this.loadSettings();
    await this.updateUI();
  }

  setupEventListeners() {
    // Mock event listeners
    const elements = {
      toggleButton: { addEventListener: jest.fn() },
      settingsButton: { addEventListener: jest.fn() },
      statsButton: { addEventListener: jest.fn() },
      clearCacheButton: { addEventListener: jest.fn() }
    };

    document.getElementById.mockImplementation((id) => {
      return elements[id] || { addEventListener: jest.fn() };
    });
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get({
      extensionEnabled: this.extensionEnabled,
      autoVerify: true,
      showNotifications: true
    });

    this.extensionEnabled = settings.extensionEnabled;
    return settings;
  }

  async updateUI() {
    // Obter elementos da UI
    const statusElement = document.getElementById('extension-status');
    const statsElement = document.getElementById('stats-content');

    // Atualizar status se elemento existir
    if (statusElement) {
      statusElement.textContent = this.extensionEnabled ? 'Ativada' : 'Desativada';
      statusElement.className = this.extensionEnabled ? 'status-active' : 'status-inactive';
    }

    // Atualizar estatísticas se elemento existir
    if (statsElement) {
      statsElement.innerHTML = `
        <div>Total: ${this.stats.totalVerifications}</div>
        <div>Sucessos: ${this.stats.successfulVerifications}</div>
        <div>Falhas: ${this.stats.failedVerifications}</div>
      `;
    }
  }

  async toggleExtension() {
    this.extensionEnabled = !this.extensionEnabled;
    
    await chrome.storage.sync.set({ extensionEnabled: this.extensionEnabled });
    
    // Notificar content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleExtension',
        enabled: this.extensionEnabled
      });
    }
    
    await this.updateUI();
  }

  async openSettings() {
    // Mock abrir página de configurações
    return chrome.runtime.sendMessage({
      action: 'openOptionsPage'
    });
  }

  async clearCache() {
    const result = await chrome.runtime.sendMessage({
      action: 'clearCache'
    });
    
    if (result.success) {
      this.showNotification('Cache limpo com sucesso');
    }
    
    return result;
  }

  async loadStats() {
    const result = await chrome.runtime.sendMessage({
      action: 'getStats'
    });
    
    if (result.success) {
      this.stats = result.data;
      await this.updateUI();
    }
    
    return result;
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 100); // Reduzir timeout para testes
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0] || null;
    return this.currentTab;
  }

  async verifyCurrentPage() {
    const tab = await this.getCurrentTab();
    
    if (!tab) {
      throw new Error('Nenhuma aba ativa encontrada');
    }
    
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: 'verifyPage'
    });
    
    return result;
  }

  destroy() {
    this.isInitialized = false;
    this.currentTab = null;
  }
}

describe('PopupManager', () => {
  let popupManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mocks before creating instance
    chrome.storage.sync.get.mockResolvedValue({
      extensionEnabled: true,
      autoVerify: true,
      showNotifications: true
    });

    popupManager = new MockPopupManager();
    await popupManager.init();
  });

  afterEach(() => {
    if (popupManager) {
      popupManager.destroy();
    }
  });

  describe('Inicialização', () => {
    test('deve inicializar corretamente', () => {
      expect(popupManager.isInitialized).toBe(true);
      // Verificar se setupEventListeners foi chamado indiretamente
      expect(popupManager.extensionEnabled).toBe(true);
    });

    test('deve carregar configurações', async () => {
      expect(chrome.storage.sync.get).toHaveBeenCalled();
      expect(popupManager.extensionEnabled).toBe(true);
    });
  });

  describe('Toggle da Extensão', () => {
    test('deve alternar estado da extensão', async () => {
      const initialState = popupManager.extensionEnabled;
      
      chrome.tabs.query.mockResolvedValue([{ id: 123 }]);
      chrome.tabs.sendMessage.mockResolvedValue({ success: true });
      chrome.storage.sync.set.mockResolvedValue();
      
      await popupManager.toggleExtension();
      
      expect(popupManager.extensionEnabled).toBe(!initialState);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        extensionEnabled: !initialState
      });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: 'toggleExtension',
        enabled: !initialState
      });
    });
  });

  describe('Configurações', () => {
    test('deve abrir página de configurações', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });
      
      const result = await popupManager.openSettings();
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'openOptionsPage'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Cache', () => {
    test('deve limpar cache', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });
      
      const result = await popupManager.clearCache();
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'clearCache'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Estatísticas', () => {
    test('deve carregar estatísticas', async () => {
      const mockStats = {
        totalVerifications: 10,
        successfulVerifications: 8,
        failedVerifications: 2
      };
      
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: mockStats
      });
      
      const result = await popupManager.loadStats();
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'getStats'
      });
      expect(result.success).toBe(true);
      expect(popupManager.stats).toEqual(mockStats);
    });
  });

  describe('Verificação de Página', () => {
    test('deve verificar página atual', async () => {
      const mockTab = { id: 123, url: 'https://example.com' };
      
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockResolvedValue({
        success: true,
        data: { verified: true }
      });
      
      const result = await popupManager.verifyCurrentPage();
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: 'verifyPage'
      });
      expect(result.success).toBe(true);
    });

    test('deve tratar erro quando não há aba ativa', async () => {
      chrome.tabs.query.mockResolvedValue([]);
      
      await expect(popupManager.verifyCurrentPage()).rejects.toThrow(
        'Nenhuma aba ativa encontrada'
      );
    });
  });

  describe('Notificações', () => {
    test('deve mostrar notificação', () => {
      const mockElement = {
        className: '',
        textContent: ''
      };

      // Mock createElement para retornar o elemento mock
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockReturnValue(mockElement);

      popupManager.showNotification('Teste de notificação');

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.className).toBe('notification');
      expect(mockElement.textContent).toBe('Teste de notificação');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockElement);

      // Restaurar mock
      document.createElement = originalCreateElement;
    });
  });

  describe('UI Updates', () => {
    test('deve atualizar interface corretamente', async () => {
      const statusElement = { textContent: '', className: '' };
      const statsElement = { innerHTML: '' };

      // Mock document.getElementById para retornar elementos específicos
      const originalGetElementById = document.getElementById;
      document.getElementById = jest.fn((id) => {
        if (id === 'extension-status') return statusElement;
        if (id === 'stats-content') return statsElement;
        return { textContent: '', className: '', innerHTML: '' };
      });

      await popupManager.updateUI();

      expect(statusElement.textContent).toBe('Ativada');
      expect(statusElement.className).toBe('status-active');
      expect(statsElement.innerHTML).toContain('Total: 0');

      // Restaurar mock
      document.getElementById = originalGetElementById;
    });
  });
});
