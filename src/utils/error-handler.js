/**
 * ErrorHandler - Sistema robusto de tratamento de erros para VeritasAI
 * Implementa fallbacks, retry logic e logging estruturado
 */

/**
 * Tipos de erro customizados
 */
class VeritasError extends Error {
  constructor(message, type, code, details = {}) {
    super(message);
    this.name = 'VeritasError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }
}

class ApiError extends VeritasError {
  constructor(message, statusCode, response = null) {
    super(message, 'API_ERROR', `HTTP_${statusCode}`);
    this.statusCode = statusCode;
    this.response = response;
  }
}

class RateLimitError extends VeritasError {
  constructor(message, retryAfter = null) {
    super(message, 'RATE_LIMIT_ERROR', 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

class ValidationError extends VeritasError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 'INVALID_INPUT');
    this.field = field;
  }
}

class NetworkError extends VeritasError {
  constructor(message, originalError = null) {
    super(message, 'NETWORK_ERROR', 'CONNECTION_FAILED');
    this.originalError = originalError;
  }
}

/**
 * Classe principal para tratamento de erros
 */
class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableLogging: options.enableLogging !== false,
      enableFallbacks: options.enableFallbacks !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      logLevel: options.logLevel || 'error',
      ...options
    };
    
    // Estatísticas de erro
    this.stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByCode: {},
      retriesAttempted: 0,
      fallbacksUsed: 0,
      lastError: null
    };
    
    // Configurar logging
    this._setupLogging();
  }
  
  /**
   * Trata erro de forma abrangente
   * @param {Error} error - Erro original
   * @param {Object} context - Contexto adicional
   * @returns {Object} Resposta de erro estruturada
   */
  handleError(error, context = {}) {
    this.stats.totalErrors++;
    this.stats.lastError = Date.now();
    
    // Classificar erro
    const classifiedError = this._classifyError(error);
    
    // Atualizar estatísticas
    this._updateStats(classifiedError);
    
    // Log do erro
    if (this.options.enableLogging) {
      this._logError(classifiedError, context);
    }
    
    // Gerar resposta estruturada
    const response = this._generateErrorResponse(classifiedError, context);
    
    // Aplicar fallbacks se habilitado
    if (this.options.enableFallbacks) {
      response.fallback = this._generateFallback(classifiedError, context);
    }
    
    return response;
  }
  
  /**
   * Executa função com retry automático
   * @param {Function} fn - Função a ser executada
   * @param {Object} options - Opções de retry
   * @returns {Promise<*>} Resultado da função
   */
  async withRetry(fn, options = {}) {
    const maxRetries = options.maxRetries || this.options.maxRetries;
    const retryDelay = options.retryDelay || this.options.retryDelay;
    const retryCondition = options.retryCondition || this._defaultRetryCondition;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Verificar se deve tentar novamente
        if (attempt < maxRetries && retryCondition(error, attempt)) {
          this.stats.retriesAttempted++;
          
          // Calcular delay com backoff exponencial
          const delay = retryDelay * Math.pow(2, attempt);
          
          if (this.options.enableLogging) {
            console.log(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms...`);
          }
          
          await this._sleep(delay);
          continue;
        }
        
        // Não deve tentar novamente ou esgotou tentativas
        throw error;
      }
    }
    
    throw lastError;
  }
  
  /**
   * Executa função com fallback
   * @param {Function} primaryFn - Função principal
   * @param {Function} fallbackFn - Função de fallback
   * @param {Object} options - Opções
   * @returns {Promise<*>} Resultado da função
   */
  async withFallback(primaryFn, fallbackFn, options = {}) {
    try {
      return await primaryFn();
    } catch (error) {
      if (this.options.enableFallbacks && this._shouldUseFallback(error, options)) {
        this.stats.fallbacksUsed++;
        
        if (this.options.enableLogging) {
          console.log('Função principal falhou, usando fallback...');
        }
        
        try {
          const result = await fallbackFn();
          return {
            ...result,
            usedFallback: true,
            originalError: error.message
          };
        } catch (fallbackError) {
          // Se fallback também falhar, lançar erro original
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Valida entrada e lança erro se inválida
   * @param {*} value - Valor a ser validado
   * @param {Object} rules - Regras de validação
   * @param {string} field - Nome do campo (opcional)
   */
  validate(value, rules, field = null) {
    // Validação de tipo
    if (rules.type && typeof value !== rules.type) {
      throw new ValidationError(
        `Campo ${field || 'valor'} deve ser do tipo ${rules.type}`,
        field
      );
    }
    
    // Validação de obrigatoriedade
    if (rules.required && (value === null || value === undefined || value === '')) {
      throw new ValidationError(
        `Campo ${field || 'valor'} é obrigatório`,
        field
      );
    }
    
    // Validação de comprimento mínimo
    if (rules.minLength && value.length < rules.minLength) {
      throw new ValidationError(
        `Campo ${field || 'valor'} deve ter pelo menos ${rules.minLength} caracteres`,
        field
      );
    }
    
    // Validação de comprimento máximo
    if (rules.maxLength && value.length > rules.maxLength) {
      throw new ValidationError(
        `Campo ${field || 'valor'} deve ter no máximo ${rules.maxLength} caracteres`,
        field
      );
    }
    
    // Validação de padrão regex
    if (rules.pattern && !rules.pattern.test(value)) {
      throw new ValidationError(
        `Campo ${field || 'valor'} não atende ao padrão exigido`,
        field
      );
    }
    
    // Validação customizada
    if (rules.custom && !rules.custom(value)) {
      throw new ValidationError(
        `Campo ${field || 'valor'} não passou na validação customizada`,
        field
      );
    }
  }
  
  /**
   * Obtém estatísticas de erro
   * @returns {Object} Estatísticas
   */
  getStats() {
    const uptime = Date.now() - (this.stats.lastError || Date.now());
    
    return {
      ...this.stats,
      errorRate: this.stats.totalErrors / Math.max(uptime / 1000, 1),
      retrySuccessRate: this.stats.retriesAttempted > 0 
        ? ((this.stats.retriesAttempted - this.stats.totalErrors) / this.stats.retriesAttempted * 100).toFixed(2)
        : 0,
      fallbackUsageRate: this.stats.totalErrors > 0
        ? (this.stats.fallbacksUsed / this.stats.totalErrors * 100).toFixed(2)
        : 0
    };
  }
  
  /**
   * Reseta estatísticas
   */
  resetStats() {
    this.stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByCode: {},
      retriesAttempted: 0,
      fallbacksUsed: 0,
      lastError: null
    };
  }
  
  /**
   * Classifica erro em tipo conhecido
   * @private
   */
  _classifyError(error) {
    // Se já é um erro customizado, retornar como está
    if (error instanceof VeritasError) {
      return error;
    }
    
    // Classificar por mensagem/tipo
    const message = error.message || 'Erro desconhecido';
    
    // Erros de rede
    if (message.includes('fetch') || message.includes('network') || 
        message.includes('ECONNREFUSED') || message.includes('timeout')) {
      return new NetworkError(message, error);
    }
    
    // Erros de API HTTP
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      
      if (statusCode === 429) {
        return new RateLimitError(message, error.headers?.['retry-after']);
      }
      
      return new ApiError(message, statusCode, error.response);
    }
    
    // Erros de validação
    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(message);
    }
    
    // Erro genérico
    return new VeritasError(message, 'UNKNOWN_ERROR', 'UNKNOWN');
  }
  
  /**
   * Atualiza estatísticas de erro
   * @private
   */
  _updateStats(error) {
    // Por tipo
    if (!this.stats.errorsByType[error.type]) {
      this.stats.errorsByType[error.type] = 0;
    }
    this.stats.errorsByType[error.type]++;
    
    // Por código
    if (!this.stats.errorsByCode[error.code]) {
      this.stats.errorsByCode[error.code] = 0;
    }
    this.stats.errorsByCode[error.code]++;
  }
  
  /**
   * Gera resposta de erro estruturada
   * @private
   */
  _generateErrorResponse(error, context) {
    return {
      success: false,
      error: {
        message: error.message,
        type: error.type,
        code: error.code,
        timestamp: error.timestamp,
        details: error.details
      },
      context: context,
      suggestions: this._generateSuggestions(error),
      retryable: this._isRetryable(error),
      timestamp: Date.now()
    };
  }
  
  /**
   * Gera sugestões baseadas no tipo de erro
   * @private
   */
  _generateSuggestions(error) {
    const suggestions = [];
    
    switch (error.type) {
      case 'API_ERROR':
        if (error.statusCode === 401) {
          suggestions.push('Verificar se a API key está configurada corretamente');
        } else if (error.statusCode === 403) {
          suggestions.push('Verificar permissões da API key');
        } else if (error.statusCode >= 500) {
          suggestions.push('Erro no servidor da API, tentar novamente mais tarde');
        }
        break;
        
      case 'RATE_LIMIT_ERROR':
        suggestions.push('Aguardar antes de fazer nova requisição');
        suggestions.push('Considerar implementar cache para reduzir chamadas');
        break;
        
      case 'NETWORK_ERROR':
        suggestions.push('Verificar conexão com a internet');
        suggestions.push('Verificar se o serviço está disponível');
        break;
        
      case 'VALIDATION_ERROR':
        suggestions.push('Verificar formato dos dados de entrada');
        suggestions.push('Consultar documentação da API');
        break;
    }
    
    return suggestions;
  }
  
  /**
   * Gera fallback baseado no tipo de erro
   * @private
   */
  _generateFallback(error, context) {
    const fallback = {
      type: 'fallback',
      reason: error.type,
      timestamp: Date.now()
    };
    
    switch (error.type) {
      case 'API_ERROR':
      case 'NETWORK_ERROR':
        fallback.action = 'use_cache';
        fallback.message = 'Usando dados em cache devido a erro de conectividade';
        break;
        
      case 'RATE_LIMIT_ERROR':
        fallback.action = 'queue_request';
        fallback.message = 'Requisição adicionada à fila devido a rate limit';
        break;
        
      default:
        fallback.action = 'manual_verification';
        fallback.message = 'Verificação manual recomendada devido a erro técnico';
    }
    
    return fallback;
  }
  
  /**
   * Verifica se erro é retryable
   * @private
   */
  _isRetryable(error) {
    const retryableTypes = ['NETWORK_ERROR', 'API_ERROR'];
    const retryableCodes = ['HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504'];
    
    return retryableTypes.includes(error.type) || retryableCodes.includes(error.code);
  }
  
  /**
   * Condição padrão para retry
   * @private
   */
  _defaultRetryCondition(error, attempt) {
    const classifiedError = this._classifyError(error);
    return this._isRetryable(classifiedError);
  }
  
  /**
   * Verifica se deve usar fallback
   * @private
   */
  _shouldUseFallback(error, options) {
    if (options.noFallback) return false;
    
    const classifiedError = this._classifyError(error);
    const fallbackableTypes = ['API_ERROR', 'NETWORK_ERROR', 'RATE_LIMIT_ERROR'];
    
    return fallbackableTypes.includes(classifiedError.type);
  }
  
  /**
   * Configura sistema de logging
   * @private
   */
  _setupLogging() {
    // Implementação básica de logging
    // Em produção, integrar com sistema de logging mais robusto
  }
  
  /**
   * Faz log do erro
   * @private
   */
  _logError(error, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.options.logLevel,
      error: {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack
      },
      context: context
    };
    
    console.error('VeritasAI Error:', JSON.stringify(logEntry, null, 2));
  }
  
  /**
   * Utilitário para sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instância global do error handler
const globalErrorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  VeritasError,
  ApiError,
  RateLimitError,
  ValidationError,
  NetworkError,
  globalErrorHandler
};
