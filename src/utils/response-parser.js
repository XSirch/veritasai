/**
 * ResponseParser - Parser avançado para respostas de APIs de fact-checking
 * Normaliza e enriquece respostas de diferentes provedores
 */

/**
 * Classe principal para parsing de respostas
 */
class ResponseParser {
  constructor(options = {}) {
    this.options = {
      includeMetadata: options.includeMetadata !== false,
      normalizeRatings: options.normalizeRatings !== false,
      calculateConfidence: options.calculateConfidence !== false,
      enrichWithContext: options.enrichWithContext !== false,
      ...options
    };
    
    // Mapeamento de ratings para scores normalizados
    this.ratingMap = {
      // Inglês
      'true': { score: 0.95, category: 'verified' },
      'mostly true': { score: 0.8, category: 'mostly_verified' },
      'half true': { score: 0.5, category: 'mixed' },
      'mixture': { score: 0.5, category: 'mixed' },
      'mostly false': { score: 0.2, category: 'mostly_disputed' },
      'false': { score: 0.05, category: 'disputed' },
      'pants on fire': { score: 0.01, category: 'disputed' },
      'unsubstantiated': { score: 0.3, category: 'unverified' },
      'no evidence': { score: 0.1, category: 'unverified' },
      
      // Português
      'verdadeiro': { score: 0.95, category: 'verified' },
      'verdade': { score: 0.95, category: 'verified' },
      'correto': { score: 0.9, category: 'verified' },
      'parcialmente verdadeiro': { score: 0.6, category: 'mixed' },
      'parcialmente correto': { score: 0.6, category: 'mixed' },
      'impreciso': { score: 0.4, category: 'mixed' },
      'enganoso': { score: 0.3, category: 'mostly_disputed' },
      'falso': { score: 0.05, category: 'disputed' },
      'incorreto': { score: 0.1, category: 'disputed' },
      'sem evidência': { score: 0.2, category: 'unverified' },
      'não verificado': { score: 0.3, category: 'unverified' },
      
      // Outros idiomas comuns
      'verdadero': { score: 0.95, category: 'verified' }, // Espanhol
      'falso': { score: 0.05, category: 'disputed' }, // Espanhol
      'vrai': { score: 0.95, category: 'verified' }, // Francês
      'faux': { score: 0.05, category: 'disputed' } // Francês
    };
  }
  
  /**
   * Processa resposta da Google Fact Check API
   * @param {Object} apiResponse - Resposta bruta da API
   * @param {string} originalQuery - Query original
   * @returns {Object} Resposta processada e normalizada
   */
  parseGoogleFactCheck(apiResponse, originalQuery) {
    try {
      const claims = apiResponse.claims || [];
      
      if (claims.length === 0) {
        return this._createEmptyResponse(originalQuery, 'google_fact_check');
      }
      
      // Processar cada claim
      const processedClaims = claims.map(claim => this._processGoogleClaim(claim));
      
      // Gerar análise agregada
      const analysis = this._generateAnalysis(processedClaims);
      
      // Gerar recomendações
      const recommendations = this._generateRecommendations(processedClaims, analysis);
      
      return {
        success: true,
        found: true,
        query: originalQuery,
        claims: processedClaims,
        analysis: analysis,
        recommendations: recommendations,
        metadata: this._generateMetadata(apiResponse, processedClaims),
        timestamp: Date.now(),
        source: 'google_fact_check',
        version: '1.0'
      };
      
    } catch (error) {
      return this._createErrorResponse(error, originalQuery, 'google_fact_check');
    }
  }
  
  /**
   * Processa um claim individual do Google
   * @private
   */
  _processGoogleClaim(claim) {
    const claimReview = claim.claimReview?.[0] || {};
    const rating = this._normalizeRating(claimReview.textualRating);
    
    const processed = {
      // Informações básicas
      text: claim.text || '',
      claimant: claim.claimant || 'Não informado',
      claimDate: this._parseDate(claim.claimDate),
      
      // Informações da revisão
      review: {
        publisher: {
          name: claimReview.publisher?.name || 'Não informado',
          site: claimReview.publisher?.site || null,
          favicon: claimReview.publisher?.site ? `https://www.google.com/s2/favicons?domain=${claimReview.publisher.site}` : null
        },
        url: claimReview.url || null,
        title: claimReview.title || '',
        reviewDate: this._parseDate(claimReview.reviewDate),
        languageCode: claimReview.languageCode || 'pt'
      },
      
      // Rating normalizado
      rating: {
        original: claimReview.textualRating || 'Não avaliado',
        normalized: rating.category,
        score: rating.score,
        confidence: this._calculateRatingConfidence(claimReview)
      },
      
      // Metadados adicionais
      metadata: {
        hasImage: !!claim.image,
        hasVideo: !!claim.video,
        claimLength: (claim.text || '').length,
        reviewQuality: this._assessReviewQuality(claimReview)
      }
    };
    
    // Enriquecer com contexto se habilitado
    if (this.options.enrichWithContext) {
      processed.context = this._enrichWithContext(processed);
    }
    
    return processed;
  }
  
