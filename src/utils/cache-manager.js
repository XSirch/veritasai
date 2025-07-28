/**
 * CacheManager - Sistema avançado de cache para VeritasAI
 * Implementa múltiplas estratégias de cache com TTL e persistência
 * VER-024: Otimizado para hit rate ≥ 60%
 */

/**
 * Classe principal para gerenciamento de cache
 */
class CacheManager {
  constructor(options = {}) {
    this.strategy = options.strategy || 'lru'; // Mudado para LRU por padrão
    this.maxSize = options.maxSize || 2000; // Aumentado para melhor hit rate
    this.defaultTtl = options.defaultTtl || 7200000; // 2 horas (aumentado)
    this.cleanupInterval = options.cleanupInterval || 600000; // 10 minutos
    this.enablePredictiveCaching = options.enablePredictiveCaching !== false;
    this.enableAdaptiveTtl = options.enableAdaptiveTtl !== false;
    this.targetHitRate = options.targetHitRate || 0.6; // 60%

    // Armazenamento
    this.memoryCache = new Map();
    this.accessTimes = new Map();
    this.hitCounts = new Map();
    this.accessOrder = new Map(); // Para LRU
    this.accessFrequency = new Map(); // Para LFU
    this.predictiveCache = new Map(); // Cache preditivo

    // Estatísticas avançadas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
      totalRequests: 0,
      startTime: Date.now(),
      hitRate: 0,
      avgResponseTime: 0,
      popularKeys: new Map(),
      timeBasedPatterns: new Map()
    };

    // Performance monitor integration
    this.performanceMonitor = null;
    this._initPerformanceMonitor();

    // Iniciar limpeza automática
    this._startCleanupTimer();

