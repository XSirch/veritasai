/**
 * VeritasAI - Rate Limiter
 * Sistema de rate limiting para APIs
 */

export class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.windows = new Map();
    this.defaultConfig = {
      requests: 100,
      window: 60000, // 1 minuto
      strategy: 'sliding' // 'fixed', 'sliding'
    };
  }
  
  /**
   * Configura limites para APIs
   */
  configure(apiLimits) {
    for (const [apiName, config] of Object.entries(apiLimits)) {
      this.limits.set(apiName, {
        ...this.defaultConfig,
        ...config
      });
      
      // Inicializar janela de tempo
      this.windows.set(apiName, {
        requests: [],
        lastReset: Date.now()
      });
    }
    
    console.log('⚡ Rate limiter configurado para APIs:', Object.keys(apiLimits));
  }
  
  /**
   * Verifica se pode fazer request
   */
  async checkLimit(apiName) {
    const limit = this.limits.get(apiName);
    
    if (!limit) {
      // Se não há limite configurado, permitir
      return true;
    }
    
    const window = this.windows.get(apiName);
    const now = Date.now();
    
    if (limit.strategy === 'sliding') {
      return this.checkSlidingWindow(apiName, limit, window, now);
    } else {
      return this.checkFixedWindow(apiName, limit, window, now);
    }
  }
  
  /**
   * Verifica limite com janela deslizante
   */
  checkSlidingWindow(apiName, limit, window, now) {
    // Remover requests antigas da janela
    window.requests = window.requests.filter(
      timestamp => now - timestamp < limit.window
    );
    
    if (window.requests.length >= limit.requests) {
      const oldestRequest = Math.min(...window.requests);
      const waitTime = limit.window - (now - oldestRequest);
      
      console.warn(`⚡ Rate limit atingido para ${apiName}. Aguardar ${waitTime}ms`);
      
      throw new Error(`Rate limit exceeded for ${apiName}. Wait ${waitTime}ms`);
    }
    
    // Registrar novo request
    window.requests.push(now);
    return true;
  }
  
  /**
   * Verifica limite com janela fixa
   */
  checkFixedWindow(apiName, limit, window, now) {
    // Resetar janela se necessário
    if (now - window.lastReset >= limit.window) {
      window.requests = [];
      window.lastReset = now;
    }
    
    if (window.requests.length >= limit.requests) {
      const resetTime = window.lastReset + limit.window;
      const waitTime = resetTime - now;
      
      console.warn(`⚡ Rate limit atingido para ${apiName}. Aguardar ${waitTime}ms`);
      
      throw new Error(`Rate limit exceeded for ${apiName}. Wait ${waitTime}ms`);
    }
    
    // Registrar novo request
    window.requests.push(now);
    return true;
  }
  
  /**
   * Obtém status atual dos limites
   */
  getStatus() {
    const status = {};
    const now = Date.now();
    
    for (const [apiName, limit] of this.limits.entries()) {
      const window = this.windows.get(apiName);
      
      if (limit.strategy === 'sliding') {
        // Filtrar requests na janela atual
        const activeRequests = window.requests.filter(
          timestamp => now - timestamp < limit.window
        );
        
        status[apiName] = {
          current: activeRequests.length,
          limit: limit.requests,
          window: limit.window,
          strategy: limit.strategy,
          remaining: Math.max(0, limit.requests - activeRequests.length),
          resetTime: activeRequests.length > 0 
            ? Math.min(...activeRequests) + limit.window 
            : now
        };
      } else {
        // Janela fixa
        const resetTime = window.lastReset + limit.window;
        const isExpired = now >= resetTime;
        
        status[apiName] = {
          current: isExpired ? 0 : window.requests.length,
          limit: limit.requests,
          window: limit.window,
          strategy: limit.strategy,
          remaining: isExpired 
            ? limit.requests 
            : Math.max(0, limit.requests - window.requests.length),
          resetTime: isExpired ? now + limit.window : resetTime
        };
      }
    }
    
    return status;
  }
  
  /**
   * Obtém tempo de espera para próximo request
   */
  getWaitTime(apiName) {
    const limit = this.limits.get(apiName);
    const window = this.windows.get(apiName);
    
    if (!limit || !window) {
      return 0;
    }
    
    const now = Date.now();
    
    if (limit.strategy === 'sliding') {
      const activeRequests = window.requests.filter(
        timestamp => now - timestamp < limit.window
      );
      
      if (activeRequests.length < limit.requests) {
        return 0;
      }
      
      const oldestRequest = Math.min(...activeRequests);
      return Math.max(0, limit.window - (now - oldestRequest));
    } else {
      const resetTime = window.lastReset + limit.window;
      
      if (now >= resetTime || window.requests.length < limit.requests) {
        return 0;
      }
      
      return Math.max(0, resetTime - now);
    }
  }
  
  /**
   * Aguarda até poder fazer próximo request
   */
  async waitForSlot(apiName) {
    const waitTime = this.getWaitTime(apiName);
    
    if (waitTime > 0) {
      console.log(`⏳ Aguardando ${waitTime}ms para ${apiName}...`);
      await this.sleep(waitTime);
    }
  }
  
  /**
   * Reseta limites para uma API
   */
  reset(apiName) {
    const window = this.windows.get(apiName);
    
    if (window) {
      window.requests = [];
      window.lastReset = Date.now();
      console.log(`🔄 Rate limit resetado para ${apiName}`);
    }
  }
  
  /**
   * Reseta todos os limites
   */
  resetAll() {
    for (const apiName of this.windows.keys()) {
      this.reset(apiName);
    }
    
    console.log('🔄 Todos os rate limits resetados');
  }
  
  /**
   * Atualiza configuração de uma API
   */
  updateLimit(apiName, newConfig) {
    const currentLimit = this.limits.get(apiName);
    
    if (currentLimit) {
      this.limits.set(apiName, {
        ...currentLimit,
        ...newConfig
      });
      
      console.log(`⚡ Rate limit atualizado para ${apiName}:`, newConfig);
    }
  }
  
  /**
   * Remove limite de uma API
   */
  removeLimit(apiName) {
    this.limits.delete(apiName);
    this.windows.delete(apiName);
    
    console.log(`🗑️ Rate limit removido para ${apiName}`);
  }
  
  /**
   * Obtém estatísticas de uso
   */
  getStats() {
    const stats = {};
    
    for (const [apiName, window] of this.windows.entries()) {
      const limit = this.limits.get(apiName);
      const now = Date.now();
      
      let totalRequests, recentRequests;
      
      if (limit.strategy === 'sliding') {
        totalRequests = window.requests.length;
        recentRequests = window.requests.filter(
          timestamp => now - timestamp < limit.window
        ).length;
      } else {
        totalRequests = window.requests.length;
        recentRequests = now - window.lastReset < limit.window 
          ? window.requests.length 
          : 0;
      }
      
      stats[apiName] = {
        totalRequests,
        recentRequests,
        limit: limit.requests,
        utilizationRate: (recentRequests / limit.requests * 100).toFixed(2) + '%'
      };
    }
    
    return stats;
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.limits.clear();
    this.windows.clear();
    console.log('🧹 Rate limiter limpo');
  }
}
