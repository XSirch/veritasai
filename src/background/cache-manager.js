/**
 * VeritasAI - Cache Manager
 * Sistema de cache inteligente com TTL e limpeza automática
 */

export class CacheManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      totalSize: 0,
      maxSize: 1000
    };
    this.config = {
      defaultTTL: 24 * 60 * 60 * 1000, // 24 horas
      maxSize: 1000,
      cleanupInterval: 60 * 60 * 1000, // 1 hora
      compressionThreshold: 1000 // caracteres
    };
    this.cleanupTimer = null;
    this.isInitialized = false;
  }
  
  /**
   * Inicializa o cache manager
   */
  async init() {
    try {
      console.log('💾 Inicializando Cache Manager...');
      
      // Carregar cache do storage
      await this.loadFromStorage();
      
      // Configurar limpeza automática
      this.setupCleanupTimer();
      
      this.isInitialized = true;
      console.log(`✅ Cache Manager inicializado com ${this.cache.size} itens`);
      
    } catch (error) {
      console.error('❌ Erro na inicialização do Cache Manager:', error);
      this.isInitialized = false;
      throw error;
    }
  }
  
  /**
   * Obtém item do cache
   */
  async get(key) {
    if (!this.isInitialized) {
      return null;
    }
    
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        return null;
      }
      
      // Verificar TTL
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.deletes++;
        return null;
      }
      
      // Atualizar último acesso
      item.lastAccessed = Date.now();
      item.accessCount++;
      
      this.stats.hits++;
      
      // Descomprimir se necessário
      const data = this.decompress(item.data);
      
      console.log(`📋 Cache hit para chave: ${key.substring(0, 20)}...`);
      return data;
      
    } catch (error) {
      console.error('❌ Erro ao obter item do cache:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  /**
   * Armazena item no cache
   */
  async set(key, data, ttl = null) {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      // Verificar limite de tamanho
      if (this.cache.size >= this.config.maxSize) {
        await this.evictLRU();
      }
      
      // Comprimir dados se necessário
      const compressedData = this.compress(data);
      
      const item = {
        data: compressedData,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        ttl: ttl || this.config.defaultTTL,
        size: this.calculateSize(compressedData)
      };
      
      this.cache.set(key, item);
      this.stats.sets++;
      this.updateTotalSize();
      
      console.log(`💾 Item armazenado no cache: ${key.substring(0, 20)}...`);
      
      // Salvar no storage periodicamente
      if (this.stats.sets % 10 === 0) {
        await this.saveToStorage();
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao armazenar item no cache:', error);
      return false;
    }
  }
  
  /**
   * Remove item do cache
   */
  async delete(key) {
    if (!this.isInitialized) {
      return false;
    }
    
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.stats.deletes++;
      this.updateTotalSize();
      console.log(`🗑️ Item removido do cache: ${key.substring(0, 20)}...`);
    }
    
    return deleted;
  }
  
  /**
   * Limpa todo o cache
   */
  async clear() {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.cleanups++;
    
    // Limpar storage
    await this.clearStorage();
    
    console.log('🧹 Cache completamente limpo');
    return true;
  }
  
  /**
   * Executa limpeza de itens expirados
   */
  async cleanup() {
    if (!this.isInitialized) {
      return;
    }
    
    const startTime = Date.now();
    let removedCount = 0;
    
    try {
      console.log('🧹 Iniciando limpeza do cache...');
      
      for (const [key, item] of this.cache.entries()) {
        if (this.isExpired(item)) {
          this.cache.delete(key);
          removedCount++;
        }
      }
      
      this.updateTotalSize();
      this.stats.cleanups++;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Limpeza concluída: ${removedCount} itens removidos em ${duration}ms`);
      
      // Salvar estado atualizado
      await this.saveToStorage();
      
    } catch (error) {
      console.error('❌ Erro na limpeza do cache:', error);
    }
  }
  
  /**
   * Remove item menos recentemente usado (LRU)
   */
  async evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      await this.delete(oldestKey);
      console.log(`🔄 Item LRU removido: ${oldestKey.substring(0, 20)}...`);
    }
  }
  
  /**
   * Verifica se item está expirado
   */
  isExpired(item) {
    return (Date.now() - item.createdAt) > item.ttl;
  }
  
  /**
   * Comprime dados se necessário
   */
  compress(data) {
    const serialized = JSON.stringify(data);
    
    // Comprimir apenas se for maior que threshold
    if (serialized.length > this.config.compressionThreshold) {
      // Implementação simples de compressão (pode ser melhorada)
      return {
        compressed: true,
        data: this.simpleCompress(serialized)
      };
    }
    
    return {
      compressed: false,
      data: serialized
    };
  }
  
  /**
   * Descomprime dados
   */
  decompress(compressedData) {
    if (compressedData.compressed) {
      const decompressed = this.simpleDecompress(compressedData.data);
      return JSON.parse(decompressed);
    }
    
    return JSON.parse(compressedData.data);
  }
  
  /**
   * Compressão simples (placeholder para algoritmo real)
   */
  simpleCompress(str) {
    // Implementação básica - pode ser substituída por LZ4, gzip, etc.
    return btoa(str);
  }
  
  /**
   * Descompressão simples
   */
  simpleDecompress(compressed) {
    return atob(compressed);
  }
  
  /**
   * Calcula tamanho do item
   */
  calculateSize(data) {
    return JSON.stringify(data).length;
  }
  
  /**
   * Atualiza tamanho total do cache
   */
  updateTotalSize() {
    let totalSize = 0;
    
    for (const item of this.cache.values()) {
      totalSize += item.size;
    }
    
    this.stats.totalSize = totalSize;
  }
  
  /**
   * Configura timer de limpeza automática
   */
  setupCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Carrega cache do storage
   */
  async loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['veritasai_cache'], (result) => {
        try {
          const cached = result.veritasai_cache;
          
          if (cached && cached.data) {
            // Restaurar cache do storage
            for (const [key, item] of Object.entries(cached.data)) {
              // Verificar se não está expirado
              if (!this.isExpired(item)) {
                this.cache.set(key, item);
              }
            }
            
            console.log(`📥 Cache carregado: ${this.cache.size} itens`);
          }
          
          resolve();
        } catch (error) {
          console.error('Erro ao carregar cache:', error);
          resolve();
        }
      });
    });
  }
  
  /**
   * Salva cache no storage
   */
  async saveToStorage() {
    return new Promise((resolve) => {
      try {
        const cacheData = {};
        
        // Converter Map para Object
        for (const [key, item] of this.cache.entries()) {
          cacheData[key] = item;
        }
        
        const dataToSave = {
          data: cacheData,
          timestamp: Date.now(),
          version: '1.0.18'
        };
        
        chrome.storage.local.set({
          veritasai_cache: dataToSave
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Erro ao salvar cache:', chrome.runtime.lastError);
          }
          resolve();
        });
        
      } catch (error) {
        console.error('Erro ao salvar cache:', error);
        resolve();
      }
    });
  }
  
  /**
   * Limpa cache do storage
   */
  async clearStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['veritasai_cache'], () => {
        resolve();
      });
    });
  }
  
  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      currentSize: this.cache.size,
      memoryUsage: `${(this.stats.totalSize / 1024).toFixed(2)} KB`,
      isInitialized: this.isInitialized
    };
  }
  
  /**
   * Atualiza configuração do cache
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Reconfigurar timer se necessário
    if (newConfig.cleanupInterval) {
      this.setupCleanupTimer();
    }
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    this.isInitialized = false;
  }
}