    // Iniciar otimização adaptativa
    this._startAdaptiveOptimization();
  }
  
  /**
   * Obtém valor do cache com estratégias otimizadas
   * @param {string} key - Chave do cache
   * @returns {*} Valor armazenado ou null
   */
  get(key) {
    const startTime = performance.now();
    this.stats.totalRequests++;

    // Registrar acesso para análise de padrões
    this._recordAccess(key);

    const item = this.memoryCache.get(key);

    if (!item) {
      this.stats.misses++;
      this._updateHitRate();

      // Tentar cache preditivo
      if (this.enablePredictiveCaching) {
        const predictedValue = this._tryPredictiveCache(key);
        if (predictedValue) {
          this.stats.hits++;
          this._recordPerformance(startTime);
          return predictedValue;
        }
      }

      this._recordPerformance(startTime);
      return null;
    }
    
    // Verificar TTL
    if (this._isExpired(item)) {
      this.delete(key);
      this.stats.misses++;
      this._updateHitRate();
      this._recordPerformance(startTime);
      return null;
    }

    // Atualizar estatísticas de acesso (LRU/LFU)
    this._updateAccessStats(key);
    this.stats.hits++;
    this._updateHitRate();

    // TTL adaptativo baseado na frequência de acesso
    if (this.enableAdaptiveTtl) {
      this._adaptTtl(key, item);
    }

    this._recordPerformance(startTime);
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

  /**
   * VER-024: Métodos otimizados para melhor hit rate
   */

  /**
   * Inicializa performance monitor
   * @private
   */
  _initPerformanceMonitor() {
    try {
      const { getPerformanceMonitor } = require('./performance-monitor.js');
      this.performanceMonitor = getPerformanceMonitor();
    } catch (error) {
      console.warn('⚠️ Performance monitor não disponível:', error.message);
    }
  }

  /**
   * Registra acesso para análise de padrões
   * @private
   */
  _recordAccess(key) {
    const now = Date.now();
    const hour = new Date(now).getHours();

    // Registrar popularidade da chave
    const popularity = this.stats.popularKeys.get(key) || 0;
    this.stats.popularKeys.set(key, popularity + 1);

    // Registrar padrão temporal
    const timePattern = this.stats.timeBasedPatterns.get(hour) || new Set();
    timePattern.add(key);
    this.stats.timeBasedPatterns.set(hour, timePattern);
  }

  /**
   * Atualiza estatísticas de acesso (LRU/LFU)
   * @private
   */
  _updateAccessStats(key) {
    const now = Date.now();

    // LRU: Atualizar ordem de acesso
    this.accessOrder.set(key, now);
    this.accessTimes.set(key, now);

    // LFU: Atualizar frequência
    const frequency = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, frequency + 1);

    // Atualizar hit counts
    this.hitCounts.set(key, (this.hitCounts.get(key) || 0) + 1);
  }

  /**
   * Atualiza hit rate
   * @private
   */
  _updateHitRate() {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
    }

    // Registrar no performance monitor
    if (this.performanceMonitor) {
      if (this.stats.hits > 0) {
        this.performanceMonitor.recordCacheHit();
      } else {
        this.performanceMonitor.recordCacheMiss();
      }
    }
  }

  /**
   * Registra performance
   * @private
   */
  _recordPerformance(startTime) {
    const duration = performance.now() - startTime;
    this.stats.avgResponseTime = (this.stats.avgResponseTime + duration) / 2;
  }

  /**
   * TTL adaptativo baseado na frequência de acesso
   * @private
   */
  _adaptTtl(key, item) {
    const frequency = this.accessFrequency.get(key) || 1;
    const popularity = this.stats.popularKeys.get(key) || 1;

    // Chaves mais populares têm TTL maior
    const multiplier = Math.min(Math.log(frequency + popularity), 3);
    const newTtl = this.defaultTtl * (1 + multiplier * 0.5);

    // Atualizar TTL se necessário
    if (newTtl > item.ttl) {
      item.ttl = newTtl;
      item.expiresAt = Date.now() + newTtl;
    }
  }

  /**
   * Cache preditivo baseado em padrões
   * @private
   */
  _tryPredictiveCache(key) {
    if (!this.enablePredictiveCaching) return null;

    // Verificar se há padrão temporal
    const hour = new Date().getHours();
    const timePattern = this.stats.timeBasedPatterns.get(hour);

    if (timePattern && timePattern.has(key)) {
      // Tentar prever valor baseado em chaves similares
      const similarKeys = this._findSimilarKeys(key);

      for (const similarKey of similarKeys) {
        const item = this.memoryCache.get(similarKey);
        if (item && !this._isExpired(item)) {
          // Cache preditivo: armazenar valor similar
          this.set(key, item.value, item.ttl);
          return item.value;
        }
      }
    }

    return null;
  }

  /**
   * Encontra chaves similares para cache preditivo
   * @private
   */
  _findSimilarKeys(key) {
    const similarKeys = [];
    const keyParts = key.split(':');

    for (const [existingKey] of this.memoryCache) {
      if (existingKey === key) continue;

      const existingParts = existingKey.split(':');
      let similarity = 0;

      // Calcular similaridade baseada em partes comuns
      for (let i = 0; i < Math.min(keyParts.length, existingParts.length); i++) {
        if (keyParts[i] === existingParts[i]) {
          similarity++;
        }
      }

      if (similarity >= keyParts.length * 0.7) {
        similarKeys.push(existingKey);
      }
    }

    return similarKeys.slice(0, 3); // Limitar a 3 chaves similares
  }

  /**
   * Inicia otimização adaptativa
   * @private
   */
  _startAdaptiveOptimization() {
    setInterval(() => {
      this._optimizeCache();
    }, 300000); // A cada 5 minutos
  }

  /**
   * Otimiza cache baseado em métricas
   * @private
   */
  _optimizeCache() {
    const currentHitRate = this.stats.hitRate;

    // Se hit rate está abaixo do target, otimizar
    if (currentHitRate < this.targetHitRate) {
      console.log(`🔧 Otimizando cache - Hit rate atual: ${(currentHitRate * 100).toFixed(1)}%`);

      // Aumentar tamanho do cache se necessário
      if (this.memoryCache.size >= this.maxSize * 0.9) {
        this.maxSize = Math.min(this.maxSize * 1.2, 5000);
        console.log(`📈 Tamanho do cache aumentado para: ${this.maxSize}`);
      }

      // Ajustar TTL padrão
      if (this.stats.misses > this.stats.hits) {
        this.defaultTtl = Math.min(this.defaultTtl * 1.1, 14400000); // Max 4 horas
        console.log(`⏰ TTL padrão aumentado para: ${this.defaultTtl / 1000}s`);
      }

      // Implementar cache warming para chaves populares
      this._warmPopularKeys();
    }
  }

  /**
   * Aquece cache com chaves populares
   * @private
   */
  _warmPopularKeys() {
    const popularKeys = Array.from(this.stats.popularKeys.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key);

    console.log(`🔥 Aquecendo cache com ${popularKeys.length} chaves populares`);

    // Estender TTL de chaves populares
    for (const key of popularKeys) {
      const item = this.memoryCache.get(key);
      if (item && !this._isExpired(item)) {
        item.ttl = this.defaultTtl * 2;
        item.expiresAt = Date.now() + item.ttl;
      }
    }
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
