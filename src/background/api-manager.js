/**
 * VeritasAI - API Manager
 * Gerencia integração com APIs externas (Google, Groq)
 */

import { HybridAnalyzer } from '../services/hybrid-analyzer.js';
import { RetryLogic } from './utils/retry-logic.js';
import { RateLimiter } from './utils/rate-limiter.js';

export class APIManager {
  constructor(configService) {
    this.configService = configService;
    this.hybridAnalyzer = null;
    this.retryLogic = new RetryLogic();
    this.rateLimiter = new RateLimiter();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      apiUsage: {
        google: { requests: 0, errors: 0 },
        groq: { requests: 0, errors: 0 }
      }
    };
    this.isInitialized = false;
  }
  
  /**
   * Inicializa o API Manager
   */
  async init() {
    try {
      console.log('🔧 Inicializando API Manager...');
      
      // Obter configuração atual
      const config = this.configService.getConfiguration();
      
      // Inicializar HybridAnalyzer com configurações
      this.hybridAnalyzer = new HybridAnalyzer({
        googleApiKey: config.googleApiKey,
        groqApiKey: config.groqApiKey,
        timeout: config.apiTimeout * 1000, // converter para ms
        maxRetries: config.retryAttempts || 3,
        retryDelay: config.retryDelay || 1000
      });
      
      await this.hybridAnalyzer.init();
      
      // Configurar rate limiting
      this.rateLimiter.configure({
        google: { requests: 100, window: 60000 }, // 100 req/min
        groq: { requests: 50, window: 60000 }     // 50 req/min
      });
      
      this.isInitialized = true;
      console.log('✅ API Manager inicializado');
      
    } catch (error) {
      console.error('❌ Erro na inicialização do API Manager:', error);
      this.isInitialized = false;
      throw error;
    }
  }
  
  /**
   * Atualiza configuração das APIs
   */
  async updateConfiguration() {
    try {
      console.log('🔄 Atualizando configuração das APIs...');
      
      const config = this.configService.getConfiguration();
      
      if (this.hybridAnalyzer) {
        await this.hybridAnalyzer.updateConfig({
          googleApiKey: config.googleApiKey,
          groqApiKey: config.groqApiKey,
          timeout: config.apiTimeout * 1000,
          maxRetries: config.retryAttempts || 3,
          retryDelay: config.retryDelay || 1000
        });
      }
      
      console.log('✅ Configuração das APIs atualizada');
      
    } catch (error) {
      console.error('❌ Erro ao atualizar configuração das APIs:', error);
      throw error;
    }
  }
  
  /**
   * Verifica texto usando análise híbrida
   */
  async verifyText(text, contentType = 'general', options = {}) {
    if (!this.isInitialized) {
      throw new Error('API Manager não inicializado');
    }
    
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    try {
      console.log(`🔍 Iniciando verificação híbrida para: "${text.substring(0, 50)}..."`);
      
      // Verificar rate limiting
      await this.checkRateLimit();
      
      // Preparar request
      const request = {
        text: text.trim(),
        contentType,
        options: {
          includeEvidences: true,
          includeMetadata: true,
          ...options
        }
      };
      
      // Executar análise híbrida com retry
      const result = await this.retryLogic.execute(
        () => this.hybridAnalyzer.analyze(request),
        {
          maxRetries: this.configService.get('retryAttempts', 3),
          delay: this.configService.get('retryDelay', 1000),
          backoff: 'exponential'
        }
      );
      
      // Calcular tempo de resposta
      const responseTime = Date.now() - startTime;
      this.updateStats(true, responseTime);
      
      // Enriquecer resultado com metadados
      const enrichedResult = this.enrichResult(result, {
        requestTime: startTime,
        responseTime,
        contentType,
        textLength: text.length
      });
      
      console.log(`✅ Verificação concluída em ${responseTime}ms`);
      return enrichedResult;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, responseTime);
      
      console.error('❌ Erro na verificação:', error);
      
      // Retornar resultado de erro estruturado
      return this.createErrorResult(error, {
        requestTime: startTime,
        responseTime,
        contentType,
        textLength: text.length
      });
    }
  }
  
  /**
   * Testa conectividade de uma API específica
   */
  async testConnection(apiType, apiKey) {
    try {
      console.log(`🧪 Testando conectividade da API ${apiType}...`);
      
      const startTime = Date.now();
      
      let result;
      switch (apiType) {
        case 'google':
          result = await this.testGoogleAPI(apiKey);
          break;
        case 'groq':
          result = await this.testGroqAPI(apiKey);
          break;
        default:
          throw new Error(`Tipo de API não suportado: ${apiType}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Teste da API ${apiType} concluído em ${responseTime}ms`);
      
      return {
        connected: true,
        responseTime,
        apiType,
        timestamp: Date.now(),
        ...result
      };
      
    } catch (error) {
      console.error(`❌ Erro no teste da API ${apiType}:`, error);
      
      return {
        connected: false,
        error: error.message,
        apiType,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Testa Google Fact Check Tools API
   */
  async testGoogleAPI(apiKey) {
    const testQuery = 'test query';
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(testQuery)}&key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      status: 'connected',
      quota: response.headers.get('X-RateLimit-Remaining') || 'unknown',
      version: 'v1alpha1'
    };
  }
  
  /**
   * Testa Groq API
   */
  async testGroqAPI(apiKey) {
    const url = 'https://api.groq.com/openai/v1/models';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      status: 'connected',
      models: data.data?.length || 0,
      version: 'v1'
    };
  }
  
  /**
   * Verifica rate limiting
   */
  async checkRateLimit() {
    const config = this.configService.getConfiguration();
    
    if (config.googleApiKey) {
      await this.rateLimiter.checkLimit('google');
    }
    
    if (config.groqApiKey) {
      await this.rateLimiter.checkLimit('groq');
    }
  }
  
  /**
   * Enriquece resultado com metadados
   */
  enrichResult(result, metadata) {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        ...metadata,
        version: '1.0.18',
        engine: 'hybrid'
      }
    };
  }
  
  /**
   * Cria resultado de erro estruturado
   */
  createErrorResult(error, metadata) {
    return {
      classification: 'error',
      confidence: 0,
      evidences: [],
      sources: [],
      error: {
        message: error.message,
        type: error.constructor.name,
        code: error.code || 'UNKNOWN_ERROR'
      },
      metadata: {
        ...metadata,
        version: '1.0.18',
        engine: 'hybrid',
        success: false
      }
    };
  }
  
  /**
   * Atualiza estatísticas
   */
  updateStats(success, responseTime) {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // Calcular média de tempo de resposta
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests
    );
  }
  
  /**
   * Obtém estatísticas de uso
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      isInitialized: this.isInitialized,
      rateLimits: this.rateLimiter.getStatus()
    };
  }
  
  /**
   * Reseta estatísticas
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      apiUsage: {
        google: { requests: 0, errors: 0 },
        groq: { requests: 0, errors: 0 }
      }
    };
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    if (this.hybridAnalyzer) {
      this.hybridAnalyzer.cleanup();
    }
    
    this.rateLimiter.cleanup();
    this.isInitialized = false;
  }
}
