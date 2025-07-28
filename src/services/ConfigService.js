/**
 * VeritasAI - Configuration Service
 * Gerencia configurações da extensão com persistência e validação
 */

export class ConfigService {
  constructor() {
    this.storageKey = 'veritasai_config';
    this.defaultConfig = this.getDefaultConfiguration();
    this.currentConfig = null;
    this.listeners = new Set();
    
    this.init();
  }
  
  /**
   * Inicialização do serviço
   */
  async init() {
    try {
      await this.loadConfiguration();
      console.log('✅ ConfigService inicializado');
    } catch (error) {
      console.error('❌ Erro na inicialização do ConfigService:', error);
      this.currentConfig = { ...this.defaultConfig };
    }
  }
  
  /**
   * Obtém configuração padrão
   */
  getDefaultConfiguration() {
    return {
      // API Keys
      googleApiKey: '',
      groqApiKey: '',
      
      // Preferências de Interface
      language: 'pt-BR',
      theme: 'auto',
      notificationsEnabled: true,
      soundEnabled: true,
      
      // Preferências de Funcionamento
      autoVerify: false,
      cacheEnabled: true,
      showTooltips: true,
      
      // Configurações Avançadas
      apiTimeout: 30,
      maxTextLength: 5000,
      debugMode: false,
      verboseLogging: false,
      
      // Configurações de Performance
      maxCacheSize: 1000,
      cacheExpiration: 24 * 60 * 60 * 1000, // 24 horas
      retryAttempts: 3,
      retryDelay: 1000,
      
      // Metadados
      version: '1.0.17',
      firstInstall: Date.now(),
      lastUpdated: Date.now(),
      migrationVersion: 1
    };
  }
  
  /**
   * Carrega configuração do storage
   */
  async loadConfiguration() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([this.storageKey], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        try {
          const stored = result[this.storageKey];
          
          if (stored) {
            // Migrar configuração se necessário
            this.currentConfig = this.migrateConfiguration(stored);
          } else {
            // Primeira instalação
            this.currentConfig = { ...this.defaultConfig };
            this.saveConfiguration(); // Salvar configuração inicial
          }
          
          resolve(this.currentConfig);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Salva configuração no storage
   */
  async saveConfiguration(config = null) {
    const configToSave = config || this.currentConfig;
    
    // Validar configuração
    const validatedConfig = this.validateConfiguration(configToSave);
    
    // Atualizar timestamp
    validatedConfig.lastUpdated = Date.now();
    
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({
        [this.storageKey]: validatedConfig
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        this.currentConfig = validatedConfig;
        this.notifyListeners('configurationSaved', validatedConfig);
        resolve(validatedConfig);
      });
    });
  }
  
  /**
   * Obtém configuração atual
   */
  getConfiguration() {
    return { ...this.currentConfig };
  }
  
  /**
   * Atualiza configuração
   */
  async updateConfiguration(updates) {
    const newConfig = {
      ...this.currentConfig,
      ...updates,
      lastUpdated: Date.now()
    };
    
    return await this.saveConfiguration(newConfig);
  }
  
  /**
   * Obtém valor específico da configuração
   */
  get(key, defaultValue = null) {
    return this.currentConfig?.[key] ?? defaultValue;
  }
  
  /**
   * Define valor específico da configuração
   */
  async set(key, value) {
    return await this.updateConfiguration({ [key]: value });
  }
  
  /**
   * Valida configuração
   */
  validateConfiguration(config) {
    const validated = { ...this.defaultConfig };
    
    // Validar cada campo
    Object.keys(config).forEach(key => {
      const value = config[key];
      
      switch (key) {
        case 'googleApiKey':
        case 'groqApiKey':
          validated[key] = typeof value === 'string' ? value.trim() : '';
          break;
          
        case 'language':
          validated[key] = ['pt-BR', 'en-US', 'es-ES'].includes(value) ? value : 'pt-BR';
          break;
          
        case 'theme':
          validated[key] = ['auto', 'light', 'dark'].includes(value) ? value : 'auto';
          break;
          
        case 'apiTimeout':
          validated[key] = Math.max(5, Math.min(120, parseInt(value) || 30));
          break;
          
        case 'maxTextLength':
          validated[key] = Math.max(100, Math.min(50000, parseInt(value) || 5000));
          break;
          
        case 'maxCacheSize':
          validated[key] = Math.max(100, Math.min(10000, parseInt(value) || 1000));
          break;
          
        case 'cacheExpiration':
          validated[key] = Math.max(60000, parseInt(value) || 24 * 60 * 60 * 1000);
          break;
          
        case 'retryAttempts':
          validated[key] = Math.max(1, Math.min(10, parseInt(value) || 3));
          break;
          
        case 'retryDelay':
          validated[key] = Math.max(100, Math.min(10000, parseInt(value) || 1000));
          break;
          
        case 'notificationsEnabled':
        case 'soundEnabled':
        case 'autoVerify':
        case 'cacheEnabled':
        case 'showTooltips':
        case 'debugMode':
        case 'verboseLogging':
          validated[key] = Boolean(value);
          break;
          
        case 'version':
        case 'firstInstall':
        case 'lastUpdated':
        case 'migrationVersion':
          validated[key] = value;
          break;
          
        default:
          // Permitir campos customizados
          validated[key] = value;
      }
    });
    
    return validated;
  }
  
