/**
 * Testes Unitários - Popup de Configurações
 * Testa PopupManager e ConfigService
 */

import { ConfigService } from '../../src/services/ConfigService.js';

// Mock do Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

// Mock do DOM
Object.defineProperty(window, 'document', {
  value: {
    getElementById: jest.fn(),
    querySelectorAll: jest.fn(),
    addEventListener: jest.fn(),
    createElement: jest.fn(),
    body: {
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      appendChild: jest.fn()
    }
  }
});

describe('ConfigService', () => {
  let configService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService();
  });
  
  describe('Inicialização', () => {
    test('deve criar configuração padrão', () => {
      const defaultConfig = configService.getDefaultConfiguration();
      
      expect(defaultConfig).toHaveProperty('googleApiKey', '');
      expect(defaultConfig).toHaveProperty('groqApiKey', '');
      expect(defaultConfig).toHaveProperty('language', 'pt-BR');
      expect(defaultConfig).toHaveProperty('theme', 'auto');
      expect(defaultConfig).toHaveProperty('notificationsEnabled', true);
      expect(defaultConfig).toHaveProperty('apiTimeout', 30);
      expect(defaultConfig).toHaveProperty('version', '1.0.17');
    });
    
    test('deve carregar configuração do storage', async () => {
      const mockConfig = {
        googleApiKey: 'test-key',
        language: 'en-US'
      };
      
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({ veritasai_config: mockConfig });
      });
      
      await configService.loadConfiguration();
      
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['veritasai_config'], expect.any(Function));
      expect(configService.get('googleApiKey')).toBe('test-key');
      expect(configService.get('language')).toBe('en-US');
    });
    
    test('deve usar configuração padrão se storage estiver vazio', async () => {
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({});
      });
      
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      await configService.loadConfiguration();
      
      expect(configService.get('language')).toBe('pt-BR');
      expect(configService.get('theme')).toBe('auto');
    });
  });
  
  describe('Validação de API Keys', () => {
    test('deve validar Google API key corretamente', () => {
      const validKey = 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI';
      const invalidKey = 'invalid-key';
      
      expect(configService.validateApiKey('google', validKey)).toBe(true);
      expect(configService.validateApiKey('google', invalidKey)).toBe(false);
      expect(configService.validateApiKey('google', '')).toBe(false);
      expect(configService.validateApiKey('google', null)).toBe(false);
    });
    
    test('deve validar Groq API key corretamente', () => {
      const validKey = 'gsk_1234567890abcdef1234567890abcdef1234567890abcdef12';
      const invalidKey = 'invalid-groq-key';
      
      expect(configService.validateApiKey('groq', validKey)).toBe(true);
      expect(configService.validateApiKey('groq', invalidKey)).toBe(false);
      expect(configService.validateApiKey('groq', 'gsk_short')).toBe(false);
    });
    
    test('deve verificar status das APIs', () => {
      configService.currentConfig = {
        googleApiKey: 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI',
        groqApiKey: ''
      };
      
      const status = configService.areApisConfigured();
      
      expect(status.google).toBe(true);
      expect(status.groq).toBe(false);
      expect(status.any).toBe(true);
      expect(status.all).toBe(false);
    });
  });
  
  describe('Validação de Configuração', () => {
    test('deve validar configuração corretamente', () => {
      const input = {
        language: 'invalid-lang',
        theme: 'invalid-theme',
        apiTimeout: -5,
        maxTextLength: 999999,
        notificationsEnabled: 'true',
        debugMode: 1
      };
      
      const validated = configService.validateConfiguration(input);
      
      expect(validated.language).toBe('pt-BR'); // fallback para padrão
      expect(validated.theme).toBe('auto'); // fallback para padrão
      expect(validated.apiTimeout).toBe(5); // mínimo
      expect(validated.maxTextLength).toBe(50000); // máximo
      expect(validated.notificationsEnabled).toBe(true); // convertido para boolean
      expect(validated.debugMode).toBe(true); // convertido para boolean
    });
    
    test('deve manter valores válidos', () => {
      const input = {
        language: 'en-US',
        theme: 'dark',
        apiTimeout: 45,
        maxTextLength: 2000,
        notificationsEnabled: false
      };
      
      const validated = configService.validateConfiguration(input);
      
      expect(validated.language).toBe('en-US');
      expect(validated.theme).toBe('dark');
      expect(validated.apiTimeout).toBe(45);
      expect(validated.maxTextLength).toBe(2000);
      expect(validated.notificationsEnabled).toBe(false);
    });
  });
  
  describe('Operações CRUD', () => {
    test('deve salvar configuração', async () => {
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      const config = { language: 'en-US', theme: 'dark' };
      const result = await configService.saveConfiguration(config);
      
      expect(chrome.storage.sync.set).toHaveBeenCalled();
      expect(result).toHaveProperty('language', 'en-US');
      expect(result).toHaveProperty('theme', 'dark');
      expect(result).toHaveProperty('lastUpdated');
    });
    
    test('deve atualizar configuração', async () => {
      configService.currentConfig = { language: 'pt-BR', theme: 'auto' };
      
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      const result = await configService.updateConfiguration({ theme: 'dark' });
      
      expect(result.language).toBe('pt-BR'); // mantido
      expect(result.theme).toBe('dark'); // atualizado
    });
    
    test('deve obter e definir valores específicos', async () => {
      configService.currentConfig = { language: 'pt-BR', theme: 'auto' };
      
      expect(configService.get('language')).toBe('pt-BR');
      expect(configService.get('nonexistent', 'default')).toBe('default');
      
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      await configService.set('theme', 'dark');
      expect(configService.get('theme')).toBe('dark');
    });
  });
  
  describe('Migração de Configuração', () => {
    test('deve migrar configuração antiga', () => {
      const oldConfig = {
        googleApiKey: 'test-key',
        language: 'pt-BR',
        migrationVersion: 0
      };
      
      const migrated = configService.migrateConfiguration(oldConfig);
      
      expect(migrated.migrationVersion).toBe(1);
      expect(migrated).toHaveProperty('maxCacheSize');
      expect(migrated).toHaveProperty('cacheExpiration');
      expect(migrated).toHaveProperty('retryAttempts');
      expect(migrated.googleApiKey).toBe('test-key'); // preservado
    });
    
    test('deve manter configuração já migrada', () => {
      const currentConfig = {
        googleApiKey: 'test-key',
        migrationVersion: 1,
        maxCacheSize: 500
      };
      
      const migrated = configService.migrateConfiguration(currentConfig);
      
      expect(migrated.migrationVersion).toBe(1);
      expect(migrated.maxCacheSize).toBe(500); // preservado
    });
  });
  
  describe('Import/Export', () => {
    test('deve exportar configuração sem dados sensíveis', () => {
      configService.currentConfig = {
        googleApiKey: 'secret-key',
        groqApiKey: 'secret-groq',
        language: 'pt-BR',
        theme: 'dark'
      };
      
      const exported = configService.exportConfiguration();
      
      expect(exported).not.toHaveProperty('googleApiKey');
      expect(exported).not.toHaveProperty('groqApiKey');
      expect(exported).toHaveProperty('language', 'pt-BR');
      expect(exported).toHaveProperty('theme', 'dark');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('exportVersion', '1.0.17');
    });
    
    test('deve importar configuração preservando API keys', async () => {
      configService.currentConfig = {
        googleApiKey: 'existing-google-key',
        groqApiKey: 'existing-groq-key',
        language: 'pt-BR',
        firstInstall: 123456789
      };
      
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      const importData = {
        language: 'en-US',
        theme: 'dark',
        exportVersion: '1.0.17'
      };
      
      const result = await configService.importConfiguration(importData);
      
      expect(result.googleApiKey).toBe('existing-google-key'); // preservado
      expect(result.groqApiKey).toBe('existing-groq-key'); // preservado
      expect(result.language).toBe('en-US'); // importado
      expect(result.theme).toBe('dark'); // importado
      expect(result.firstInstall).toBe(123456789); // preservado
    });
    
    test('deve rejeitar dados de importação inválidos', async () => {
      await expect(configService.importConfiguration(null)).rejects.toThrow('Dados de importação inválidos');
      await expect(configService.importConfiguration('invalid')).rejects.toThrow('Dados de importação inválidos');
    });
  });
  
  describe('Listeners e Eventos', () => {
    test('deve adicionar e remover listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const remove1 = configService.addListener(listener1);
      const remove2 = configService.addListener(listener2);
      
      expect(configService.listeners.size).toBe(2);
      
      remove1();
      expect(configService.listeners.size).toBe(1);
      
      remove2();
      expect(configService.listeners.size).toBe(0);
    });
    
    test('deve notificar listeners sobre mudanças', () => {
      const listener = jest.fn();
      configService.addListener(listener);
      
      configService.notifyListeners('test-event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
    
    test('deve tratar erros em listeners', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      configService.addListener(errorListener);
      configService.addListener(normalListener);
      
      // Não deve lançar erro
      expect(() => {
        configService.notifyListeners('test-event', {});
      }).not.toThrow();
      
      expect(normalListener).toHaveBeenCalled();
    });
  });
  
  describe('Estatísticas e Utilitários', () => {
    test('deve calcular estatísticas de uso', () => {
      const now = Date.now();
      configService.currentConfig = {
        firstInstall: now - (5 * 24 * 60 * 60 * 1000), // 5 dias atrás
        lastUpdated: now - (2 * 60 * 60 * 1000), // 2 horas atrás
        version: '1.0.17',
        debugMode: true,
        cacheEnabled: false,
        googleApiKey: 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI'
      };
      
      const stats = configService.getUsageStats();
      
      expect(stats.installAge).toBe(5); // dias
      expect(stats.lastUpdate).toBe(2); // horas
      expect(stats.version).toBe('1.0.17');
      expect(stats.debugMode).toBe(true);
      expect(stats.cacheEnabled).toBe(false);
      expect(stats.apisConfigured.google).toBe(true);
    });
    
    test('deve resetar configuração', async () => {
      configService.currentConfig = {
        googleApiKey: 'test-key',
        language: 'en-US',
        firstInstall: 123456789
      };
      
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      const result = await configService.resetConfiguration();
      
      expect(result.googleApiKey).toBe(''); // resetado
      expect(result.language).toBe('pt-BR'); // resetado para padrão
      expect(result.firstInstall).toBe(123456789); // preservado
    });
    
    test('deve limpar configuração', async () => {
      chrome.storage.sync.remove.mockImplementation((keys, callback) => {
        callback();
      });
      
      await configService.clearConfiguration();
      
      expect(chrome.storage.sync.remove).toHaveBeenCalledWith(['veritasai_config'], expect.any(Function));
      expect(configService.currentConfig).toEqual(configService.getDefaultConfiguration());
    });
  });
  
  describe('Tratamento de Erros', () => {
    test('deve tratar erro no carregamento', async () => {
      chrome.runtime.lastError = { message: 'Storage error' };
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({});
      });
      
      await expect(configService.loadConfiguration()).rejects.toEqual({ message: 'Storage error' });
      
      chrome.runtime.lastError = null; // limpar
    });
    
    test('deve tratar erro no salvamento', async () => {
      chrome.runtime.lastError = { message: 'Save error' };
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      await expect(configService.saveConfiguration({})).rejects.toEqual({ message: 'Save error' });
      
      chrome.runtime.lastError = null; // limpar
    });
  });
});