  /**
   * Normaliza rating textual para score numérico
   * @private
   */
  _normalizeRating(textualRating) {
    if (!textualRating) {
      return { score: 0.5, category: 'unverified' };
    }
    
    const normalized = textualRating.toLowerCase().trim();
    
    // Busca exata primeiro
    if (this.ratingMap[normalized]) {
      return this.ratingMap[normalized];
    }
    
    // Busca por palavras-chave
    for (const [key, value] of Object.entries(this.ratingMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // Análise heurística
    if (normalized.includes('verdad') || normalized.includes('true') || normalized.includes('correto')) {
      return { score: 0.8, category: 'mostly_verified' };
    }
    
    if (normalized.includes('fals') || normalized.includes('incorret') || normalized.includes('engan')) {
      return { score: 0.2, category: 'mostly_disputed' };
    }
    
    if (normalized.includes('parcial') || normalized.includes('mix') || normalized.includes('half')) {
      return { score: 0.5, category: 'mixed' };
    }
    
    // Padrão para ratings desconhecidos
    return { score: 0.5, category: 'unverified' };
  }
  
  /**
   * Calcula confiança do rating
   * @private
   */
  _calculateRatingConfidence(claimReview) {
    let confidence = 0.5;
    
    // Fatores que aumentam confiança
    if (claimReview.publisher?.name) confidence += 0.1;
    if (claimReview.url) confidence += 0.1;
    if (claimReview.reviewDate) confidence += 0.1;
    if (claimReview.title && claimReview.title.length > 10) confidence += 0.1;
    
    // Publisher conhecido aumenta confiança
    const knownPublishers = [
      'snopes', 'politifact', 'factcheck.org', 'reuters', 'ap news',
      'aos fatos', 'agência lupa', 'comprova', 'fato ou fake'
    ];
    
    const publisherName = (claimReview.publisher?.name || '').toLowerCase();
    if (knownPublishers.some(known => publisherName.includes(known))) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * Avalia qualidade da revisão
   * @private
   */
  _assessReviewQuality(claimReview) {
    let score = 0;
    const factors = [];
    
    // Presença de informações básicas
    if (claimReview.publisher?.name) {
      score += 20;
      factors.push('publisher_identified');
    }
    
    if (claimReview.url) {
      score += 20;
      factors.push('source_url_provided');
    }
    
    if (claimReview.reviewDate) {
      score += 15;
      factors.push('review_date_provided');
    }
    
    if (claimReview.title && claimReview.title.length > 20) {
      score += 15;
      factors.push('detailed_title');
    }
    
    // Qualidade do rating
    if (claimReview.textualRating && claimReview.textualRating.length > 5) {
      score += 10;
      factors.push('detailed_rating');
    }
    
    // Recência da revisão
    if (claimReview.reviewDate) {
      const reviewDate = new Date(claimReview.reviewDate);
      const daysSinceReview = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceReview < 30) {
        score += 20;
        factors.push('recent_review');
      } else if (daysSinceReview < 365) {
        score += 10;
        factors.push('moderately_recent');
      }
    }
    
    return {
      score: Math.min(100, score),
      level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
      factors: factors
    };
  }
  
  /**
   * Gera análise agregada dos claims
   * @private
   */
  _generateAnalysis(claims) {
    const total = claims.length;
    const categories = {
      verified: 0,
      mostly_verified: 0,
      mixed: 0,
      mostly_disputed: 0,
      disputed: 0,
      unverified: 0
    };
    
    let totalScore = 0;
    let totalConfidence = 0;
    const publishers = new Set();
    const languages = new Set();
    
    claims.forEach(claim => {
      categories[claim.rating.normalized]++;
      totalScore += claim.rating.score;
      totalConfidence += claim.rating.confidence;
      
      if (claim.review.publisher.name !== 'Não informado') {
        publishers.add(claim.review.publisher.name);
      }
      
      languages.add(claim.review.languageCode);
    });
    
    const averageScore = total > 0 ? totalScore / total : 0;
    const averageConfidence = total > 0 ? totalConfidence / total : 0;
    
    // Determinar consenso
    let consensus = 'mixed';
    if (categories.verified + categories.mostly_verified >= total * 0.7) {
      consensus = 'mostly_verified';
    } else if (categories.disputed + categories.mostly_disputed >= total * 0.7) {
      consensus = 'mostly_disputed';
    } else if (categories.verified >= total * 0.5) {
      consensus = 'leaning_verified';
    } else if (categories.disputed >= total * 0.5) {
      consensus = 'leaning_disputed';
    }
    
    return {
      total: total,
      categories: categories,
      averageScore: Number(averageScore.toFixed(3)),
      averageConfidence: Number(averageConfidence.toFixed(3)),
      consensus: consensus,
      uniquePublishers: publishers.size,
      languages: Array.from(languages),
      publisherList: Array.from(publishers)
    };
  }
  
  /**
   * Gera recomendações baseadas na análise
   * @private
   */
  _generateRecommendations(claims, analysis) {
    const recommendations = [];
    
    // Recomendações baseadas no consenso
    if (analysis.consensus === 'mostly_verified') {
      recommendations.push({
        type: 'verification',
        level: 'high',
        message: 'A informação tem forte suporte de verificadores independentes.',
        action: 'accept_with_confidence'
      });
    } else if (analysis.consensus === 'mostly_disputed') {
      recommendations.push({
        type: 'warning',
        level: 'high',
        message: 'A informação foi amplamente contestada por verificadores.',
        action: 'reject_with_confidence'
      });
    } else if (analysis.consensus === 'mixed') {
      recommendations.push({
        type: 'caution',
        level: 'medium',
        message: 'A informação tem aspectos verdadeiros e falsos. Verificação adicional recomendada.',
        action: 'verify_further'
      });
    }
    
    // Recomendações baseadas na confiança
    if (analysis.averageConfidence < 0.6) {
      recommendations.push({
        type: 'quality',
        level: 'medium',
        message: 'Qualidade das verificações é baixa. Buscar fontes adicionais.',
        action: 'seek_additional_sources'
      });
    }
    
    // Recomendações baseadas no número de fontes
    if (analysis.uniquePublishers < 2) {
      recommendations.push({
        type: 'diversity',
        level: 'low',
        message: 'Poucas fontes de verificação encontradas. Considerar busca mais ampla.',
        action: 'expand_search'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Enriquece claim com contexto adicional
   * @private
   */
  _enrichWithContext(claim) {
    const context = {
      urgency: this._assessUrgency(claim),
      credibility: this._assessCredibility(claim),
      impact: this._assessImpact(claim)
    };
    
    return context;
  }
  
  /**
   * Avalia urgência do claim
   * @private
   */
  _assessUrgency(claim) {
    const text = claim.text.toLowerCase();
    const urgencyWords = ['urgente', 'imediato', 'breaking', 'última hora', 'agora'];
    
    const hasUrgencyWords = urgencyWords.some(word => text.includes(word));
    const isRecent = claim.claimDate && (Date.now() - claim.claimDate.getTime()) < 86400000; // 24h
    
    if (hasUrgencyWords && isRecent) return 'high';
    if (hasUrgencyWords || isRecent) return 'medium';
    return 'low';
  }
  
  /**
   * Avalia credibilidade do claim
   * @private
   */
  _assessCredibility(claim) {
    let score = 0.5;
    
    // Qualidade da revisão
    if (claim.metadata.reviewQuality.level === 'high') score += 0.3;
    else if (claim.metadata.reviewQuality.level === 'medium') score += 0.1;
    
    // Confiança do rating
    score += (claim.rating.confidence - 0.5) * 0.4;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Avalia impacto potencial do claim
   * @private
   */
  _assessImpact(claim) {
    const text = claim.text.toLowerCase();
    const highImpactWords = ['saúde', 'morte', 'governo', 'eleição', 'vacina', 'covid'];
    
    const hasHighImpactWords = highImpactWords.some(word => text.includes(word));
    const isLongClaim = claim.text.length > 100;
    
    if (hasHighImpactWords && isLongClaim) return 'high';
    if (hasHighImpactWords || isLongClaim) return 'medium';
    return 'low';
  }
  
  /**
   * Cria resposta vazia
   * @private
   */
  _createEmptyResponse(query, source) {
    return {
      success: true,
      found: false,
      query: query,
      message: 'Nenhuma verificação encontrada para esta informação',
      claims: [],
      analysis: {
        total: 0,
        categories: {},
        consensus: 'unverified'
      },
      recommendations: [{
        type: 'search',
        level: 'medium',
        message: 'Nenhuma verificação encontrada. Considerar busca manual.',
        action: 'manual_search'
      }],
      timestamp: Date.now(),
      source: source
    };
  }
  
  /**
   * Cria resposta de erro
   * @private
   */
  _createErrorResponse(error, query, source) {
    return {
      success: false,
      error: error.message,
      query: query,
      timestamp: Date.now(),
      source: source
    };
  }
  
  /**
   * Gera metadados da resposta
   * @private
   */
  _generateMetadata(apiResponse, processedClaims) {
    return {
      apiVersion: 'v1alpha1',
      processingTime: Date.now(),
      totalApiResults: apiResponse.claims?.length || 0,
      processedResults: processedClaims.length,
      hasNextPage: !!apiResponse.nextPageToken,
      nextPageToken: apiResponse.nextPageToken || null
    };
  }
  
  /**
   * Faz parse de data
   * @private
   */
  _parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      return new Date(dateString);
    } catch (error) {
      return null;
    }
  }
}

module.exports = ResponseParser;
