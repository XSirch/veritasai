/**
 * FactCheckOrchestrator - Orquestrador inteligente de verificação de fatos
 * Combina Google Fact Check API e Groq LLM com fallbacks inteligentes
 */

const GoogleFactCheckService = require('./google-fact-check-service');
const GroqLLMService = require('./groq-llm-service');
const KeywordExtractor = require('../utils/keyword-extractor');
const { ErrorHandler } = require('../utils/error-handler');

/**
 * Classe principal para orquestração de fact-checking
 */
class FactCheckOrchestrator {
  constructor(options = {}) {
    this.options = {
      preferredStrategy: options.preferredStrategy || 'hybrid',
      fallbackEnabled: options.fallbackEnabled !== false,
      llmAsBackup: options.llmAsBackup !== false,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      maxConcurrentRequests: options.maxConcurrentRequests || 3,
      timeout: options.timeout || 30000,
      ...options
    };
    
    // Inicializar serviços
    this.googleService = new GoogleFactCheckService({
      apiKey: options.googleApiKey,
      cacheEnabled: options.cacheEnabled !== false,
      rateLimitEnabled: options.rateLimitEnabled !== false,
      ...options.googleOptions
    });
    
    this.groqService = new GroqLLMService({
      apiKey: options.groqApiKey,
      cacheEnabled: options.cacheEnabled !== false,
      rateLimitEnabled: options.rateLimitEnabled !== false,
      costTrackingEnabled: options.costTrackingEnabled !== false,
      ...options.groqOptions
    });
    
    this.keywordExtractor = new KeywordExtractor({
      maxKeywords: 8,
      language: 'pt',
      ...options.extractorOptions
    });
    
    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableFallbacks: true,
      maxRetries: 2
    });
    
    // Estatísticas de uso
    this.stats = {
      totalRequests: 0,
      googleApiUsage: 0,
      groqApiUsage: 0,
      hybridUsage: 0,
      fallbacksUsed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      startTime: Date.now()
    };
  }
  
  /**
   * Verifica fatos usando estratégia inteligente
   * @param {string} text - Texto para verificação
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Resultado da verificação
   */
  async checkFacts(text, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    try {
      // Validar entrada
      this.errorHandler.validate(text, {
        required: true,
        type: 'string',
        minLength: 10,
        maxLength: 5000
      }, 'text');
      
      // Determinar estratégia
      const strategy = options.strategy || this.options.preferredStrategy;
      
      let result;
      
      switch (strategy) {
        case 'google_only':
          result = await this._checkWithGoogleOnly(text, options);
          break;
        case 'llm_only':
          result = await this._checkWithLLMOnly(text, options);
          break;
        case 'hybrid':
          result = await this._checkWithHybrid(text, options);
          break;
        case 'parallel':
          result = await this._checkWithParallel(text, options);
          break;
        default:
          result = await this._checkWithHybrid(text, options);
      }
      
      // Enriquecer resultado
      result = this._enrichResult(result, text, strategy);
      
      // Atualizar estatísticas
      this._updateStats(result, Date.now() - startTime, true);
      
      return result;
      
    } catch (error) {
      this._updateStats(null, Date.now() - startTime, false);
      return this.errorHandler.handleError(error, { text, options });
    }
  }
  
  /**
   * Verifica usando apenas Google Fact Check API
   * @private
   */
  async _checkWithGoogleOnly(text, options) {
    this.stats.googleApiUsage++;
    
    // Extrair keywords otimizadas
    const keywords = this.keywordExtractor.extractForFactCheck(text);
    
    // Verificar com Google API
    const result = await this.googleService.checkFacts(keywords, options);
    
    if (!result.success && this.options.fallbackEnabled) {
      this.stats.fallbacksUsed++;
      return this._fallbackToLLM(text, options, 'google_api_failed');
    }
    
    return {
      ...result,
      strategy: 'google_only',
      keywordsUsed: keywords
    };
  }
  
  /**
   * Verifica usando apenas Groq LLM
   * @private
   */
  async _checkWithLLMOnly(text, options) {
    this.stats.groqApiUsage++;
    
    const result = await this.groqService.analyzeWithFallback(text, {
      task: 'fact_check',
      ...options
    });
    
    return {
      ...result,
      strategy: 'llm_only'
    };
  }
  
  /**
   * Verifica usando estratégia híbrida (Google primeiro, LLM como fallback)
   * @private
   */
  async _checkWithHybrid(text, options) {
    this.stats.hybridUsage++;
    
    try {
      // Tentar Google API primeiro
      const keywords = this.keywordExtractor.extractForFactCheck(text);
      const googleResult = await this.googleService.checkFacts(keywords, options);
      
      if (googleResult.success && googleResult.found && 
          this._isResultSufficient(googleResult)) {
        
        return {
          ...googleResult,
          strategy: 'hybrid_google_primary',
          keywordsUsed: keywords,
          llmBackupAvailable: true
        };
      }
      
      // Se Google não retornou resultados suficientes, usar LLM
      if (this.options.llmAsBackup) {
        this.stats.fallbacksUsed++;
        const llmResult = await this._fallbackToLLM(text, options, 'insufficient_google_results');
        
        // Combinar resultados se ambos tiverem dados
        if (googleResult.success && googleResult.found && llmResult.success) {
          return this._combineResults(googleResult, llmResult, keywords);
        }
        
        return llmResult;
      }
      
      return googleResult;
      
    } catch (error) {
      // Se Google falhar completamente, usar LLM
      if (this.options.llmAsBackup) {
        this.stats.fallbacksUsed++;
        return this._fallbackToLLM(text, options, 'google_api_error');
      }
      
      throw error;
    }
  }
  
  /**
   * Verifica usando ambos os serviços em paralelo
   * @private
   */
  async _checkWithParallel(text, options) {
    const keywords = this.keywordExtractor.extractForFactCheck(text);
    
    // Executar ambos em paralelo
    const [googleResult, llmResult] = await Promise.allSettled([
      this.googleService.checkFacts(keywords, options),
      this.groqService.analyzeWithFallback(text, { task: 'fact_check', ...options })
    ]);
    
    this.stats.googleApiUsage++;
    this.stats.groqApiUsage++;
    
    // Processar resultados
    const googleData = googleResult.status === 'fulfilled' ? googleResult.value : null;
    const llmData = llmResult.status === 'fulfilled' ? llmResult.value : null;
    
    // Combinar resultados se ambos tiverem sucesso
    if (googleData?.success && llmData?.success) {
      return this._combineResults(googleData, llmData, keywords);
    }
    
    // Usar o melhor resultado disponível
    if (googleData?.success && googleData.found) {
      return {
        ...googleData,
        strategy: 'parallel_google_primary',
        keywordsUsed: keywords,
        llmResult: llmData
      };
    }
    
    if (llmData?.success) {
      return {
        ...llmData,
        strategy: 'parallel_llm_primary',
        googleResult: googleData
      };
    }
    
    // Se ambos falharam
    throw new Error('Ambos os serviços falharam na verificação paralela');
  }
  
  /**
   * Fallback para LLM
   * @private
   */
  async _fallbackToLLM(text, options, reason) {
    this.stats.groqApiUsage++;
    
    const result = await this.groqService.analyzeWithFallback(text, {
      task: 'fact_check',
      fallbackStrategy: 'quality_optimized',
      ...options
    });
    
    return {
      ...result,
      strategy: 'llm_fallback',
      fallbackReason: reason,
      fallbackUsed: true
    };
  }
  
  /**
   * Combina resultados do Google e LLM
   * @private
   */
  _combineResults(googleResult, llmResult, keywords) {
    // Calcular confiança combinada
    const googleConfidence = this._extractConfidence(googleResult);
    const llmConfidence = this._extractConfidence(llmResult);
    
    // Peso maior para Google se tiver resultados específicos
    const googleWeight = googleResult.found && googleResult.claims.length > 0 ? 0.7 : 0.3;
    const llmWeight = 1 - googleWeight;
    
    const combinedConfidence = (googleConfidence * googleWeight) + (llmConfidence * llmWeight);
    
    // Determinar classificação final
    let finalClassification = 'mixed';
    
    if (googleResult.found && googleResult.summary) {
      const googleVerified = googleResult.summary.verified || 0;
      const googleDisputed = googleResult.summary.disputed || 0;
      const googleTotal = googleResult.summary.total || 1;
      
      if (googleVerified / googleTotal > 0.7) {
        finalClassification = 'mostly_verified';
      } else if (googleDisputed / googleTotal > 0.7) {
        finalClassification = 'mostly_disputed';
      }
    }
    
    // Se LLM tem classificação e Google não é conclusivo
    if (finalClassification === 'mixed' && llmResult.structuredData?.classification) {
      finalClassification = llmResult.structuredData.classification;
    }
    
    return {
      success: true,
      strategy: 'hybrid_combined',
      classification: finalClassification,
      confidence: combinedConfidence,
      
      // Dados do Google
      googleResult: {
        found: googleResult.found,
        claims: googleResult.claims || [],
        summary: googleResult.summary || {}
      },
      
      // Dados do LLM
      llmResult: {
        analysis: llmResult.structuredData || llmResult.analysis,
        model: llmResult.model || llmResult.modelUsed
      },
      
      // Dados combinados
      combinedAnalysis: {
        keywordsUsed: keywords,
        sourcesCount: (googleResult.claims || []).length,
        llmConfidence: llmConfidence,
        googleConfidence: googleConfidence,
        combinedConfidence: combinedConfidence
      },
      
      recommendations: this._generateCombinedRecommendations(googleResult, llmResult),
      
      timestamp: Date.now(),
      source: 'hybrid_orchestrator'
    };
  }
  
  /**
   * Verifica se resultado é suficiente
   * @private
   */
  _isResultSufficient(result) {
    if (!result.success || !result.found) {
      return false;
    }
    
    // Verificar se tem claims suficientes
    const claimsCount = result.claims?.length || 0;
    if (claimsCount === 0) {
      return false;
    }
    
    // Verificar confiança média
    const avgConfidence = this._extractConfidence(result);
    if (avgConfidence < this.options.confidenceThreshold) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Extrai confiança de um resultado
   * @private
   */
  _extractConfidence(result) {
    if (result.structuredData?.confidence) {
      return typeof result.structuredData.confidence === 'number' 
        ? result.structuredData.confidence 
        : 0.5;
    }
    
    if (result.summary?.verified && result.summary?.total) {
      return result.summary.verified / result.summary.total;
    }
    
    if (result.claims && result.claims.length > 0) {
      const confidences = result.claims
        .map(claim => claim.confidence || 0.5)
        .filter(conf => conf > 0);
      
      return confidences.length > 0 
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : 0.5;
    }
    
    return 0.5;
  }
  
  /**
   * Gera recomendações combinadas
   * @private
   */
  _generateCombinedRecommendations(googleResult, llmResult) {
    const recommendations = [];
    
    // Recomendações do Google
    if (googleResult.recommendations) {
      recommendations.push(...googleResult.recommendations.map(rec => ({
        ...rec,
        source: 'google_api'
      })));
    }
    
    // Recomendações do LLM
    if (llmResult.structuredData?.recommendations) {
      recommendations.push(...llmResult.structuredData.recommendations.map(rec => ({
        ...rec,
        source: 'llm_analysis'
      })));
    }
    
    // Recomendação de verificação cruzada
    recommendations.push({
      type: 'cross_verification',
      level: 'medium',
      message: 'Resultados verificados por múltiplas fontes (API + LLM)',
      action: 'high_confidence_result',
      source: 'orchestrator'
    });
    
    return recommendations;
  }
  
  /**
   * Enriquece resultado final
   * @private
   */
  _enrichResult(result, originalText, strategy) {
    return {
      ...result,
      originalText: originalText,
      strategy: strategy,
      processingMetadata: {
        orchestratorVersion: '1.0',
        servicesUsed: this._getServicesUsed(strategy),
        processingTime: Date.now() - (result.timestamp || Date.now()),
        textLength: originalText.length,
        wordCount: originalText.split(/\s+/).length
      }
    };
  }
  
  /**
   * Obtém serviços utilizados
   * @private
   */
  _getServicesUsed(strategy) {
    const services = [];
    
    if (strategy.includes('google') || strategy === 'hybrid' || strategy === 'parallel') {
      services.push('google_fact_check');
    }
    
    if (strategy.includes('llm') || strategy === 'hybrid' || strategy === 'parallel') {
      services.push('groq_llm');
    }
    
    services.push('keyword_extractor');
    
    return services;
  }
  
  /**
   * Atualiza estatísticas
   * @private
   */
  _updateStats(result, processingTime, success) {
    // Atualizar tempo médio de processamento
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalRequests - 1) + processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.totalRequests;
    
    // Atualizar taxa de sucesso
    const successCount = success ? 1 : 0;
    const totalSuccess = this.stats.successRate * (this.stats.totalRequests - 1) + successCount;
    this.stats.successRate = totalSuccess / this.stats.totalRequests;
  }
  
  /**
   * Obtém estatísticas do orquestrador
   * @returns {Object} Estatísticas completas
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      orchestrator: {
        ...this.stats,
        uptime: uptime,
        requestRate: this.stats.totalRequests / (uptime / 1000),
        fallbackRate: this.stats.totalRequests > 0 
          ? (this.stats.fallbacksUsed / this.stats.totalRequests * 100).toFixed(2)
          : 0
      },
      
      services: {
        google: this.googleService.getStats(),
        groq: this.groqService.getStats()
      },
      
      config: {
        preferredStrategy: this.options.preferredStrategy,
        fallbackEnabled: this.options.fallbackEnabled,
        llmAsBackup: this.options.llmAsBackup,
        confidenceThreshold: this.options.confidenceThreshold
      }
    };
  }
  
  /**
   * Reseta estatísticas
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      googleApiUsage: 0,
      groqApiUsage: 0,
      hybridUsage: 0,
      fallbacksUsed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      startTime: Date.now()
    };
  }
}

module.exports = FactCheckOrchestrator;
