/**
 * HybridAnalyzer - Orquestrador principal do VeritasAI
 * Combina Google Fact Check API, Groq LLM, busca vetorial e análise semântica
 * para fornecer verificação de fatos abrangente e inteligente
 */

const GoogleFactCheckService = require('./google-fact-check-service');
const GroqLLMService = require('./groq-llm-service');
const QdrantClient = require('./qdrant-client');
const EmbeddingService = require('./embedding-service');
const KeywordExtractor = require('../utils/keyword-extractor');
const { ErrorHandler } = require('../utils/error-handler');

/**
 * Classe principal do sistema híbrido de fact-checking
 */
class HybridAnalyzer {
  constructor(options = {}) {
    this.options = {
      // Estratégias de análise
      defaultStrategy: options.defaultStrategy || 'comprehensive',
      fallbackEnabled: options.fallbackEnabled !== false,
      parallelProcessing: options.parallelProcessing !== false,
      
      // Thresholds de confiança
      highConfidenceThreshold: options.highConfidenceThreshold || 0.85,
      mediumConfidenceThreshold: options.mediumConfidenceThreshold || 0.65,
      lowConfidenceThreshold: options.lowConfidenceThreshold || 0.45,
      
      // Performance
      maxProcessingTime: options.maxProcessingTime || 30000,
      cacheEnabled: options.cacheEnabled !== false,
      
      // Pesos para scoring
      googleApiWeight: options.googleApiWeight || 0.4,
      llmAnalysisWeight: options.llmAnalysisWeight || 0.35,
      vectorSearchWeight: options.vectorSearchWeight || 0.25,
      
      ...options
    };
    
    // Inicializar serviços
    this.googleService = new GoogleFactCheckService({
      apiKey: options.googleApiKey,
      cacheEnabled: this.options.cacheEnabled,
      ...options.googleOptions
    });
    
    this.groqService = new GroqLLMService({
      apiKey: options.groqApiKey,
      cacheEnabled: this.options.cacheEnabled,
      costTrackingEnabled: true,
      ...options.groqOptions
    });
    
    this.qdrantClient = new QdrantClient({
      host: options.qdrantHost,
      port: options.qdrantPort,
      apiKey: options.qdrantApiKey,
      ...options.qdrantOptions
    });
    
    this.embeddingService = new EmbeddingService({
      cacheEnabled: this.options.cacheEnabled,
      ...options.embeddingOptions
    });
    
    this.keywordExtractor = new KeywordExtractor({
      maxKeywords: 8,
      language: 'pt',
      ...options.extractorOptions
    });
    
    // Integrar serviços
    this.embeddingService.integrateWithQdrant(this.qdrantClient);
    
    // Error handler
    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableFallbacks: true,
      maxRetries: 2
    });
    
    // Cache unificado
    this.unifiedCache = new Map();
    this.cacheExpiry = options.cacheExpiry || 1800000; // 30 minutos
    
    // Estatísticas
    this.stats = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      averageProcessingTime: 0,
      strategyUsage: {},
      serviceUsage: {
        google: 0,
        groq: 0,
        qdrant: 0,
        embedding: 0
      },
      confidenceDistribution: {
        high: 0,
        medium: 0,
        low: 0,
        uncertain: 0
      },
      startTime: Date.now()
    };
    
    // Validar configuração
    this._validateConfig();
  }
  
  /**
   * Análise híbrida principal
   * @param {string} text - Texto para análise
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Resultado da análise híbrida
   */
  async analyze(text, options = {}) {
    const startTime = Date.now();
    const analysisId = this._generateAnalysisId();
    
    this.stats.totalAnalyses++;
    
    try {
      // Validar entrada
      this.errorHandler.validate(text, {
        required: true,
        type: 'string',
        minLength: 10,
        maxLength: 10000
      }, 'text');
      
      const strategy = options.strategy || this.options.defaultStrategy;
      this._updateStrategyUsage(strategy);
      
      // Verificar cache primeiro
      if (this.options.cacheEnabled) {
        const cached = this._getCachedAnalysis(text, strategy);
        if (cached) {
          return this._enrichResult(cached, analysisId, Date.now() - startTime, true);
        }
      }
      
      // Executar análise baseada na estratégia
      let result;
      
      switch (strategy) {
        case 'fast':
          result = await this._fastAnalysis(text, options);
          break;
        case 'comprehensive':
          result = await this._comprehensiveAnalysis(text, options);
          break;
        case 'deep':
          result = await this._deepAnalysis(text, options);
          break;
        case 'custom':
          result = await this._customAnalysis(text, options);
          break;
        default:
          result = await this._comprehensiveAnalysis(text, options);
      }
      
      // Enriquecer resultado
      const enrichedResult = this._enrichResult(result, analysisId, Date.now() - startTime, false);
      
      // Cache do resultado
      if (this.options.cacheEnabled) {
        this._cacheAnalysis(text, strategy, enrichedResult);
      }
      
      this.stats.successfulAnalyses++;
      this._updateConfidenceDistribution(enrichedResult.overallConfidence);
      
      return enrichedResult;
      
    } catch (error) {
      this.stats.failedAnalyses++;
      
      return {
        success: false,
        analysisId: analysisId,
        error: error.message,
        text: text,
        strategy: strategy,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Análise rápida (Google API + keywords)
   * @private
   */
  async _fastAnalysis(text, options) {
    const results = {
      strategy: 'fast',
      components: {},
      sources: []
    };
    
    try {
      // Extrair keywords
      const keywords = this.keywordExtractor.extractForFactCheck(text);
      results.components.keywords = keywords;
      
      // Google Fact Check API
      this.stats.serviceUsage.google++;
      const googleResult = await this.googleService.checkFacts(keywords, options);
      results.components.google = googleResult;
      
      if (googleResult.success) {
        results.sources.push('google_api');
      }
      
      // Scoring rápido
      const scoring = this._calculateFastScoring(results);
      
      return {
        success: true,
        ...results,
        ...scoring,
        processingComponents: ['keywords', 'google_api'],
        fallbacksUsed: []
      };
      
    } catch (error) {
      throw this._handleError(error, '_fastAnalysis', { text: text.substring(0, 100) });
    }
  }
  
  /**
   * Análise abrangente (Google + LLM + embeddings básicos)
   * @private
   */
  async _comprehensiveAnalysis(text, options) {
    const results = {
      strategy: 'comprehensive',
      components: {},
      sources: [],
      fallbacksUsed: []
    };
    
    try {
      // Executar em paralelo quando possível
      const promises = [];
      
      // 1. Keywords
      const keywords = this.keywordExtractor.extractForFactCheck(text);
      results.components.keywords = keywords;
      
      // 2. Google API
      promises.push(
        this.googleService.checkFacts(keywords, options)
          .then(result => {
            this.stats.serviceUsage.google++;
            results.components.google = result;
            if (result.success) results.sources.push('google_api');
            return result;
          })
          .catch(error => {
            results.components.google = { success: false, error: error.message };
            return null;
          })
      );
      
      // 3. LLM Analysis
      promises.push(
        this.groqService.analyzeWithFallback(text, { task: 'fact_check', ...options })
          .then(result => {
            this.stats.serviceUsage.groq++;
            results.components.llm = result;
            if (result.success) results.sources.push('llm_analysis');
            if (result.fallbackUsed) results.fallbacksUsed.push('llm_fallback');
            return result;
          })
          .catch(error => {
            results.components.llm = { success: false, error: error.message };
            return null;
          })
      );
      
      // 4. Embedding para busca futura
      promises.push(
        this.embeddingService.generateFactCheckEmbedding(text, options)
          .then(result => {
            this.stats.serviceUsage.embedding++;
            results.components.embedding = result;
            if (result.success) results.sources.push('embedding');
            return result;
          })
          .catch(error => {
            results.components.embedding = { success: false, error: error.message };
            return null;
          })
      );
      
      // Aguardar todos os resultados
      await Promise.allSettled(promises);
      
      // Scoring abrangente
      const scoring = this._calculateComprehensiveScoring(results);
      
      return {
        success: true,
        ...results,
        ...scoring,
        processingComponents: ['keywords', 'google_api', 'llm_analysis', 'embedding'],
        parallelProcessing: this.options.parallelProcessing
      };
      
    } catch (error) {
      throw this._handleError(error, '_comprehensiveAnalysis', { text: text.substring(0, 100) });
    }
  }
  
  /**
   * Análise profunda (todos os serviços + busca vetorial)
   * @private
   */
  async _deepAnalysis(text, options) {
    const results = {
      strategy: 'deep',
      components: {},
      sources: [],
      fallbacksUsed: []
    };
    
    try {
      // Primeiro, executar análise abrangente
      const comprehensiveResult = await this._comprehensiveAnalysis(text, options);
      
      // Copiar resultados da análise abrangente
      Object.assign(results, comprehensiveResult);
      results.strategy = 'deep';
      
      // Adicionar busca vetorial se embedding foi gerado
      if (results.components.embedding?.success) {
        try {
          this.stats.serviceUsage.qdrant++;
          
          // Verificar se coleção existe
          const collections = await this.qdrantClient.listCollections();
          const factCheckCollection = collections.find(c => c.name === 'fact_check_embeddings');
          
          if (factCheckCollection) {
            const vectorSearch = await this.embeddingService.searchSimilar(text, {
              collection: 'fact_check_embeddings',
              limit: 5,
              scoreThreshold: 0.7
            });
            
            results.components.vectorSearch = vectorSearch;
            if (vectorSearch.success && vectorSearch.results.length > 0) {
              results.sources.push('vector_search');
            }
          } else {
            results.components.vectorSearch = {
              success: false,
              message: 'Coleção de fact-checking não encontrada'
            };
          }
          
        } catch (error) {
          results.components.vectorSearch = {
            success: false,
            error: error.message
          };
        }
      }
      
      // Scoring profundo
      const scoring = this._calculateDeepScoring(results);
      
      return {
        success: true,
        ...results,
        ...scoring,
        processingComponents: ['keywords', 'google_api', 'llm_analysis', 'embedding', 'vector_search']
      };
      
    } catch (error) {
      throw this._handleError(error, '_deepAnalysis', { text: text.substring(0, 100) });
    }
  }
  
  /**
   * Obtém estatísticas do analisador
   * @returns {Object} Estatísticas completas
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const successRate = this.stats.totalAnalyses > 0 
      ? (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2)
      : 0;
    
    return {
      analyzer: {
        ...this.stats,
        uptime: uptime,
        successRate: `${successRate}%`,
        analysisRate: this.stats.totalAnalyses / (uptime / 1000),
        cacheSize: this.unifiedCache.size
      },
      
      services: {
        google: this.googleService.getStats(),
        groq: this.groqService.getStats(),
        qdrant: this.qdrantClient.getStats(),
        embedding: this.embeddingService.getStats()
      },
      
      config: {
        defaultStrategy: this.options.defaultStrategy,
        fallbackEnabled: this.options.fallbackEnabled,
        parallelProcessing: this.options.parallelProcessing,
        cacheEnabled: this.options.cacheEnabled,
        confidenceThresholds: {
          high: this.options.highConfidenceThreshold,
          medium: this.options.mediumConfidenceThreshold,
          low: this.options.lowConfidenceThreshold
        }
      }
    };
  }
  
  /**
   * Valida configuração inicial
   * @private
   */
  _validateConfig() {
    if (!this.options.googleApiKey && !this.options.groqApiKey) {
      console.warn('Nenhuma API key configurada. Funcionalidade limitada.');
    }

    if (this.options.highConfidenceThreshold <= this.options.mediumConfidenceThreshold) {
      console.warn('Threshold de alta confiança deve ser maior que média confiança.');
    }

    if (this.options.mediumConfidenceThreshold <= this.options.lowConfidenceThreshold) {
      console.warn('Threshold de média confiança deve ser maior que baixa confiança.');
    }
  }

  /**
   * Calcula scoring rápido
   * @private
   */
  _calculateFastScoring(results) {
    let overallScore = 0;
    let overallConfidence = 0;
    let classification = 'uncertain';
    const evidences = [];

    // Scoring baseado apenas no Google API
    if (results.components.google?.success && results.components.google.found) {
      const googleSummary = results.components.google.summary || {};
      const verified = googleSummary.verified || 0;
      const disputed = googleSummary.disputed || 0;
      const total = googleSummary.total || 1;

      if (verified > disputed) {
        overallScore = (verified / total) * 100;
        classification = 'verified';
      } else if (disputed > verified) {
        overallScore = ((total - disputed) / total) * 100;
        classification = 'disputed';
      } else {
        overallScore = 50;
        classification = 'mixed';
      }

      overallConfidence = Math.min(0.8, (total / 5) * 0.8); // Max 80% para análise rápida

      evidences.push({
        source: 'google_api',
        type: 'fact_check_database',
        score: overallScore,
        confidence: overallConfidence,
        details: `${verified} verificados, ${disputed} contestados de ${total} total`
      });
    } else {
      overallScore = 50;
      overallConfidence = 0.3;
      classification = 'no_data';

      evidences.push({
        source: 'google_api',
        type: 'no_results',
        score: 50,
        confidence: 0.3,
        details: 'Nenhum resultado encontrado na base de fact-checking'
      });
    }

    return {
      overallScore: Math.round(overallScore),
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      classification: classification,
      evidences: evidences,
      scoringMethod: 'fast'
    };
  }

  /**
   * Calcula scoring abrangente
   * @private
   */
  _calculateComprehensiveScoring(results) {
    let totalScore = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    let confidenceWeight = 0;
    const evidences = [];
    let classification = 'uncertain';

    // 1. Google API Score
    if (results.components.google?.success && results.components.google.found) {
      const googleSummary = results.components.google.summary || {};
      const verified = googleSummary.verified || 0;
      const disputed = googleSummary.disputed || 0;
      const total = googleSummary.total || 1;

      let googleScore = 50;
      let googleConfidence = 0.6;

      if (verified > disputed) {
        googleScore = 60 + ((verified / total) * 40);
      } else if (disputed > verified) {
        googleScore = 40 - ((disputed / total) * 40);
      }

      googleConfidence = Math.min(0.85, (total / 3) * 0.85);

      totalScore += googleScore * this.options.googleApiWeight;
      totalWeight += this.options.googleApiWeight;
      totalConfidence += googleConfidence * this.options.googleApiWeight;
      confidenceWeight += this.options.googleApiWeight;

      evidences.push({
        source: 'google_api',
        type: 'fact_check_database',
        score: Math.round(googleScore),
        confidence: Math.round(googleConfidence * 100) / 100,
        weight: this.options.googleApiWeight,
        details: `${verified} verificados, ${disputed} contestados de ${total} total`
      });
    }

    // 2. LLM Analysis Score
    if (results.components.llm?.success && results.components.llm.structuredData) {
      const llmData = results.components.llm.structuredData;
      let llmScore = 50;
      let llmConfidence = 0.7;

      // Mapear classificação LLM para score
      const classificationMap = {
        'VERIFICADO': 85,
        'VERDADEIRO': 85,
        'ALTA_CREDIBILIDADE': 80,
        'PROVAVEL': 70,
        'INCERTO': 50,
        'DUVIDOSO': 30,
        'FALSO': 15,
        'CONTESTADO': 15,
        'BAIXA_CREDIBILIDADE': 20
      };

      if (llmData.classificacao_geral || llmData.classification) {
        const classification = llmData.classificacao_geral || llmData.classification;
        llmScore = classificationMap[classification.toUpperCase()] || 50;
      }

      if (llmData.confianca_geral || llmData.confidence) {
        const confidence = llmData.confianca_geral || llmData.confidence;
        llmConfidence = typeof confidence === 'number' ? confidence / 100 : 0.7;
      }

      totalScore += llmScore * this.options.llmAnalysisWeight;
      totalWeight += this.options.llmAnalysisWeight;
      totalConfidence += llmConfidence * this.options.llmAnalysisWeight;
      confidenceWeight += this.options.llmAnalysisWeight;

      evidences.push({
        source: 'llm_analysis',
        type: 'ai_reasoning',
        score: Math.round(llmScore),
        confidence: Math.round(llmConfidence * 100) / 100,
        weight: this.options.llmAnalysisWeight,
        details: `Classificação: ${llmData.classificacao_geral || llmData.classification || 'N/A'}`
      });
    }

    // 3. Embedding/Semantic Score (placeholder para análise futura)
    if (results.components.embedding?.success) {
      const embeddingScore = 50; // Score neutro por enquanto
      const embeddingConfidence = 0.5;

      totalScore += embeddingScore * this.options.vectorSearchWeight;
      totalWeight += this.options.vectorSearchWeight;
      totalConfidence += embeddingConfidence * this.options.vectorSearchWeight;
      confidenceWeight += this.options.vectorSearchWeight;

      evidences.push({
        source: 'semantic_analysis',
        type: 'embedding_ready',
        score: embeddingScore,
        confidence: embeddingConfidence,
        weight: this.options.vectorSearchWeight,
        details: 'Embedding gerado para análise semântica futura'
      });
    }

    // Calcular scores finais
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    const finalConfidence = confidenceWeight > 0 ? totalConfidence / confidenceWeight : 0.5;

    // Determinar classificação final
    if (finalScore >= 75) {
      classification = 'verified';
    } else if (finalScore >= 60) {
      classification = 'likely_true';
    } else if (finalScore >= 40) {
      classification = 'uncertain';
    } else if (finalScore >= 25) {
      classification = 'likely_false';
    } else {
      classification = 'disputed';
    }

    return {
      overallScore: Math.round(finalScore),
      overallConfidence: Math.round(finalConfidence * 100) / 100,
      classification: classification,
      evidences: evidences,
      scoringMethod: 'comprehensive',
      weights: {
        google: this.options.googleApiWeight,
        llm: this.options.llmAnalysisWeight,
        vector: this.options.vectorSearchWeight
      }
    };
  }

  /**
   * Calcula scoring profundo (inclui busca vetorial)
   * @private
   */
  _calculateDeepScoring(results) {
    // Começar com scoring abrangente
    const comprehensiveScoring = this._calculateComprehensiveScoring(results);

    // Adicionar componente de busca vetorial se disponível
    if (results.components.vectorSearch?.success && results.components.vectorSearch.results?.length > 0) {
      const vectorResults = results.components.vectorSearch.results;

      // Calcular score baseado na similaridade dos resultados
      let vectorScore = 50;
      let vectorConfidence = 0.6;

      const avgSimilarity = vectorResults.reduce((sum, result) => sum + result.similarity, 0) / vectorResults.length;
      const maxSimilarity = Math.max(...vectorResults.map(r => r.similarity));

      // Score baseado na similaridade média e máxima
      vectorScore = 30 + (avgSimilarity * 40) + (maxSimilarity * 30);
      vectorConfidence = Math.min(0.8, avgSimilarity * 0.8 + (vectorResults.length / 10) * 0.2);

      // Adicionar evidência de busca vetorial
      comprehensiveScoring.evidences.push({
        source: 'vector_search',
        type: 'semantic_similarity',
        score: Math.round(vectorScore),
        confidence: Math.round(vectorConfidence * 100) / 100,
        weight: this.options.vectorSearchWeight,
        details: `${vectorResults.length} resultados similares encontrados (avg: ${avgSimilarity.toFixed(3)})`
      });

      // Recalcular score final incluindo busca vetorial
      const totalEvidences = comprehensiveScoring.evidences.length;
      const vectorWeight = this.options.vectorSearchWeight;

      const newTotalScore = comprehensiveScoring.overallScore * (1 - vectorWeight) + vectorScore * vectorWeight;
      const newTotalConfidence = comprehensiveScoring.overallConfidence * (1 - vectorWeight) + vectorConfidence * vectorWeight;

      comprehensiveScoring.overallScore = Math.round(newTotalScore);
      comprehensiveScoring.overallConfidence = Math.round(newTotalConfidence * 100) / 100;
      comprehensiveScoring.scoringMethod = 'deep';
    }

    return comprehensiveScoring;
  }

  /**
   * Gera ID único para análise
   * @private
   */
  _generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Atualiza uso de estratégia
   * @private
   */
  _updateStrategyUsage(strategy) {
    if (!this.stats.strategyUsage[strategy]) {
      this.stats.strategyUsage[strategy] = 0;
    }
    this.stats.strategyUsage[strategy]++;
  }

  /**
   * Atualiza distribuição de confiança
   * @private
   */
  _updateConfidenceDistribution(confidence) {
    if (confidence >= this.options.highConfidenceThreshold) {
      this.stats.confidenceDistribution.high++;
    } else if (confidence >= this.options.mediumConfidenceThreshold) {
      this.stats.confidenceDistribution.medium++;
    } else if (confidence >= this.options.lowConfidenceThreshold) {
      this.stats.confidenceDistribution.low++;
    } else {
      this.stats.confidenceDistribution.uncertain++;
    }
  }

  /**
   * Análise customizada com configurações específicas
   * @private
   */
  async _customAnalysis(text, options) {
    const results = {
      strategy: 'custom',
      components: {},
      sources: [],
      fallbacksUsed: []
    };

    const customConfig = options.customConfig || {};

    try {
      // Executar componentes baseados na configuração
      if (customConfig.useKeywords !== false) {
        const keywords = this.keywordExtractor.extractForFactCheck(text);
        results.components.keywords = keywords;
      }

      if (customConfig.useGoogle !== false) {
        try {
          this.stats.serviceUsage.google++;
          const googleResult = await this.googleService.checkFacts(
            results.components.keywords || [],
            options
          );
          results.components.google = googleResult;
          if (googleResult.success) results.sources.push('google_api');
        } catch (error) {
          results.components.google = { success: false, error: error.message };
        }
      }

      if (customConfig.useLLM !== false) {
        try {
          this.stats.serviceUsage.groq++;
          const llmResult = await this.groqService.analyzeWithFallback(text, {
            task: 'fact_check',
            model: customConfig.llmModel,
            ...options
          });
          results.components.llm = llmResult;
          if (llmResult.success) results.sources.push('llm_analysis');
          if (llmResult.fallbackUsed) results.fallbacksUsed.push('llm_fallback');
        } catch (error) {
          results.components.llm = { success: false, error: error.message };
        }
      }

      if (customConfig.useEmbedding !== false) {
        try {
          this.stats.serviceUsage.embedding++;
          const embeddingResult = await this.embeddingService.generateFactCheckEmbedding(text, options);
          results.components.embedding = embeddingResult;
          if (embeddingResult.success) results.sources.push('embedding');
        } catch (error) {
          results.components.embedding = { success: false, error: error.message };
        }
      }

      if (customConfig.useVectorSearch !== false && results.components.embedding?.success) {
        try {
          this.stats.serviceUsage.qdrant++;
          const vectorSearch = await this.embeddingService.searchSimilar(text, {
            collection: customConfig.vectorCollection || 'fact_check_embeddings',
            limit: customConfig.vectorLimit || 5,
            scoreThreshold: customConfig.vectorThreshold || 0.7
          });
          results.components.vectorSearch = vectorSearch;
          if (vectorSearch.success && vectorSearch.results.length > 0) {
            results.sources.push('vector_search');
          }
        } catch (error) {
          results.components.vectorSearch = { success: false, error: error.message };
        }
      }

      // Scoring customizado
      const scoring = customConfig.useDeepScoring
        ? this._calculateDeepScoring(results)
        : this._calculateComprehensiveScoring(results);

      return {
        success: true,
        ...results,
        ...scoring,
        processingComponents: results.sources,
        customConfig: customConfig
      };

    } catch (error) {
      throw this._handleError(error, '_customAnalysis', { text: text.substring(0, 100) });
    }
  }

  /**
   * Obtém análise do cache
   * @private
   */
  _getCachedAnalysis(text, strategy) {
    const key = this._getCacheKey(text, strategy);
    const cached = this.unifiedCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }

    // Remover entrada expirada
    if (cached) {
      this.unifiedCache.delete(key);
    }

    return null;
  }

  /**
   * Armazena análise no cache
   * @private
   */
  _cacheAnalysis(text, strategy, result) {
    const key = this._getCacheKey(text, strategy);

    this.unifiedCache.set(key, {
      result: result,
      timestamp: Date.now(),
      strategy: strategy
    });

    // Limpar cache se muito grande (máximo 500 entradas)
    if (this.unifiedCache.size > 500) {
      const oldestKey = this.unifiedCache.keys().next().value;
      this.unifiedCache.delete(oldestKey);
    }
  }

  /**
   * Gera chave de cache
   * @private
   */
  _getCacheKey(text, strategy) {
    const textHash = this._simpleHash(text);
    return `${strategy}:${textHash}`;
  }

  /**
   * Hash simples para cache
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit
    }
    return hash.toString(36);
  }

  /**
   * Enriquece resultado final
   * @private
   */
  _enrichResult(result, analysisId, processingTime, cached) {
    return {
      ...result,
      analysisId: analysisId,
      processingTime: processingTime,
      cached: cached,
      timestamp: Date.now(),
      version: '1.0',

      // Metadados de confiança
      confidenceLevel: this._getConfidenceLevel(result.overallConfidence),

      // Recomendações baseadas no resultado
      recommendations: this._generateRecommendations(result),

      // Resumo executivo
      summary: this._generateSummary(result),

      // Próximos passos sugeridos
      nextSteps: this._generateNextSteps(result)
    };
  }

  /**
   * Determina nível de confiança
   * @private
   */
  _getConfidenceLevel(confidence) {
    if (confidence >= this.options.highConfidenceThreshold) {
      return 'high';
    } else if (confidence >= this.options.mediumConfidenceThreshold) {
      return 'medium';
    } else if (confidence >= this.options.lowConfidenceThreshold) {
      return 'low';
    } else {
      return 'very_low';
    }
  }

  /**
   * Gera recomendações baseadas no resultado
   * @private
   */
  _generateRecommendations(result) {
    const recommendations = [];

    // Recomendações baseadas na confiança
    if (result.overallConfidence < this.options.mediumConfidenceThreshold) {
      recommendations.push({
        type: 'verification',
        priority: 'high',
        message: 'Recomenda-se verificação adicional com fontes primárias',
        action: 'seek_primary_sources'
      });
    }

    // Recomendações baseadas na classificação
    if (result.classification === 'disputed' || result.classification === 'likely_false') {
      recommendations.push({
        type: 'caution',
        priority: 'high',
        message: 'Informação contestada ou potencialmente falsa',
        action: 'exercise_caution'
      });
    }

    // Recomendações baseadas nas fontes
    const sourcesCount = result.sources?.length || 0;
    if (sourcesCount < 2) {
      recommendations.push({
        type: 'sources',
        priority: 'medium',
        message: 'Poucas fontes consultadas, considere análise mais profunda',
        action: 'deep_analysis'
      });
    }

    // Recomendações baseadas em fallbacks
    if (result.fallbacksUsed?.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'low',
        message: 'Alguns serviços usaram fallbacks, resultado pode ter menor precisão',
        action: 'retry_later'
      });
    }

    return recommendations;
  }

  /**
   * Gera resumo executivo
   * @private
   */
  _generateSummary(result) {
    const confidence = result.overallConfidence || 0;
    const score = result.overallScore || 50;
    const classification = result.classification || 'uncertain';

    let summary = '';

    switch (classification) {
      case 'verified':
        summary = `Informação verificada com ${Math.round(confidence * 100)}% de confiança.`;
        break;
      case 'likely_true':
        summary = `Informação provavelmente verdadeira (score: ${score}/100).`;
        break;
      case 'uncertain':
        summary = `Informação incerta, requer verificação adicional.`;
        break;
      case 'likely_false':
        summary = `Informação provavelmente falsa (score: ${score}/100).`;
        break;
      case 'disputed':
        summary = `Informação contestada ou refutada.`;
        break;
      default:
        summary = `Análise inconclusiva, dados insuficientes.`;
    }

    return {
      text: summary,
      confidence: confidence,
      score: score,
      classification: classification,
      sourcesConsulted: result.sources?.length || 0
    };
  }

  /**
   * Gera próximos passos sugeridos
   * @private
   */
  _generateNextSteps(result) {
    const steps = [];

    if (result.strategy === 'fast') {
      steps.push({
        action: 'comprehensive_analysis',
        description: 'Executar análise abrangente para maior precisão',
        priority: 'medium'
      });
    }

    if (result.strategy === 'comprehensive' && !result.components.vectorSearch) {
      steps.push({
        action: 'deep_analysis',
        description: 'Executar análise profunda com busca vetorial',
        priority: 'low'
      });
    }

    if (result.overallConfidence < this.options.mediumConfidenceThreshold) {
      steps.push({
        action: 'manual_verification',
        description: 'Verificação manual com especialistas',
        priority: 'high'
      });
    }

    if (!result.components.embedding?.success) {
      steps.push({
        action: 'store_embedding',
        description: 'Armazenar embedding para análises futuras',
        priority: 'low'
      });
    }

    return steps;
  }

  /**
   * Limpa cache unificado
   */
  clearCache() {
    this.unifiedCache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, value] of this.unifiedCache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.unifiedCache.size,
      expiredEntries: expiredCount,
      validEntries: this.unifiedCache.size - expiredCount,
      cacheExpiry: this.cacheExpiry,
      hitRate: 'N/A' // Seria necessário tracking adicional
    };
  }

  /**
   * Gera relatório detalhado de análise
   * @param {Object} analysisResult - Resultado da análise
   * @param {Object} options - Opções do relatório
   * @returns {Object} Relatório formatado
   */
  generateDetailedReport(analysisResult, options = {}) {
    const format = options.format || 'detailed';
    const includeRawData = options.includeRawData || false;

    const report = {
      metadata: {
        reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        generatedAt: new Date().toISOString(),
        analysisId: analysisResult.analysisId,
        format: format,
        version: '1.0'
      },

      executive: {
        summary: analysisResult.summary,
        classification: analysisResult.classification,
        confidence: {
          score: analysisResult.overallConfidence,
          level: analysisResult.confidenceLevel,
          interpretation: this._interpretConfidence(analysisResult.overallConfidence)
        },
        verdict: this._generateVerdict(analysisResult)
      },

      analysis: {
        strategy: analysisResult.strategy,
        processingTime: analysisResult.processingTime,
        sourcesConsulted: analysisResult.sources || [],
        componentsUsed: analysisResult.processingComponents || [],
        fallbacksUsed: analysisResult.fallbacksUsed || []
      },

      evidence: {
        summary: {
          totalEvidences: analysisResult.evidences?.length || 0,
          strongEvidence: analysisResult.evidences?.filter(e => e.confidence > 0.7).length || 0,
          weakEvidence: analysisResult.evidences?.filter(e => e.confidence <= 0.5).length || 0
        },
        details: analysisResult.evidences || []
      },

      recommendations: {
        immediate: analysisResult.recommendations?.filter(r => r.priority === 'high') || [],
        suggested: analysisResult.recommendations?.filter(r => r.priority === 'medium') || [],
        optional: analysisResult.recommendations?.filter(r => r.priority === 'low') || []
      },

      nextSteps: analysisResult.nextSteps || [],

      technical: {
        servicesStatus: this._getServicesStatus(analysisResult),
        performance: {
          processingTime: analysisResult.processingTime,
          cached: analysisResult.cached,
          parallelProcessing: analysisResult.parallelProcessing
        },
        reliability: this._assessReliability(analysisResult)
      }
    };

    // Incluir dados brutos se solicitado
    if (includeRawData) {
      report.rawData = {
        googleApi: analysisResult.components?.google,
        llmAnalysis: analysisResult.components?.llm,
        vectorSearch: analysisResult.components?.vectorSearch,
        embedding: analysisResult.components?.embedding
      };
    }

    // Formatação específica
    if (format === 'summary') {
      return this._generateSummaryReport(report);
    } else if (format === 'technical') {
      return this._generateTechnicalReport(report);
    }

    return report;
  }

  /**
   * Gera relatório resumido
   * @private
   */
  _generateSummaryReport(fullReport) {
    return {
      metadata: fullReport.metadata,
      summary: fullReport.executive.summary.text,
      confidence: fullReport.executive.confidence.level,
      verdict: fullReport.executive.verdict,
      keyRecommendations: fullReport.recommendations.immediate.slice(0, 3),
      processingTime: fullReport.technical.performance.processingTime
    };
  }

  /**
   * Gera relatório técnico
   * @private
   */
  _generateTechnicalReport(fullReport) {
    return {
      metadata: fullReport.metadata,
      technical: fullReport.technical,
      analysis: fullReport.analysis,
      evidence: fullReport.evidence,
      performance: {
        ...fullReport.technical.performance,
        servicesUsed: fullReport.analysis.sourcesConsulted.length,
        fallbacksRequired: fullReport.analysis.fallbacksUsed.length
      }
    };
  }

  /**
   * Interpreta nível de confiança
   * @private
   */
  _interpretConfidence(confidence) {
    if (confidence >= 0.9) {
      return 'Muito alta confiança - resultado altamente confiável';
    } else if (confidence >= 0.8) {
      return 'Alta confiança - resultado confiável';
    } else if (confidence >= 0.65) {
      return 'Confiança moderada - resultado razoavelmente confiável';
    } else if (confidence >= 0.45) {
      return 'Baixa confiança - resultado incerto, verificação recomendada';
    } else {
      return 'Muito baixa confiança - resultado não confiável';
    }
  }

  /**
   * Gera veredicto final
   * @private
   */
  _generateVerdict(result) {
    const classification = result.classification;
    const confidence = result.overallConfidence;
    const score = result.overallScore;

    let verdict = '';
    let action = '';

    switch (classification) {
      case 'verified':
        verdict = 'VERIFICADO';
        action = confidence > 0.8 ? 'Pode ser considerado confiável' : 'Verificado, mas requer atenção';
        break;
      case 'likely_true':
        verdict = 'PROVAVELMENTE VERDADEIRO';
        action = 'Provavelmente correto, mas verificação adicional recomendada';
        break;
      case 'uncertain':
        verdict = 'INCERTO';
        action = 'Requer verificação adicional antes de usar';
        break;
      case 'likely_false':
        verdict = 'PROVAVELMENTE FALSO';
        action = 'Evitar usar, buscar fontes alternativas';
        break;
      case 'disputed':
        verdict = 'CONTESTADO';
        action = 'Não usar - informação refutada ou altamente questionável';
        break;
      default:
        verdict = 'INDETERMINADO';
        action = 'Dados insuficientes para determinação';
    }

    return {
      classification: verdict,
      action: action,
      score: score,
      confidence: Math.round(confidence * 100)
    };
  }

  /**
   * Obtém status dos serviços
   * @private
   */
  _getServicesStatus(result) {
    const status = {};

    if (result.components?.google) {
      status.googleApi = {
        used: true,
        success: result.components.google.success,
        found: result.components.google.found || false,
        resultsCount: result.components.google.claims?.length || 0
      };
    }

    if (result.components?.llm) {
      status.llmAnalysis = {
        used: true,
        success: result.components.llm.success,
        model: result.components.llm.model || result.components.llm.modelUsed,
        fallbackUsed: result.components.llm.fallbackUsed || false
      };
    }

    if (result.components?.embedding) {
      status.embeddingService = {
        used: true,
        success: result.components.embedding.success,
        dimensions: result.components.embedding.dimensions,
        model: result.components.embedding.model
      };
    }

    if (result.components?.vectorSearch) {
      status.vectorSearch = {
        used: true,
        success: result.components.vectorSearch.success,
        resultsFound: result.components.vectorSearch.results?.length || 0,
        collection: result.components.vectorSearch.collection
      };
    }

    return status;
  }

  /**
   * Avalia confiabilidade da análise
   * @private
   */
  _assessReliability(result) {
    let reliabilityScore = 100;
    const issues = [];

    // Penalizar por fallbacks usados
    if (result.fallbacksUsed?.length > 0) {
      reliabilityScore -= result.fallbacksUsed.length * 10;
      issues.push(`${result.fallbacksUsed.length} fallback(s) usado(s)`);
    }

    // Penalizar por poucos serviços consultados
    const servicesUsed = result.sources?.length || 0;
    if (servicesUsed < 2) {
      reliabilityScore -= 20;
      issues.push('Poucos serviços consultados');
    }

    // Penalizar por baixa confiança
    if (result.overallConfidence < 0.6) {
      reliabilityScore -= 15;
      issues.push('Baixa confiança geral');
    }

    // Penalizar por falhas em serviços
    const failedServices = [];
    if (result.components?.google && !result.components.google.success) {
      failedServices.push('Google API');
    }
    if (result.components?.llm && !result.components.llm.success) {
      failedServices.push('LLM');
    }
    if (result.components?.vectorSearch && !result.components.vectorSearch.success) {
      failedServices.push('Vector Search');
    }

    if (failedServices.length > 0) {
      reliabilityScore -= failedServices.length * 15;
      issues.push(`Falhas em: ${failedServices.join(', ')}`);
    }

    reliabilityScore = Math.max(0, reliabilityScore);

    let level = 'high';
    if (reliabilityScore < 70) level = 'medium';
    if (reliabilityScore < 50) level = 'low';
    if (reliabilityScore < 30) level = 'very_low';

    return {
      score: reliabilityScore,
      level: level,
      issues: issues,
      interpretation: this._interpretReliability(reliabilityScore)
    };
  }

  /**
   * Interpreta score de confiabilidade
   * @private
   */
  _interpretReliability(score) {
    if (score >= 90) {
      return 'Análise muito confiável - todos os serviços funcionaram corretamente';
    } else if (score >= 70) {
      return 'Análise confiável - pequenos problemas detectados';
    } else if (score >= 50) {
      return 'Análise moderadamente confiável - alguns problemas significativos';
    } else if (score >= 30) {
      return 'Análise pouco confiável - vários problemas detectados';
    } else {
      return 'Análise não confiável - muitos problemas críticos';
    }
  }

  /**
   * Trata erros
   * @private
   */
  _handleError(error, operation, context = {}) {
    console.error(`Erro na operação ${operation}:`, error.message);
    return new Error(`HybridAnalyzer ${operation} falhou: ${error.message}`);
  }
}

module.exports = HybridAnalyzer;
