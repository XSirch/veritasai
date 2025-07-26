/**
 * GroqLLMService - Integração com Groq API para análise LLM
 * Implementa fallback inteligente usando modelos de linguagem
 */

const { RateLimiterFactory } = require('../utils/rate-limiter');
const { CacheFactory } = require('../utils/cache-manager');
const { ErrorHandler } = require('../utils/error-handler');
const CostTracker = require('../utils/cost-tracker');

/**
 * Classe principal para integração com Groq LLM API
 */
class GroqLLMService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY;
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    this.options = {
      defaultModel: options.defaultModel || 'mixtral-8x7b-32768',
      maxTokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.1,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      cacheEnabled: options.cacheEnabled !== false,
      rateLimitEnabled: options.rateLimitEnabled !== false,
      costTrackingEnabled: options.costTrackingEnabled !== false,
      ...options
    };
    
    // Modelos disponíveis com suas características
    this.models = {
      'mixtral-8x7b-32768': {
        name: 'Mixtral 8x7B',
        contextLength: 32768,
        costPer1kTokens: 0.00027,
        strengths: ['reasoning', 'analysis', 'multilingual'],
        fallbackPriority: 1
      },
      'llama3-8b-8192': {
        name: 'Llama 3 8B',
        contextLength: 8192,
        costPer1kTokens: 0.00005,
        strengths: ['speed', 'efficiency', 'general'],
        fallbackPriority: 2
      },
      'gemma-7b-it': {
        name: 'Gemma 7B IT',
        contextLength: 8192,
        costPer1kTokens: 0.00007,
        strengths: ['instruction_following', 'safety'],
        fallbackPriority: 3
      }
    };
    
    // Inicializar componentes
    this.rateLimiter = options.rateLimitEnabled !== false 
      ? RateLimiterFactory.createGroqApiLimiter()
      : null;
    
    this.cache = options.cacheEnabled !== false
      ? CacheFactory.createKeywordCache()
      : null;
    
    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableFallbacks: true,
      maxRetries: this.options.retryAttempts
    });
    
    // Cost tracking
    this.costTracker = options.costTrackingEnabled !== false
      ? new CostTracker({
          budgetLimit: options.budgetLimit,
          alertThresholds: options.alertThresholds,
          persistData: options.persistCostData !== false
        })
      : null;
    
    // Validar configuração
    this._validateConfig();
  }
  
  /**
   * Analisa texto usando LLM para fact-checking
   * @param {string} text - Texto para análise
   * @param {Object} options - Opções específicas da análise
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyzeForFactCheck(text, options = {}) {
    return this.errorHandler.withRetry(async () => {
      // Validar entrada
      this.errorHandler.validate(text, {
        required: true,
        type: 'string',
        minLength: 10,
        maxLength: 10000
      }, 'text');
      
      // Verificar cache primeiro
      const cacheKey = this._generateCacheKey(text, options);
      if (this.cache) {
        const cached = this.cache.get(cacheKey);
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
      
      // Selecionar modelo
      const model = options.model || this.options.defaultModel;
      
      // Gerar prompt otimizado
      const prompt = this._generateFactCheckPrompt(text, options);
      
      // Fazer requisição para API
      const response = await this._makeApiRequest(prompt, model, options);
      
      // Processar resposta
      const result = this._processLLMResponse(response, text, model);
      
      // Salvar no cache
      if (this.cache && result.success) {
        this.cache.set(cacheKey, result, 1800000); // 30 minutos
      }
      
      // Registrar request no rate limiter
      if (this.rateLimiter) {
        this.rateLimiter.recordRequest();
      }
      
      // Tracking de custos
      if (this.costTracker) {
        this._trackCosts(response, model, options.task || 'fact_check');
      }
      
      return result;
      
    }, {
      retryCondition: (error) => {
        // Retry em erros temporários, mas não em erros de quota
        return error.status >= 500 && error.status !== 429;
      }
    }).catch(error => {
      return this.errorHandler.handleError(error, { text, options });
    });
  }
  
  /**
   * Analisa com fallback automático entre modelos
   * @param {string} text - Texto para análise
   * @param {Object} options - Opções da análise
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyzeWithFallback(text, options = {}) {
    const fallbackStrategy = options.fallbackStrategy || 'priority';
    let modelOrder;

    switch (fallbackStrategy) {
      case 'cost_optimized':
        modelOrder = this._getCostOptimizedOrder(text);
        break;
      case 'speed_optimized':
        modelOrder = this._getSpeedOptimizedOrder();
        break;
      case 'quality_optimized':
        modelOrder = this._getQualityOptimizedOrder();
        break;
      default:
        modelOrder = this._getPriorityOrder();
    }

    const fallbackResults = [];
    let lastError;

    for (let i = 0; i < modelOrder.length; i++) {
      const model = modelOrder[i];
      const isLastAttempt = i === modelOrder.length - 1;

      try {
        const startTime = Date.now();
        const result = await this.analyzeForFactCheck(text, { ...options, model });
        const processingTime = Date.now() - startTime;

        if (result.success && this._isResultAcceptable(result, options)) {
          return {
            ...result,
            modelUsed: model,
            fallbackUsed: model !== this.options.defaultModel,
            fallbackStrategy: fallbackStrategy,
            attemptsCount: i + 1,
            processingTime: processingTime,
            fallbackResults: fallbackResults
          };
        } else if (result.success) {
          // Resultado não aceitável, mas salvar para possível uso
          fallbackResults.push({
            model: model,
            result: result,
            processingTime: processingTime,
            reason: 'quality_threshold_not_met'
          });
        }

      } catch (error) {
        lastError = error;
        fallbackResults.push({
          model: model,
          error: error.message,
          reason: 'api_error'
        });

        console.log(`Modelo ${model} falhou: ${error.message}${isLastAttempt ? '' : ', tentando próximo...'}`);

        // Se não é a última tentativa, continuar
        if (!isLastAttempt) {
          continue;
        }
      }
    }

    // Se chegou aqui, todos falharam ou não atingiram qualidade mínima
    // Tentar usar o melhor resultado disponível
    const bestFallback = this._selectBestFallbackResult(fallbackResults);
    if (bestFallback) {
      return {
        ...bestFallback.result,
        modelUsed: bestFallback.model,
        fallbackUsed: true,
        fallbackStrategy: fallbackStrategy,
        attemptsCount: modelOrder.length,
        warning: 'Resultado de qualidade reduzida devido a falhas nos modelos preferenciais',
        fallbackResults: fallbackResults
      };
    }

    // Se realmente todos falharam
    throw lastError || new Error('Todos os modelos falharam ou não atingiram qualidade mínima');
  }

  /**
   * Analisa com múltiplos modelos e combina resultados
   * @param {string} text - Texto para análise
   * @param {Object} options - Opções da análise
   * @returns {Promise<Object>} Resultado combinado
   */
  async analyzeWithEnsemble(text, options = {}) {
    const modelsToUse = options.models || Object.keys(this.models).slice(0, 2);
    const results = [];
    const errors = [];

    // Executar análises em paralelo
    const promises = modelsToUse.map(async (model) => {
      try {
        const result = await this.analyzeForFactCheck(text, { ...options, model });
        return { model, result, success: true };
      } catch (error) {
        return { model, error: error.message, success: false };
      }
    });

    const responses = await Promise.allSettled(promises);

    responses.forEach(response => {
      if (response.status === 'fulfilled') {
        if (response.value.success) {
          results.push(response.value);
        } else {
          errors.push(response.value);
        }
      } else {
        errors.push({ error: response.reason.message });
      }
    });

    if (results.length === 0) {
      throw new Error(`Todos os modelos falharam: ${errors.map(e => e.error).join(', ')}`);
    }

    // Combinar resultados
    const combinedResult = this._combineEnsembleResults(results, text);

    return {
      ...combinedResult,
      ensembleUsed: true,
      modelsUsed: results.map(r => r.model),
      individualResults: results,
      errors: errors,
      timestamp: Date.now(),
      source: 'groq_llm_ensemble'
    };
  }

  /**
   * Obtém ordem de modelos por prioridade
   * @private
   */
  _getPriorityOrder() {
    return Object.keys(this.models)
      .sort((a, b) => this.models[a].fallbackPriority - this.models[b].fallbackPriority);
  }

  /**
   * Obtém ordem otimizada por custo
   * @private
   */
  _getCostOptimizedOrder(text) {
    const textLength = text.length;
    const estimatedTokens = Math.ceil(textLength / 4); // Aproximação

    return Object.keys(this.models)
      .sort((a, b) => {
        const costA = this.models[a].costPer1kTokens * (estimatedTokens / 1000);
        const costB = this.models[b].costPer1kTokens * (estimatedTokens / 1000);
        return costA - costB;
      });
  }

  /**
   * Obtém ordem otimizada por velocidade
   * @private
   */
  _getSpeedOptimizedOrder() {
    // Modelos menores tendem a ser mais rápidos
    return Object.keys(this.models)
      .sort((a, b) => {
        const sizeA = parseInt(a.match(/\d+/)?.[0] || '0');
        const sizeB = parseInt(b.match(/\d+/)?.[0] || '0');
        return sizeA - sizeB;
      });
  }

  /**
   * Obtém ordem otimizada por qualidade
   * @private
   */
  _getQualityOptimizedOrder() {
    // Modelos maiores e com melhor reasoning primeiro
    const qualityOrder = ['mixtral-8x7b-32768', 'llama3-8b-8192', 'gemma-7b-it'];
    return qualityOrder.filter(model => this.models[model]);
  }

  /**
   * Verifica se resultado é aceitável
   * @private
   */
  _isResultAcceptable(result, options = {}) {
    const minConfidence = options.minConfidence || 0.3;
    const requireStructured = options.requireStructured || false;

    // Verificar confiança mínima
    if (result.structuredData?.confidence) {
      const confidence = this._normalizeConfidence(result.structuredData.confidence);
      if (confidence < minConfidence) {
        return false;
      }
    }

    // Verificar se requer dados estruturados
    if (requireStructured && !result.structuredData) {
      return false;
    }

    // Verificar se a resposta não está truncada
    if (result.finishReason === 'length') {
      return false;
    }

    return true;
  }

  /**
   * Seleciona melhor resultado de fallback
   * @private
   */
  _selectBestFallbackResult(fallbackResults) {
    const validResults = fallbackResults.filter(r => r.result && r.result.success);

    if (validResults.length === 0) {
      return null;
    }

    // Ordenar por qualidade (confiança, dados estruturados, etc.)
    validResults.sort((a, b) => {
      const scoreA = this._calculateResultQualityScore(a.result);
      const scoreB = this._calculateResultQualityScore(b.result);
      return scoreB - scoreA;
    });

    return validResults[0];
  }

  /**
   * Calcula score de qualidade do resultado
   * @private
   */
  _calculateResultQualityScore(result) {
    let score = 0;

    // Pontos por ter dados estruturados
    if (result.structuredData) {
      score += 50;

      // Pontos por confiança
      if (result.structuredData.confidence) {
        score += this._normalizeConfidence(result.structuredData.confidence) * 30;
      }

      // Pontos por ter claims
      if (result.structuredData.claims && result.structuredData.claims.length > 0) {
        score += Math.min(result.structuredData.claims.length * 5, 20);
      }
    }

    // Pontos por não estar truncado
    if (result.finishReason !== 'length') {
      score += 10;
    }

    // Pontos por tamanho da resposta (mais detalhada = melhor)
    if (result.analysis && result.analysis.length > 100) {
      score += Math.min(result.analysis.length / 100, 10);
    }

    return score;
  }

  /**
   * Combina resultados de ensemble
   * @private
   */
  _combineEnsembleResults(results, originalText) {
    const structuredResults = results
      .filter(r => r.result.structuredData)
      .map(r => r.result.structuredData);

    if (structuredResults.length === 0) {
      // Se nenhum tem dados estruturados, retornar o primeiro resultado
      return results[0].result;
    }

    // Combinar classificações por votação majoritária
    const classifications = structuredResults
      .map(r => r.classification)
      .filter(c => c);

    const classificationCounts = {};
    classifications.forEach(c => {
      classificationCounts[c] = (classificationCounts[c] || 0) + 1;
    });

    const majorityClassification = Object.keys(classificationCounts)
      .sort((a, b) => classificationCounts[b] - classificationCounts[a])[0];

    // Calcular confiança média
    const confidences = structuredResults
      .map(r => this._normalizeConfidence(r.confidence))
      .filter(c => c > 0);

    const averageConfidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0.5;

    // Combinar claims únicos
    const allClaims = [];
    structuredResults.forEach(r => {
      if (r.claims) {
        r.claims.forEach(claim => {
          if (!allClaims.some(existing => existing.text === claim.text)) {
            allClaims.push(claim);
          }
        });
      }
    });

    return {
      success: true,
      originalText: originalText,
      analysis: {
        classification: majorityClassification,
        confidence: averageConfidence,
        claims: allClaims,
        summary: `Análise combinada de ${results.length} modelos`,
        consensus: classifications.length > 1 ? 'ensemble' : 'single_model'
      },
      structuredData: {
        classification: majorityClassification,
        confidence: averageConfidence,
        claims: allClaims
      },
      timestamp: Date.now(),
      source: 'groq_llm_ensemble'
    };
  }
  
  /**
   * Classifica credibilidade de uma afirmação
   * @param {string} claim - Afirmação para classificar
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Classificação de credibilidade
   */
  async classifyCredibility(claim, context = {}) {
    const prompt = this._generateCredibilityPrompt(claim, context);
    
    const result = await this.analyzeForFactCheck(claim, {
      prompt: prompt,
      task: 'credibility_classification',
      maxTokens: 512
    });
    
    if (result.success) {
      return {
        ...result,
        classification: this._parseCredibilityResponse(result.analysis)
      };
    }
    
    return result;
  }
  
  /**
   * Extrai claims verificáveis de um texto
   * @param {string} text - Texto para análise
   * @returns {Promise<Object>} Claims extraídos
   */
  async extractClaims(text) {
    const prompt = this._generateClaimExtractionPrompt(text);
    
    const result = await this.analyzeForFactCheck(text, {
      prompt: prompt,
      task: 'claim_extraction',
      maxTokens: 1024
    });
    
    if (result.success) {
      return {
        ...result,
        claims: this._parseClaimsResponse(result.analysis)
      };
    }
    
    return result;
  }
  
  /**
   * Obtém estatísticas do serviço
   * @returns {Object} Estatísticas de uso
   */
  getStats() {
    const stats = {
      config: {
        apiKeyConfigured: !!this.apiKey,
        defaultModel: this.options.defaultModel,
        modelsAvailable: Object.keys(this.models).length,
        cacheEnabled: this.options.cacheEnabled,
        rateLimitEnabled: this.options.rateLimitEnabled,
        costTrackingEnabled: this.options.costTrackingEnabled
      },
      costs: this.costTracker ? this.costTracker.getStats() : { enabled: false }
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
    
    return stats;
  }
  
  /**
   * Obtém informações sobre modelos disponíveis
   * @returns {Object} Informações dos modelos
   */
  getModelsInfo() {
    return {
      available: this.models,
      default: this.options.defaultModel,
      fallbackOrder: Object.keys(this.models)
        .sort((a, b) => this.models[a].fallbackPriority - this.models[b].fallbackPriority)
    };
  }
  
  /**
   * Reseta estatísticas de custo
   */
  resetCostTracking() {
    if (this.costTracker) {
      return this.costTracker.reset();
    }
    return { reset: false, reason: 'cost_tracking_disabled' };
  }

  /**
   * Obtém recomendações de otimização de custo
   * @returns {Array} Lista de recomendações
   */
  getCostOptimizationRecommendations() {
    if (this.costTracker) {
      return this.costTracker.getOptimizationRecommendations();
    }
    return [];
  }
  
  /**
   * Valida configuração inicial
   * @private
   */
  _validateConfig() {
    if (!this.apiKey) {
      console.warn('Groq API key não configurada. Defina GROQ_API_KEY ou passe apiKey nas opções.');
    }
    
    if (!this.models[this.options.defaultModel]) {
      console.warn(`Modelo padrão '${this.options.defaultModel}' não encontrado. Usando 'mixtral-8x7b-32768'.`);
      this.options.defaultModel = 'mixtral-8x7b-32768';
    }
    
    if (this.options.maxTokens > 4096) {
      console.warn('maxTokens muito alto. Limitando a 4096 para evitar custos excessivos.');
      this.options.maxTokens = 4096;
    }
  }
  
  /**
   * Gera chave de cache
   * @private
   */
  _generateCacheKey(text, options) {
    const key = `${text}_${options.model || this.options.defaultModel}_${options.task || 'fact_check'}`;
    return btoa(encodeURIComponent(key)).substring(0, 32);
  }
  
  /**
   * Faz requisição para a API
   * @private
   */
  async _makeApiRequest(prompt, model, options = {}) {
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em verificação de fatos e análise de informações. Responda sempre em português brasileiro de forma objetiva e estruturada.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || this.options.maxTokens,
      temperature: options.temperature || this.options.temperature,
      stream: false
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  /**
   * Processa resposta da LLM
   * @private
   */
  _processLLMResponse(apiResponse, originalText, model) {
    try {
      const choice = apiResponse.choices?.[0];
      if (!choice) {
        throw new Error('Resposta da API não contém choices');
      }

      const content = choice.message?.content;
      if (!content) {
        throw new Error('Resposta da API não contém conteúdo');
      }

      // Tentar fazer parse do JSON se a resposta parece ser JSON
      let parsedAnalysis = content;
      let structuredData = null;

      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          structuredData = JSON.parse(content);
          parsedAnalysis = this._normalizeStructuredResponse(structuredData);
        } catch (parseError) {
          console.warn('Falha ao fazer parse do JSON da resposta LLM:', parseError.message);
          // Tentar extrair JSON da resposta
          structuredData = this._extractJsonFromResponse(content);
          if (structuredData) {
            parsedAnalysis = this._normalizeStructuredResponse(structuredData);
          }
        }
      }

      return {
        success: true,
        originalText: originalText,
        analysis: parsedAnalysis,
        rawResponse: content,
        structuredData: structuredData,
        model: model,
        usage: apiResponse.usage || {},
        finishReason: choice.finish_reason,
        timestamp: Date.now(),
        source: 'groq_llm'
      };

    } catch (error) {
      throw new Error(`Erro ao processar resposta da LLM: ${error.message}`);
    }
  }

  /**
   * Normaliza resposta estruturada
   * @private
   */
  _normalizeStructuredResponse(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Normalizar campos comuns
    const normalized = {
      classification: data.classificacao_geral || data.classificacao || data.classification,
      confidence: this._normalizeConfidence(data.confianca_geral || data.confianca || data.confidence),
      summary: data.resumo || data.summary || 'Análise não disponível'
    };

    // Normalizar afirmações/claims
    if (data.afirmacoes || data.claims || data.claims_encontrados) {
      normalized.claims = this._normalizeClaims(
        data.afirmacoes || data.claims || data.claims_encontrados
      );
    }

    // Normalizar sinais de desinformação
    if (data.sinais_desinformacao || data.misinformation_signals) {
      normalized.misinformationSignals = this._normalizeMisinformationSignals(
        data.sinais_desinformacao || data.misinformation_signals
      );
    }

    // Normalizar recomendações
    if (data.recomendacoes || data.recommendations) {
      normalized.recommendations = Array.isArray(data.recomendacoes || data.recommendations)
        ? data.recomendacoes || data.recommendations
        : [data.recomendacoes || data.recommendations];
    }

    // Normalizar fatores de credibilidade
    if (data.fatores_positivos || data.positive_factors) {
      normalized.positiveFactors = Array.isArray(data.fatores_positivos || data.positive_factors)
        ? data.fatores_positivos || data.positive_factors
        : [data.fatores_positivos || data.positive_factors];
    }

    if (data.fatores_negativos || data.negative_factors) {
      normalized.negativeFactors = Array.isArray(data.fatores_negativos || data.negative_factors)
        ? data.fatores_negativos || data.negative_factors
        : [data.fatores_negativos || data.negative_factors];
    }

    return normalized;
  }

  /**
   * Normaliza confiança para escala 0-1
   * @private
   */
  _normalizeConfidence(confidence) {
    if (typeof confidence !== 'number') {
      return 0.5; // Padrão
    }

    // Se está em escala 0-100, converter para 0-1
    if (confidence > 1) {
      return Math.min(confidence / 100, 1);
    }

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Normaliza claims
   * @private
   */
  _normalizeClaims(claims) {
    if (!Array.isArray(claims)) {
      return [];
    }

    return claims.map(claim => ({
      text: claim.texto || claim.text || '',
      veracity: this._normalizeVeracity(claim.veracidade || claim.veracity),
      confidence: this._normalizeConfidence(claim.confianca || claim.confidence),
      type: claim.tipo || claim.type || 'general',
      priority: claim.prioridade || claim.priority || 'medium',
      evidence: claim.evidencias_necessarias || claim.evidence_needed || [],
      sources: claim.fontes_recomendadas || claim.recommended_sources || [],
      entities: claim.entidades_envolvidas || claim.entities || [],
      numbers: claim.numeros_valores || claim.numbers || [],
      context: claim.contexto || claim.context || ''
    }));
  }

  /**
   * Normaliza veracidade
   * @private
   */
  _normalizeVeracity(veracity) {
    if (!veracity) return 'unknown';

    const normalized = veracity.toLowerCase();

    const mapping = {
      'verdadeiro': 'true',
      'true': 'true',
      'correto': 'true',
      'falso': 'false',
      'false': 'false',
      'incorreto': 'false',
      'parcialmente_verdadeiro': 'partially_true',
      'partially_true': 'partially_true',
      'parcialmente verdadeiro': 'partially_true',
      'misto': 'mixed',
      'mixed': 'mixed',
      'nao_verificavel': 'unverifiable',
      'não_verificável': 'unverifiable',
      'unverifiable': 'unverifiable',
      'unknown': 'unknown'
    };

    return mapping[normalized] || 'unknown';
  }

  /**
   * Normaliza sinais de desinformação
   * @private
   */
  _normalizeMisinformationSignals(signals) {
    if (!Array.isArray(signals)) {
      return [];
    }

    return signals.map(signal => ({
      type: signal.tipo || signal.type || 'unknown',
      description: signal.descricao || signal.description || '',
      severity: this._normalizeSeverity(signal.severidade || signal.severity),
      confidence: this._normalizeConfidence(signal.confianca || signal.confidence || 0.5)
    }));
  }

  /**
   * Normaliza severidade
   * @private
   */
  _normalizeSeverity(severity) {
    if (!severity) return 'medium';

    const normalized = severity.toLowerCase();
    const mapping = {
      'baixa': 'low',
      'low': 'low',
      'media': 'medium',
      'média': 'medium',
      'medium': 'medium',
      'alta': 'high',
      'high': 'high'
    };

    return mapping[normalized] || 'medium';
  }

  /**
   * Extrai JSON de resposta que pode conter texto adicional
   * @private
   */
  _extractJsonFromResponse(response) {
    try {
      // Procurar por JSON entre chaves
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Procurar por blocos de código JSON
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }

      return null;
    } catch (error) {
      console.warn('Falha ao extrair JSON da resposta:', error.message);
      return null;
    }
  }

  /**
   * Valida e limpa resposta JSON
   * @private
   */
  _validateAndCleanJsonResponse(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Remover campos vazios ou inválidos
    const cleaned = {};

    Object.keys(data).forEach(key => {
      const value = data[key];

      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          // Filtrar arrays vazios
          const filteredArray = value.filter(item =>
            item !== null && item !== undefined && item !== ''
          );
          if (filteredArray.length > 0) {
            cleaned[key] = filteredArray;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });

    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }
  
  /**
   * Gera prompt otimizado para fact-checking
   * @private
   */
  _generateFactCheckPrompt(text, options = {}) {
    const task = options.task || 'fact_check';

    switch (task) {
      case 'fact_check':
        return this._generateMainFactCheckPrompt(text, options);
      case 'credibility_classification':
        return this._generateCredibilityPrompt(text, options);
      case 'claim_extraction':
        return this._generateClaimExtractionPrompt(text);
      default:
        return this._generateMainFactCheckPrompt(text, options);
    }
  }

  /**
   * Prompt principal para fact-checking
   * @private
   */
  _generateMainFactCheckPrompt(text, options = {}) {
    return `Analise o seguinte texto para verificação de fatos:

TEXTO PARA ANÁLISE:
"${text}"

INSTRUÇÕES:
1. Identifique todas as afirmações verificáveis no texto
2. Para cada afirmação, avalie:
   - Veracidade (verdadeiro, falso, parcialmente verdadeiro, não verificável)
   - Nível de confiança (0-100%)
   - Evidências necessárias para verificação
   - Fontes recomendadas para checagem

3. Classifique o texto geral como:
   - VERIFICADO: Informações amplamente corretas
   - DISPUTADO: Informações amplamente incorretas
   - MISTO: Mistura de informações corretas e incorretas
   - NÃO_VERIFICÁVEL: Impossível verificar com fontes disponíveis

4. Identifique sinais de desinformação:
   - Linguagem sensacionalista
   - Apelos emocionais excessivos
   - Falta de fontes credíveis
   - Afirmações extraordinárias sem evidências

FORMATO DE RESPOSTA (JSON):
{
  "classificacao_geral": "VERIFICADO|DISPUTADO|MISTO|NAO_VERIFICAVEL",
  "confianca_geral": 85,
  "afirmacoes": [
    {
      "texto": "afirmação extraída",
      "veracidade": "verdadeiro|falso|parcialmente_verdadeiro|nao_verificavel",
      "confianca": 90,
      "evidencias_necessarias": ["tipo de evidência necessária"],
      "fontes_recomendadas": ["tipos de fontes para verificar"]
    }
  ],
  "sinais_desinformacao": [
    {
      "tipo": "linguagem_sensacionalista|apelo_emocional|falta_fontes|afirmacao_extraordinaria",
      "descricao": "descrição específica do sinal encontrado",
      "severidade": "baixa|media|alta"
    }
  ],
  "recomendacoes": [
    "recomendação específica para verificação"
  ],
  "resumo": "resumo da análise em 2-3 frases"
}

Responda APENAS com o JSON válido, sem texto adicional.`;
  }

  /**
   * Prompt para classificação de credibilidade
   * @private
   */
  _generateCredibilityPrompt(claim, context = {}) {
    const contextInfo = context.source ? `\nFONTE: ${context.source}` : '';
    const contextDate = context.date ? `\nDATA: ${context.date}` : '';

    return `Classifique a credibilidade da seguinte afirmação:

AFIRMAÇÃO:
"${claim}"${contextInfo}${contextDate}

CRITÉRIOS DE AVALIAÇÃO:
1. Plausibilidade científica/factual
2. Consistência com conhecimento estabelecido
3. Presença de evidências ou fontes
4. Linguagem utilizada (objetiva vs sensacionalista)
5. Contexto e timing da afirmação

CLASSIFICAÇÕES POSSÍVEIS:
- ALTA_CREDIBILIDADE: Afirmação muito provável de ser verdadeira
- MEDIA_CREDIBILIDADE: Afirmação plausível mas requer verificação
- BAIXA_CREDIBILIDADE: Afirmação duvidosa ou improvável
- SEM_CREDIBILIDADE: Afirmação claramente falsa ou enganosa

FORMATO DE RESPOSTA (JSON):
{
  "classificacao": "ALTA_CREDIBILIDADE|MEDIA_CREDIBILIDADE|BAIXA_CREDIBILIDADE|SEM_CREDIBILIDADE",
  "confianca": 85,
  "fatores_positivos": ["fatores que aumentam credibilidade"],
  "fatores_negativos": ["fatores que diminuem credibilidade"],
  "verificacao_recomendada": true,
  "fontes_sugeridas": ["tipos de fontes para verificar"],
  "justificativa": "explicação da classificação em 1-2 frases"
}

Responda APENAS com o JSON válido.`;
  }

  /**
   * Prompt para extração de claims
   * @private
   */
  _generateClaimExtractionPrompt(text) {
    return `Extraia todas as afirmações verificáveis do seguinte texto:

TEXTO:
"${text}"

INSTRUÇÕES:
1. Identifique afirmações que podem ser verificadas objetivamente
2. Ignore opiniões, especulações ou declarações subjetivas
3. Foque em:
   - Fatos históricos
   - Dados estatísticos
   - Afirmações científicas
   - Declarações sobre eventos
   - Citações de autoridades

4. Para cada afirmação, determine:
   - Tipo (estatística, evento, declaração, etc.)
   - Prioridade para verificação
   - Dificuldade de verificação

FORMATO DE RESPOSTA (JSON):
{
  "claims_encontrados": [
    {
      "texto": "afirmação extraída exatamente como aparece",
      "tipo": "estatistica|evento|declaracao|citacao|fato_historico|dado_cientifico",
      "prioridade": "alta|media|baixa",
      "dificuldade_verificacao": "facil|media|dificil",
      "entidades_envolvidas": ["pessoas, lugares, organizações mencionadas"],
      "numeros_valores": ["números ou valores específicos mencionados"],
      "contexto": "contexto relevante da afirmação"
    }
  ],
  "resumo": {
    "total_claims": 5,
    "alta_prioridade": 2,
    "verificaveis_facilmente": 3,
    "principais_temas": ["temas principais identificados"]
  }
}

Responda APENAS com o JSON válido.`;
  }

  /**
   * Parsing de resposta de credibilidade
   * @private
   */
  _parseCredibilityResponse(response) {
    try {
      const parsed = JSON.parse(response);

      return {
        classification: parsed.classificacao || 'MEDIA_CREDIBILIDADE',
        confidence: parsed.confianca || 50,
        positiveFactors: parsed.fatores_positivos || [],
        negativeFactors: parsed.fatores_negativos || [],
        verificationRecommended: parsed.verificacao_recomendada !== false,
        suggestedSources: parsed.fontes_sugeridas || [],
        justification: parsed.justificativa || 'Análise não disponível'
      };
    } catch (error) {
      console.error('Erro ao fazer parse da resposta de credibilidade:', error);
      return {
        classification: 'MEDIA_CREDIBILIDADE',
        confidence: 50,
        positiveFactors: [],
        negativeFactors: ['Erro no processamento da resposta'],
        verificationRecommended: true,
        suggestedSources: [],
        justification: 'Erro no processamento da análise'
      };
    }
  }

  /**
   * Parsing de resposta de extração de claims
   * @private
   */
  _parseClaimsResponse(response) {
    try {
      const parsed = JSON.parse(response);

      return {
        claims: parsed.claims_encontrados || [],
        summary: parsed.resumo || {
          total_claims: 0,
          alta_prioridade: 0,
          verificaveis_facilmente: 0,
          principais_temas: []
        }
      };
    } catch (error) {
      console.error('Erro ao fazer parse da resposta de claims:', error);
      return {
        claims: [],
        summary: {
          total_claims: 0,
          alta_prioridade: 0,
          verificaveis_facilmente: 0,
          principais_temas: [],
          error: 'Erro no processamento da resposta'
        }
      };
    }
  }

  /**
   * Tracking de custos
   * @private
   */
  _trackCosts(apiResponse, model, operation = 'fact_check') {
    if (!this.costTracker) return;

    const usage = apiResponse.usage || {};

    if (usage.total_tokens) {
      return this.costTracker.trackUsage(usage, model, operation);
    }

    return { cost: 0, tracked: false };
  }
}

module.exports = GroqLLMService;
