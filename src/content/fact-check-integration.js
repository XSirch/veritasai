/**
 * FactCheckIntegration - Integração do content script com APIs de fact-checking
 * Conecta o content script com o sistema híbrido de verificação de fatos
 */

class FactCheckIntegration {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 15000,
      retryAttempts: options.retryAttempts || 2,
      cacheEnabled: options.cacheEnabled !== false,
      strategy: options.strategy || 'hybrid',
      ...options
    };

    this.cache = new Map();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Verifica fatos usando o sistema híbrido
   * @param {string} text - Texto para verificar
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Resultado da verificação
   */
  async verifyFacts(text, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Iniciando verificação de fatos:', text.substring(0, 100) + '...');
      
      // Validar entrada
      if (!text || typeof text !== 'string' || text.trim().length < 10) {
        throw new Error('Texto deve ter pelo menos 10 caracteres');
      }

      // Verificar cache primeiro
      const cacheKey = this._generateCacheKey(text, options);
      if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
        this.stats.cacheHits++;
        console.log('📋 Resultado encontrado no cache');
        return {
          ...this.cache.get(cacheKey),
          cached: true,
          responseTime: Date.now() - startTime
        };
      }

      // Preparar dados para envio
      const requestData = {
        text: text.trim(),
        strategy: options.strategy || this.options.strategy,
        options: {
          maxResults: options.maxResults || 5,
          languageCode: options.languageCode || 'pt-BR',
          includeVectorSearch: options.includeVectorSearch !== false,
          includeLLMAnalysis: options.includeLLMAnalysis !== false,
          confidenceThreshold: options.confidenceThreshold || 0.6,
          ...options
        }
      };

      // Fazer requisição para background script
      const result = await this._sendToBackground('verifyFacts', requestData);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha na verificação');
      }

      // Processar resultado
      const processedResult = this._processResult(result.data, text);
      
      // Salvar no cache
      if (this.options.cacheEnabled && processedResult.success) {
        this.cache.set(cacheKey, processedResult);
        
        // Limpar cache antigo (máximo 100 entradas)
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      // Atualizar estatísticas
      this.stats.totalRequests++;
      this.stats.successfulRequests++;
      this._updateAverageResponseTime(Date.now() - startTime);

      console.log('✅ Verificação concluída:', processedResult.classification);
      
      return {
        ...processedResult,
        cached: false,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      this.stats.totalRequests++;
      this.stats.failedRequests++;
      
      console.error('❌ Erro na verificação:', error);
      
      // Retornar resultado de fallback
      return this._createFallbackResult(text, error.message);
    }
  }

  /**
   * Envia mensagem para background script
   * @private
   */
  async _sendToBackground(action, data) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na comunicação com background script'));
      }, this.options.timeout);

      chrome.runtime.sendMessage({
        action: action,
        data: data,
        timestamp: Date.now()
      }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          reject(new Error('Resposta vazia do background script'));
          return;
        }
        
        resolve(response);
      });
    });
  }

  /**
   * Processa resultado da API
   * @private
   */
  _processResult(data, originalText) {
    if (!data) {
      throw new Error('Dados de resposta inválidos');
    }

    // Determinar classificação baseada nos resultados
    const classification = this._determineClassification(data);
    const confidence = this._calculateConfidence(data);
    const sources = this._extractSources(data);
    const summary = this._generateSummary(data, classification);

    return {
      success: true,
      classification: classification,
      confidence: confidence,
      sources: sources,
      summary: summary,
      originalText: originalText,
      details: {
        googleResults: data.googleResults || null,
        llmAnalysis: data.llmAnalysis || null,
        vectorSearchResults: data.vectorSearchResults || null,
        strategy: data.strategy || 'unknown',
        processingTime: data.processingTime || 0
      },
      timestamp: Date.now()
    };
  }

  /**
   * Determina classificação baseada nos resultados
   * @private
   */
  _determineClassification(data) {
    // Lógica de classificação baseada nos diferentes serviços
    const googleScore = this._getGoogleScore(data.googleResults);
    const llmScore = this._getLLMScore(data.llmAnalysis);
    const vectorScore = this._getVectorScore(data.vectorSearchResults);

    // Pesos para cada fonte
    const weights = {
      google: 0.4,
      llm: 0.35,
      vector: 0.25
    };

    const finalScore = (
      googleScore * weights.google +
      llmScore * weights.llm +
      vectorScore * weights.vector
    );

    // Classificar baseado no score final
    if (finalScore >= 0.8) return 'confiável';
    if (finalScore >= 0.6) return 'provável';
    if (finalScore >= 0.4) return 'inconclusiva';
    if (finalScore >= 0.2) return 'duvidosa';
    return 'sem fundamento';
  }

  /**
   * Calcula confiança do resultado
   * @private
   */
  _calculateConfidence(data) {
    let confidence = 0.5; // Base
    
    // Aumentar confiança baseado na quantidade de fontes
    if (data.googleResults?.found) confidence += 0.2;
    if (data.llmAnalysis?.confidence > 0.7) confidence += 0.2;
    if (data.vectorSearchResults?.matches?.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Extrai fontes dos resultados
   * @private
   */
  _extractSources(data) {
    const sources = [];
    
    if (data.googleResults?.claims) {
      data.googleResults.claims.forEach(claim => {
        if (claim.claimReview?.[0]?.publisher?.name) {
          sources.push(claim.claimReview[0].publisher.name);
        }
      });
    }
    
    if (data.vectorSearchResults?.matches) {
      data.vectorSearchResults.matches.forEach(match => {
        if (match.payload?.source) {
          sources.push(match.payload.source);
        }
      });
    }
    
    if (sources.length === 0) {
      sources.push('Análise IA');
    }
    
    return [...new Set(sources)]; // Remove duplicatas
  }

  /**
   * Gera resumo do resultado
   * @private
   */
  _generateSummary(data, classification) {
    if (data.llmAnalysis?.summary) {
      return data.llmAnalysis.summary;
    }
    
    if (data.googleResults?.claims?.[0]?.claimReview?.[0]?.textualRating) {
      return `Classificado como: ${data.googleResults.claims[0].claimReview[0].textualRating}`;
    }
    
    // Resumo padrão baseado na classificação
    const summaries = {
      'confiável': 'Informação verificada e considerada confiável por múltiplas fontes.',
      'provável': 'Informação provavelmente verdadeira, mas requer verificação adicional.',
      'inconclusiva': 'Não foi possível determinar a veracidade com certeza.',
      'duvidosa': 'Informação questionável, recomenda-se cautela.',
      'sem fundamento': 'Informação não verificada ou potencialmente falsa.'
    };
    
    return summaries[classification] || 'Análise concluída.';
  }

  /**
   * Cria resultado de fallback em caso de erro
   * @private
   */
  _createFallbackResult(text, errorMessage) {
    return {
      success: false,
      classification: 'erro',
      confidence: 0.0,
      sources: ['Sistema'],
      summary: `Erro na verificação: ${errorMessage}. Tente novamente.`,
      originalText: text,
      error: errorMessage,
      timestamp: Date.now(),
      fallback: true
    };
  }

  /**
   * Gera chave de cache
   * @private
   */
  _generateCacheKey(text, options) {
    const key = text.trim().toLowerCase() + JSON.stringify(options);
    return btoa(key).substring(0, 32); // Base64 truncado
  }

  /**
   * Atualiza tempo médio de resposta
   * @private
   */
  _updateAverageResponseTime(responseTime) {
    const total = this.stats.averageResponseTime * (this.stats.successfulRequests - 1);
    this.stats.averageResponseTime = (total + responseTime) / this.stats.successfulRequests;
  }

  /**
   * Calcula score do Google
   * @private
   */
  _getGoogleScore(googleResults) {
    if (!googleResults?.found || !googleResults.claims?.length) return 0.3;
    
    // Analisar ratings dos fact-checkers
    let totalScore = 0;
    let count = 0;
    
    googleResults.claims.forEach(claim => {
      if (claim.claimReview?.[0]?.textualRating) {
        const rating = claim.claimReview[0].textualRating.toLowerCase();
        if (rating.includes('true') || rating.includes('verdadeiro')) totalScore += 1.0;
        else if (rating.includes('false') || rating.includes('falso')) totalScore += 0.0;
        else if (rating.includes('partly') || rating.includes('parcial')) totalScore += 0.5;
        else totalScore += 0.3;
        count++;
      }
    });
    
    return count > 0 ? totalScore / count : 0.3;
  }

  /**
   * Calcula score do LLM
   * @private
   */
  _getLLMScore(llmAnalysis) {
    if (!llmAnalysis?.confidence) return 0.5;
    return llmAnalysis.confidence;
  }

  /**
   * Calcula score da busca vetorial
   * @private
   */
  _getVectorScore(vectorResults) {
    if (!vectorResults?.matches?.length) return 0.4;
    
    // Média dos scores dos matches mais relevantes
    const topMatches = vectorResults.matches.slice(0, 3);
    const avgScore = topMatches.reduce((sum, match) => sum + (match.score || 0), 0) / topMatches.length;
    
    return avgScore;
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0
    };
  }

  /**
   * Limpa cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache de fact-checking limpo');
  }
}

// Exportar para uso no content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FactCheckIntegration;
} else {
  window.FactCheckIntegration = FactCheckIntegration;
}
