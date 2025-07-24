/**
 * RateLimiter - Sistema avançado de rate limiting
 * Implementa diferentes estratégias de rate limiting para APIs
 */

/**
 * Classe para rate limiting com múltiplas estratégias
 */
class RateLimiter {
  constructor(options = {}) {
    this.strategy = options.strategy || 'sliding_window';
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // 1 minuto
    this.enabled = options.enabled !== false;
    
    // Armazenamento de requests
    this.requests = [];
    this.buckets = new Map();
    
    // Configurações específicas por estratégia
    this.tokenBucket = {
      tokens: options.maxRequests || 100,
      maxTokens: options.maxRequests || 100,
      refillRate: options.refillRate || 1, // tokens por segundo
      lastRefill: Date.now()
    };
    
    // Estatísticas
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      averageWaitTime: 0,
      lastReset: Date.now()
    };
  }
  
  /**
   * Verifica se uma request pode ser feita
   * @param {string} identifier - Identificador único (opcional, para rate limiting por usuário)
   * @returns {Promise<Object>} Resultado da verificação
   */
  async checkLimit(identifier = 'default') {
    if (!this.enabled) {
      return { allowed: true, waitTime: 0 };
    }
    
    this.stats.totalRequests++;
    
    switch (this.strategy) {
      case 'sliding_window':
        return this._slidingWindowCheck(identifier);
      case 'fixed_window':
        return this._fixedWindowCheck(identifier);
      case 'token_bucket':
        return this._tokenBucketCheck(identifier);
      case 'leaky_bucket':
        return this._leakyBucketCheck(identifier);
      default:
        return this._slidingWindowCheck(identifier);
    }
  }
  
  /**
   * Aguarda até que uma request possa ser feita
   * @param {string} identifier - Identificador único
   * @returns {Promise<void>}
   */
  async waitForSlot(identifier = 'default') {
    const result = await this.checkLimit(identifier);
    
    if (!result.allowed && result.waitTime > 0) {
      console.log(`Rate limit atingido. Aguardando ${result.waitTime}ms...`);
      await this._sleep(result.waitTime);
      
      // Tentar novamente após esperar
      return this.waitForSlot(identifier);
    }
    
    return result;
  }
  
  /**
   * Registra uma request bem-sucedida
   * @param {string} identifier - Identificador único
   */
  recordRequest(identifier = 'default') {
    const now = Date.now();
    
    switch (this.strategy) {
      case 'sliding_window':
      case 'fixed_window':
        this.requests.push({ identifier, timestamp: now });
        break;
      case 'token_bucket':
        // Token já foi consumido no check
        break;
      case 'leaky_bucket':
        this._addToLeakyBucket(identifier, now);
        break;
    }
  }
  
  /**
   * Obtém estatísticas do rate limiter
   * @returns {Object} Estatísticas
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.stats.lastReset;
    const requestRate = this.stats.totalRequests / (uptime / 1000);
    const blockRate = this.stats.blockedRequests / Math.max(this.stats.totalRequests, 1) * 100;
    
    return {
      strategy: this.strategy,
      enabled: this.enabled,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      currentRequests: this.requests.length,
      totalRequests: this.stats.totalRequests,
      blockedRequests: this.stats.blockedRequests,
      requestRate: requestRate.toFixed(2),
      blockRate: blockRate.toFixed(2),
      uptime: uptime,
      tokenBucket: this.strategy === 'token_bucket' ? {
        currentTokens: this.tokenBucket.tokens,
        maxTokens: this.tokenBucket.maxTokens,
        refillRate: this.tokenBucket.refillRate
      } : null
    };
  }
  
  /**
   * Reseta o rate limiter
   */
  reset() {
    this.requests = [];
    this.buckets.clear();
    this.tokenBucket.tokens = this.tokenBucket.maxTokens;
    this.tokenBucket.lastRefill = Date.now();
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      averageWaitTime: 0,
      lastReset: Date.now()
    };
  }
  
  /**
   * Implementação de sliding window
   * @private
   */
  _slidingWindowCheck(identifier) {
    const now = Date.now();
    
    // Remover requests antigas
    this.requests = this.requests.filter(
      req => now - req.timestamp < this.windowMs
    );
    
    // Filtrar por identifier se especificado
    const userRequests = this.requests.filter(req => req.identifier === identifier);
    
    if (userRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...userRequests.map(req => req.timestamp));
      const waitTime = this.windowMs - (now - oldestRequest);
      
      this.stats.blockedRequests++;
      return { allowed: false, waitTime: Math.max(0, waitTime) };
    }
    
    return { allowed: true, waitTime: 0 };
  }
  
  /**
   * Implementação de fixed window
   * @private
   */
  _fixedWindowCheck(identifier) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    
    // Limpar requests de janelas anteriores
    this.requests = this.requests.filter(
      req => req.timestamp >= windowStart
    );
    
    const userRequests = this.requests.filter(req => req.identifier === identifier);
    
    if (userRequests.length >= this.maxRequests) {
      const nextWindow = windowStart + this.windowMs;
      const waitTime = nextWindow - now;
      
      this.stats.blockedRequests++;
      return { allowed: false, waitTime: waitTime };
    }
    
    return { allowed: true, waitTime: 0 };
  }
  
  /**
   * Implementação de token bucket
   * @private
   */
  _tokenBucketCheck(identifier) {
    const now = Date.now();
    
    // Recarregar tokens
    const timePassed = (now - this.tokenBucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * this.tokenBucket.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokenBucket.tokens = Math.min(
        this.tokenBucket.maxTokens,
        this.tokenBucket.tokens + tokensToAdd
      );
      this.tokenBucket.lastRefill = now;
    }
    
    // Verificar se há tokens disponíveis
    if (this.tokenBucket.tokens >= 1) {
      this.tokenBucket.tokens--;
      return { allowed: true, waitTime: 0 };
    }
    
    // Calcular tempo de espera para próximo token
    const waitTime = (1 / this.tokenBucket.refillRate) * 1000;
    
    this.stats.blockedRequests++;
    return { allowed: false, waitTime: waitTime };
  }
  
  /**
   * Implementação de leaky bucket
   * @private
   */
  _leakyBucketCheck(identifier) {
    const now = Date.now();
    
    if (!this.buckets.has(identifier)) {
      this.buckets.set(identifier, {
        queue: [],
        lastLeak: now
      });
    }
    
    const bucket = this.buckets.get(identifier);
    
    // Processar vazamento (leak)
    const timePassed = now - bucket.lastLeak;
    const leakRate = this.maxRequests / this.windowMs; // requests por ms
    const requestsToLeak = Math.floor(timePassed * leakRate);
    
    if (requestsToLeak > 0) {
      bucket.queue.splice(0, Math.min(requestsToLeak, bucket.queue.length));
      bucket.lastLeak = now;
    }
    
    // Verificar se há espaço no bucket
    if (bucket.queue.length >= this.maxRequests) {
      const waitTime = (bucket.queue.length - this.maxRequests + 1) / leakRate;
      
      this.stats.blockedRequests++;
      return { allowed: false, waitTime: Math.ceil(waitTime) };
    }
    
    return { allowed: true, waitTime: 0 };
  }
  
  /**
   * Adiciona request ao leaky bucket
   * @private
   */
  _addToLeakyBucket(identifier, timestamp) {
    if (!this.buckets.has(identifier)) {
      this.buckets.set(identifier, {
        queue: [],
        lastLeak: timestamp
      });
    }
    
    const bucket = this.buckets.get(identifier);
    bucket.queue.push(timestamp);
  }
  
  /**
   * Utilitário para sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory para criar rate limiters pré-configurados
 */
class RateLimiterFactory {
  /**
   * Cria rate limiter para Google APIs
   */
  static createGoogleApiLimiter() {
    return new RateLimiter({
      strategy: 'sliding_window',
      maxRequests: 100,
      windowMs: 100000, // 100 segundos
      enabled: true
    });
  }
  
  /**
   * Cria rate limiter para Groq API
   */
  static createGroqApiLimiter() {
    return new RateLimiter({
      strategy: 'token_bucket',
      maxRequests: 30,
      windowMs: 60000, // 1 minuto
      refillRate: 0.5, // 30 requests por minuto = 0.5 por segundo
      enabled: true
    });
  }
  
  /**
   * Cria rate limiter genérico
   */
  static createGenericLimiter(maxRequests = 60, windowMs = 60000) {
    return new RateLimiter({
      strategy: 'sliding_window',
      maxRequests: maxRequests,
      windowMs: windowMs,
      enabled: true
    });
  }
  
  /**
   * Cria rate limiter para desenvolvimento (sem limites)
   */
  static createDevelopmentLimiter() {
    return new RateLimiter({
      enabled: false
    });
  }
}

module.exports = { RateLimiter, RateLimiterFactory };
