/**
 * CacheManager - Sistema avançado de cache para VeritasAI
 * Implementa múltiplas estratégias de cache com TTL e persistência
 */

/**
 * Classe principal para gerenciamento de cache
 */
class CacheManager {
  constructor(options = {}) {
    this.strategy = options.strategy || 'memory';
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.defaultTtl || 3600000; // 1 hora
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutos
    
    // Armazenamento
    this.memoryCache = new Map();
    this.accessTimes = new Map();
    this.hitCounts = new Map();
    
    // Estatísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
      totalRequests: 0,
      startTime: Date.now()
    };
    
    // Iniciar limpeza automática
    this._startCleanupTimer();
  }
  
  /**
   * Obtém valor do cache
   * @param {string} key - Chave do cache
   * @returns {*} Valor armazenado ou null
   */
  get(key) {
    this.stats.totalRequests++;
    
    const item = this.memoryCache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Verificar TTL
    if (this._isExpired(item)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Atualizar estatísticas de acesso
    this.accessTimes.set(key, Date.now());
    this.hitCounts.set(key, (this.hitCounts.get(key) || 0) + 1);
    
    this.stats.hits++;
    return item.value;
  }
  
  /**
   * Armazena valor no cache
   * @param {string} key - Chave do cache
   * @param {*} value - Valor a ser armazenado
   * @param {number} ttl - Time to live em ms (opcional)
   * @returns {boolean} Sucesso da operação
   */
  set(key, value, ttl = null) {
    try {
      // Verificar se precisa fazer eviction
      if (this.memoryCache.size >= this.maxSize && !this.memoryCache.has(key)) {
        this._evictLeastUsed();
      }
      
      const item = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTtl,
        size: this._calculateSize(value)
      };
      
      this.memoryCache.set(key, item);
      this.accessTimes.set(key, Date.now());
      this.hitCounts.set(key, 0);
      
      this.stats.sets++;
      return true;
      
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
      return false;
    }
  }
  
  /**
   * Remove valor do cache
   * @param {string} key - Chave do cache
   * @returns {boolean} Sucesso da operação
   */
  delete(key) {
    const deleted = this.memoryCache.delete(key);
    
    if (deleted) {
      this.accessTimes.delete(key);
      this.hitCounts.delete(key);
      this.stats.deletes++;
    }
    
    return deleted;
  }
  
  /**
   * Verifica se uma chave existe no cache
   * @param {string} key - Chave do cache
   * @returns {boolean} Existe e não expirou
   */
  has(key) {
    const item = this.memoryCache.get(key);
    
    if (!item) {
      return false;
    }
    
    if (this._isExpired(item)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.memoryCache.size;
    
    this.memoryCache.clear();
    this.accessTimes.clear();
    this.hitCounts.clear();
    
    this.stats.deletes += size;
  }
  
  /**
   * Obtém ou define valor no cache (get-or-set pattern)
   * @param {string} key - Chave do cache
   * @param {Function} factory - Função para gerar valor se não existir
   * @param {number} ttl - Time to live em ms (opcional)
   * @returns {Promise<*>} Valor do cache ou gerado
   */
  async getOrSet(key, factory, ttl = null) {
    let value = this.get(key);
    
    if (value !== null) {
      return value;
    }
    
    // Gerar novo valor
    try {
      value = await factory();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error('Erro na factory function do cache:', error);
      throw error;
    }
  }
  
  /**
   * Obtém múltiplos valores do cache
   * @param {Array<string>} keys - Array de chaves
   * @returns {Object} Objeto com chaves e valores encontrados
   */
  getMultiple(keys) {
    const result = {};
    
    keys.forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    });
    
    return result;
  }
  
  /**
   * Define múltiplos valores no cache
   * @param {Object} items - Objeto com chaves e valores
   * @param {number} ttl - Time to live em ms (opcional)
   * @returns {number} Número de itens salvos com sucesso
   */
  setMultiple(items, ttl = null) {
    let successCount = 0;
    
    Object.entries(items).forEach(([key, value]) => {
      if (this.set(key, value, ttl)) {
        successCount++;
      }
    });
    
    return successCount;
  }
  
  /**
   * Obtém estatísticas do cache
   * @returns {Object} Estatísticas detalhadas
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.stats.startTime;
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    const memoryUsage = this._calculateTotalSize();
    
    return {
      strategy: this.strategy,
      size: this.memoryCache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions,
      cleanups: this.stats.cleanups,
      totalRequests: this.stats.totalRequests,
      memoryUsage: memoryUsage,
      uptime: uptime,
      averageItemSize: this.memoryCache.size > 0 ? memoryUsage / this.memoryCache.size : 0
    };
  }
  
  /**
   * Obtém informações sobre itens no cache
   * @returns {Array} Lista de itens com metadados
   */
  getItems() {
    const items = [];
    
    this.memoryCache.forEach((item, key) => {
      items.push({
        key: key,
        size: item.size,
        age: Date.now() - item.timestamp,
        ttl: item.ttl,
        expired: this._isExpired(item),
        hitCount: this.hitCounts.get(key) || 0,
        lastAccess: this.accessTimes.get(key)
      });
    });
    
    return items.sort((a, b) => b.hitCount - a.hitCount);
  }
  
  /**
   * Força limpeza de itens expirados
   * @returns {number} Número de itens removidos
   */
  cleanup() {
    let removedCount = 0;
    
    this.memoryCache.forEach((item, key) => {
      if (this._isExpired(item)) {
        this.delete(key);
        removedCount++;
      }
    });
    
    this.stats.cleanups++;
    return removedCount;
  }
  
  /**
   * Verifica se um item expirou
   * @private
   */
  _isExpired(item) {
    return Date.now() - item.timestamp > item.ttl;
  }
  
  /**
   * Remove item menos usado (LRU)
   * @private
   */
  _evictLeastUsed() {
    let lruKey = null;
    let lruTime = Date.now();
    let lruHits = Infinity;
    
    this.memoryCache.forEach((item, key) => {
      const lastAccess = this.accessTimes.get(key) || 0;
      const hitCount = this.hitCounts.get(key) || 0;
      
      // Priorizar por menor número de hits, depois por acesso mais antigo
      if (hitCount < lruHits || (hitCount === lruHits && lastAccess < lruTime)) {
        lruKey = key;
        lruTime = lastAccess;
        lruHits = hitCount;
      }
    });
    
    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Calcula tamanho aproximado de um valor
   * @private
   */
  _calculateSize(value) {
    try {
      if (typeof value === 'string') {
        return value.length * 2; // UTF-16
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value).length * 2;
      }
      
      return 8; // Tamanho padrão para primitivos
    } catch (error) {
      return 8;
    }
  }
  
  /**
   * Calcula tamanho total do cache
   * @private
   */
  _calculateTotalSize() {
    let totalSize = 0;
    
    this.memoryCache.forEach(item => {
      totalSize += item.size || 0;
    });
    
    return totalSize;
  }
  
  /**
   * Inicia timer de limpeza automática
   * @private
   */
  _startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
}