  /**
   * Migra configuração de versões antigas
   */
  migrateConfiguration(config) {
    const migrated = { ...config };
    const currentMigration = migrated.migrationVersion || 0;
    
    // Migração v1: Adicionar novos campos
    if (currentMigration < 1) {
      migrated.maxCacheSize = migrated.maxCacheSize || 1000;
      migrated.cacheExpiration = migrated.cacheExpiration || 24 * 60 * 60 * 1000;
      migrated.retryAttempts = migrated.retryAttempts || 3;
      migrated.retryDelay = migrated.retryDelay || 1000;
      migrated.migrationVersion = 1;
    }
    
    // Futuras migrações aqui...
    
    // Garantir que todos os campos padrão existam
    return { ...this.defaultConfig, ...migrated };
  }
  
  /**
   * Reseta configuração para padrões
   */
  async resetConfiguration() {
    const resetConfig = {
      ...this.defaultConfig,
      firstInstall: this.currentConfig.firstInstall, // Manter data de instalação
      lastUpdated: Date.now()
    };
    
    return await this.saveConfiguration(resetConfig);
  }
  
  /**
   * Exporta configuração
   */
  exportConfiguration() {
    const exportData = {
      ...this.currentConfig,
      exportedAt: Date.now(),
      exportVersion: '1.0.17'
    };
    
    // Remover dados sensíveis
    delete exportData.googleApiKey;
    delete exportData.groqApiKey;
    
    return exportData;
  }
  
  /**
   * Importa configuração
   */
  async importConfiguration(importData) {
    if (!importData || typeof importData !== 'object') {
      throw new Error('Dados de importação inválidos');
    }
    
    // Validar versão de exportação
    if (importData.exportVersion && importData.exportVersion !== '1.0.17') {
      console.warn('Versão de exportação diferente:', importData.exportVersion);
    }
    
    // Mesclar com configuração atual (preservar API keys)
    const mergedConfig = {
      ...importData,
      googleApiKey: this.currentConfig.googleApiKey,
      groqApiKey: this.currentConfig.groqApiKey,
      firstInstall: this.currentConfig.firstInstall,
      lastUpdated: Date.now()
    };
    
    return await this.saveConfiguration(mergedConfig);
  }
  
  /**
   * Valida API key
   */
  validateApiKey(apiType, key) {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    switch (apiType) {
      case 'google':
        // Google API keys geralmente têm 39 caracteres alfanuméricos
        return /^[A-Za-z0-9_-]{35,45}$/.test(key);
        
      case 'groq':
        // Groq API keys começam com 'gsk_'
        return /^gsk_[A-Za-z0-9]{48,52}$/.test(key);
        
      default:
        return false;
    }
  }
  
  /**
   * Verifica se APIs estão configuradas
   */
  areApisConfigured() {
    return {
      google: this.validateApiKey('google', this.currentConfig.googleApiKey),
      groq: this.validateApiKey('groq', this.currentConfig.groqApiKey),
      any: this.validateApiKey('google', this.currentConfig.googleApiKey) || 
           this.validateApiKey('groq', this.currentConfig.groqApiKey),
      all: this.validateApiKey('google', this.currentConfig.googleApiKey) && 
           this.validateApiKey('groq', this.currentConfig.groqApiKey)
    };
  }
  
  /**
   * Adiciona listener para mudanças de configuração
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    // Retornar função para remover listener
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  /**
   * Notifica listeners sobre mudanças
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Erro no listener de configuração:', error);
      }
    });
  }
  
  /**
   * Obtém estatísticas de uso
   */
  getUsageStats() {
    const now = Date.now();
    const installAge = now - (this.currentConfig.firstInstall || now);
    const lastUpdate = now - (this.currentConfig.lastUpdated || now);
    
    return {
      installAge: Math.floor(installAge / (24 * 60 * 60 * 1000)), // dias
      lastUpdate: Math.floor(lastUpdate / (60 * 60 * 1000)), // horas
      version: this.currentConfig.version,
      apisConfigured: this.areApisConfigured(),
      debugMode: this.currentConfig.debugMode,
      cacheEnabled: this.currentConfig.cacheEnabled
    };
  }
  
  /**
   * Limpa dados de configuração (para desenvolvimento)
   */
  async clearConfiguration() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove([this.storageKey], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        this.currentConfig = { ...this.defaultConfig };
        this.notifyListeners('configurationCleared', this.currentConfig);
        resolve();
      });
    });
  }
}
