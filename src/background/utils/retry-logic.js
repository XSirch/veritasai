/**
 * VeritasAI - Retry Logic
 * Sistema de retry com backoff exponencial
 */

export class RetryLogic {
  constructor() {
    this.defaultConfig = {
      maxRetries: 3,
      delay: 1000,
      backoff: 'exponential', // 'linear', 'exponential', 'fixed'
      maxDelay: 30000,
      retryCondition: (error) => this.shouldRetry(error)
    };
  }
  
  /**
   * Executa função com retry
   */
  async execute(fn, config = {}) {
    const options = { ...this.defaultConfig, ...config };
    let lastError;
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt + 1}/${options.maxRetries + 1}`);
        
        const result = await fn();
        
        if (attempt > 0) {
          console.log(`✅ Sucesso na tentativa ${attempt + 1}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        console.warn(`❌ Tentativa ${attempt + 1} falhou:`, error.message);
        
        // Verificar se deve tentar novamente
        if (attempt === options.maxRetries || !options.retryCondition(error)) {
          break;
        }
        
        // Calcular delay para próxima tentativa
        const delay = this.calculateDelay(attempt, options);
        
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await this.sleep(delay);
      }
    }
    
    console.error(`💥 Todas as tentativas falharam. Último erro:`, lastError);
    throw lastError;
  }
  
  /**
   * Calcula delay baseado na estratégia de backoff
   */
  calculateDelay(attempt, options) {
    let delay;
    
    switch (options.backoff) {
      case 'linear':
        delay = options.delay * (attempt + 1);
        break;
        
      case 'exponential':
        delay = options.delay * Math.pow(2, attempt);
        break;
        
      case 'fixed':
      default:
        delay = options.delay;
        break;
    }
    
    // Adicionar jitter para evitar thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;
    
    // Aplicar limite máximo
    return Math.min(delay, options.maxDelay);
  }
  
  /**
   * Determina se deve tentar novamente baseado no erro
   */
  shouldRetry(error) {
    // Não tentar novamente para erros de autenticação
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    
    // Não tentar novamente para erros de validação
    if (error.status === 400 || error.status === 422) {
      return false;
    }
    
    // Tentar novamente para erros de rede e servidor
    if (error.status >= 500 || error.code === 'NETWORK_ERROR') {
      return true;
    }
    
    // Tentar novamente para timeouts
    if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
      return true;
    }
    
    // Tentar novamente para rate limiting
    if (error.status === 429) {
      return true;
    }
    
    // Por padrão, não tentar novamente
    return false;
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Executa com timeout
   */
  async executeWithTimeout(fn, timeout = 30000) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), timeout)
      )
    ]);
  }
  
  /**
   * Executa com circuit breaker simples
   */
  async executeWithCircuitBreaker(fn, config = {}) {
    const options = {
      failureThreshold: 5,
      resetTimeout: 60000,
      ...config
    };
    
    // Implementação básica de circuit breaker
    // Em produção, usar biblioteca especializada
    
    if (this.circuitState === 'open') {
      if (Date.now() - this.lastFailureTime > options.resetTimeout) {
        this.circuitState = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.circuitState === 'half-open') {
        this.circuitState = 'closed';
        this.failureCount = 0;
      }
      
      return result;
      
    } catch (error) {
      this.failureCount = (this.failureCount || 0) + 1;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= options.failureThreshold) {
        this.circuitState = 'open';
      }
      
      throw error;
    }
  }
}

// Estado do circuit breaker
RetryLogic.prototype.circuitState = 'closed';
RetryLogic.prototype.failureCount = 0;
RetryLogic.prototype.lastFailureTime = 0;