/**
 * Cache especializado para fact-checking
 */
class FactCheckCache extends CacheManager {
  constructor(options = {}) {
    super({
      maxSize: 500,
      defaultTtl: 3600000, // 1 hora para fact-checks
      ...options
    });
  }
  
  /**
   * Gera chave de cache para query de fact-check
   * @param {string} query - Query original
   * @param {Object} options - Opções da query
   * @returns {string} Chave de cache
   */
  generateKey(query, options = {}) {
    const normalizedQuery = query.toLowerCase().trim();
    const optionsHash = this._hashOptions(options);
    return `factcheck:${btoa(normalizedQuery)}:${optionsHash}`;
  }
  
  /**
   * Cache específico para Google Fact Check
   * @param {string} query - Query de busca
   * @param {Object} result - Resultado da API
   * @param {Object} options - Opções da query
   */
  cacheFactCheck(query, result, options = {}) {
    const key = this.generateKey(query, options);
    
    // TTL maior para resultados verificados
    const ttl = result.found && result.claims.length > 0 
      ? 7200000  // 2 horas para resultados encontrados
      : 1800000; // 30 minutos para não encontrados
    
    this.set(key, result, ttl);
  }
  
  /**
   * Busca resultado de fact-check no cache
   * @param {string} query - Query de busca
   * @param {Object} options - Opções da query
   * @returns {Object|null} Resultado cacheado
   */
  getFactCheck(query, options = {}) {
    const key = this.generateKey(query, options);
    return this.get(key);
  }
  
  /**
   * Gera hash das opções
   * @private
   */
  _hashOptions(options) {
    const relevantOptions = {
      maxResults: options.maxResults,
      languageCode: options.languageCode,
      reviewPublisherSiteFilter: options.reviewPublisherSiteFilter
    };
    
    return btoa(JSON.stringify(relevantOptions)).substring(0, 8);
  }
}

/**
 * Factory para criar caches especializados
 */
class CacheFactory {
  /**
   * Cria cache para fact-checking
   */
  static createFactCheckCache() {
    return new FactCheckCache({
      maxSize: 500,
      defaultTtl: 3600000
    });
  }
  
  /**
   * Cria cache para keywords
   */
  static createKeywordCache() {
    return new CacheManager({
      maxSize: 1000,
      defaultTtl: 1800000 // 30 minutos
    });
  }
  
  /**
   * Cria cache para embeddings
   */
  static createEmbeddingCache() {
    return new CacheManager({
      maxSize: 200,
      defaultTtl: 86400000 // 24 horas
    });
  }
  
  /**
   * Cria cache para desenvolvimento (sem TTL)
   */
  static createDevelopmentCache() {
    return new CacheManager({
      maxSize: 100,
      defaultTtl: 86400000 // 24 horas
    });
  }
}

module.exports = { CacheManager, FactCheckCache, CacheFactory };
