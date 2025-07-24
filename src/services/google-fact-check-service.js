/**
 * GoogleFactCheckService - Integração com Google Fact Check Tools API
 * Implementa verificação de informações usando a API oficial do Google
 */

const { RateLimiterFactory } = require('../utils/rate-limiter');
const { CacheFactory } = require('../utils/cache-manager');
const ResponseParser = require('../utils/response-parser');
const { ErrorHandler } = require('../utils/error-handler');

/**
 * Classe principal para integração com Google Fact Check API
 */
class GoogleFactCheckService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GOOGLE_FACT_CHECK_API_KEY;
    this.baseUrl = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

    this.options = {
      maxResults: options.maxResults || 10,
      timeout: options.timeout || 10000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      cacheEnabled: options.cacheEnabled !== false,
      rateLimitEnabled: options.rateLimitEnabled !== false,
      ...options
    };

    // Inicializar componentes avançados
    this.rateLimiter = options.rateLimitEnabled !== false
      ? RateLimiterFactory.createGoogleApiLimiter()
      : null;

    this.cache = options.cacheEnabled !== false
      ? CacheFactory.createFactCheckCache()
      : null;

    this.responseParser = new ResponseParser({
      includeMetadata: true,
      normalizeRatings: true,
      calculateConfidence: true,
      enrichWithContext: true
    });

    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableFallbacks: true,
      maxRetries: this.options.retryAttempts
    });

    // Validar configuração
    this._validateConfig();
  }
  
  /**
   * Verifica informações usando a Google Fact Check API
   * @param {string|Array} query - Texto ou keywords para verificar
   * @param {Object} options - Opções específicas da consulta
   * @returns {Promise<Object>} Resultado da verificação
   */
  async checkFacts(query, options = {}) {
    return this.errorHandler.withRetry(async () => {
      // Validar entrada
      this.errorHandler.validate(query, {
        required: true,
        type: 'string',
        minLength: 1
      }, 'query');

      // Normalizar query
      const normalizedQuery = this._normalizeQuery(query);

      // Verificar cache primeiro
      if (this.cache) {
        const cached = this.cache.getFactCheck(normalizedQuery, options);
        if (cached) {
          return {
            ...cached,
            source: 'cache',
            cached: true
          };
        }
      }

      // Verificar rate limiting
      if (this.rateLimiter) {
        await this.rateLimiter.waitForSlot();
      }

      // Fazer requisição para API
      const apiResponse = await this._makeApiRequest(normalizedQuery, options);

      // Processar resposta com parser avançado
      const processedResult = this.responseParser.parseGoogleFactCheck(apiResponse, normalizedQuery);

      // Salvar no cache
      if (this.cache && processedResult.success) {
        this.cache.cacheFactCheck(normalizedQuery, processedResult, options);
      }

      // Registrar request no rate limiter
      if (this.rateLimiter) {
        this.rateLimiter.recordRequest();
      }

      return processedResult;

    }, {
      retryCondition: (error) => {
        // Retry em erros temporários
        return error.status >= 500 || error.code === 'ECONNRESET';
      }
    }).catch(error => {
      return this.errorHandler.handleError(error, { query, options });
    });
  }
  
  /**
   * Verifica múltiplas queries em lote
   * @param {Array} queries - Array de queries para verificar
   * @param {Object} options - Opções para o lote
   * @returns {Promise<Array>} Array de resultados
   */
  async checkFactsBatch(queries, options = {}) {
    const batchSize = options.batchSize || 5;
    const delay = options.delay || 200; // Delay entre batches
    
    const results = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      // Processar batch em paralelo
      const batchPromises = batch.map(query => 
        this.checkFacts(query, options).catch(error => ({
          success: false,
          error: error.message,
          query: query
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay entre batches para respeitar rate limits
      if (i + batchSize < queries.length) {
        await this._sleep(delay);
      }
    }
    
    return results;
  }
  
  /**
   * Obtém estatísticas do serviço
   * @returns {Object} Estatísticas de uso
   */
  getStats() {
    const stats = {
      config: {
        apiKeyConfigured: !!this.apiKey,
        maxResults: this.options.maxResults,
        timeout: this.options.timeout,
        cacheEnabled: this.options.cacheEnabled,
        rateLimitEnabled: this.options.rateLimitEnabled
      }
    };

    // Estatísticas de cache
    if (this.cache) {
      stats.cache = this.cache.getStats();
    } else {
      stats.cache = { enabled: false };
    }

    // Estatísticas de rate limiting
    if (this.rateLimiter) {
      stats.rateLimit = this.rateLimiter.getStats();
    } else {
      stats.rateLimit = { enabled: false };
    }

    // Estatísticas de erro
    if (this.errorHandler) {
      stats.errors = this.errorHandler.getStats();
    }

    return stats;
  }
  
  /**
   * Limpa o cache
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
    }
  }
  
  /**
   * Valida a configuração inicial
   * @private
   */
  _validateConfig() {
    if (!this.apiKey) {
      console.warn('Google Fact Check API key não configurada. Defina GOOGLE_FACT_CHECK_API_KEY ou passe apiKey nas opções.');
    }
    
    if (this.options.maxResults > 50) {
      console.warn('maxResults muito alto. Google API limita a 50 resultados por request.');
      this.options.maxResults = 50;
    }
  }
  
  /**
   * Normaliza a query para busca
   * @private
   */
  _normalizeQuery(query) {
    if (Array.isArray(query)) {
      // Se for array de keywords, juntar em string
      return query.join(' ').trim();
    }
    
    if (typeof query === 'string') {
      // Limpar e normalizar string
      return query.trim().replace(/\s+/g, ' ');
    }
    
    throw new Error('Query deve ser string ou array de strings');
  }
  
  /**
   * Verifica e aplica rate limiting
   * @private
   */
  async _checkRateLimit() {
    if (!this.rateLimiter.enabled) return;
    
    const now = Date.now();
    
    // Remover requests antigas da janela
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < this.rateLimiter.windowMs
    );
    
    // Verificar se excedeu o limite
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimiter.requests);
      const waitTime = this.rateLimiter.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit atingido. Aguardando ${waitTime}ms...`);
        await this._sleep(waitTime);
      }
    }
    
    // Registrar nova request
    this.rateLimiter.requests.push(now);
  }
  
  /**
   * Obtém resultado do cache
   * @private
   */
  _getFromCache(query) {
    const cacheKey = this._getCacheKey(query);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      // Verificar se não expirou (cache por 1 hora)
      const maxAge = 60 * 60 * 1000; // 1 hora
      if (Date.now() - cached.timestamp < maxAge) {
        return cached.data;
      } else {
        // Remover cache expirado
        this.cache.delete(cacheKey);
      }
    }
    
    return null;
  }
  
  /**
   * Salva resultado no cache
   * @private
   */
  _saveToCache(query, result) {
    const cacheKey = this._getCacheKey(query);
    
    // Limitar tamanho do cache (máximo 1000 entradas)
    if (this.cache.size >= 1000) {
      // Remover entrada mais antiga
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }
  
  /**
   * Gera chave de cache
   * @private
   */
  _getCacheKey(query) {
    // Usar hash simples da query
    return btoa(encodeURIComponent(query.toLowerCase())).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  /**
   * Faz requisição para a API
   * @private
   */
  async _makeApiRequest(query, options = {}) {
    const params = new URLSearchParams({
      key: this.apiKey,
      query: query,
      pageSize: options.maxResults || this.options.maxResults
    });
    
    // Adicionar filtros opcionais
    if (options.languageCode) {
      params.append('languageCode', options.languageCode);
    }
    
    if (options.reviewPublisherSiteFilter) {
      params.append('reviewPublisherSiteFilter', options.reviewPublisherSiteFilter);
    }
    
    const url = `${this.baseUrl}?${params.toString()}`;
    
    // Fazer requisição com retry
    return await this._fetchWithRetry(url);
  }
  
  /**
   * Faz fetch com retry automático
   * @private
   */
  async _fetchWithRetry(url, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VeritasAI/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      if (attempt < this.options.retryAttempts) {
        console.log(`Tentativa ${attempt} falhou, tentando novamente em ${this.options.retryDelay}ms...`);
        await this._sleep(this.options.retryDelay * attempt);
        return this._fetchWithRetry(url, attempt + 1);
      }
      
      throw error;
    }
  }
  
  /**
   * Processa resposta da API
   * @private
   */
  _processApiResponse(apiResponse, originalQuery) {
    try {
      const claims = apiResponse.claims || [];
      
      if (claims.length === 0) {
        return {
          success: true,
          found: false,
          query: originalQuery,
          message: 'Nenhuma verificação encontrada para esta informação',
          claims: [],
          summary: {
            total: 0,
            verified: 0,
            disputed: 0,
            mixed: 0
          },
          timestamp: Date.now(),
          source: 'google_fact_check'
        };
      }
      
      // Processar claims
      const processedClaims = claims.map(claim => this._processClaim(claim));
      
      // Gerar resumo
      const summary = this._generateSummary(processedClaims);
      
      return {
        success: true,
        found: true,
        query: originalQuery,
        claims: processedClaims,
        summary: summary,
        timestamp: Date.now(),
        source: 'google_fact_check'
      };
      
    } catch (error) {
      throw new Error(`Erro ao processar resposta da API: ${error.message}`);
    }
  }
  
  /**
   * Processa um claim individual
   * @private
   */
  _processClaim(claim) {
    const claimReview = claim.claimReview?.[0] || {};
    
    return {
      text: claim.text || '',
      claimant: claim.claimant || 'Não informado',
      claimDate: claim.claimDate || null,
      publisher: {
        name: claimReview.publisher?.name || 'Não informado',
        site: claimReview.publisher?.site || null
      },
      url: claimReview.url || null,
      title: claimReview.title || '',
      reviewDate: claimReview.reviewDate || null,
      textualRating: claimReview.textualRating || 'Não avaliado',
      languageCode: claimReview.languageCode || 'pt',
      confidence: this._calculateConfidence(claimReview)
    };
  }
  
  /**
   * Calcula confiança baseada no rating
   * @private
   */
  _calculateConfidence(claimReview) {
    const rating = (claimReview.textualRating || '').toLowerCase();
    
    // Mapeamento de ratings para confiança
    const ratingMap = {
      'true': 0.9,
      'mostly true': 0.8,
      'half true': 0.5,
      'mostly false': 0.2,
      'false': 0.1,
      'pants on fire': 0.05,
      'verdadeiro': 0.9,
      'falso': 0.1,
      'parcialmente verdadeiro': 0.6,
      'enganoso': 0.3
    };
    
    return ratingMap[rating] || 0.5;
  }
  
  /**
   * Gera resumo dos claims
   * @private
   */
  _generateSummary(claims) {
    const summary = {
      total: claims.length,
      verified: 0,
      disputed: 0,
      mixed: 0
    };
    
    claims.forEach(claim => {
      if (claim.confidence >= 0.7) {
        summary.verified++;
      } else if (claim.confidence <= 0.3) {
        summary.disputed++;
      } else {
        summary.mixed++;
      }
    });
    
    return summary;
  }
  
  /**
   * Trata erros
   * @private
   */
  _handleError(error, originalQuery) {
    console.error('Erro no GoogleFactCheckService:', error);
    
    return {
      success: false,
      error: error.message,
      query: originalQuery,
      timestamp: Date.now(),
      source: 'google_fact_check'
    };
  }
  
  /**
   * Utilitário para sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GoogleFactCheckService;
