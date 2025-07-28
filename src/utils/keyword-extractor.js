/**
 * KeywordExtractor - Sistema de extração de palavras-chave para VeritasAI
 * Utiliza compromise.js para processamento de linguagem natural
 * VER-024: Otimizado para uso eficiente de memória
 */

// Lazy loading dos módulos NLP para economizar memória
let nlp = null;
let numbers = null;
let dates = null;
let stopword = null;

// Importar memory optimizer
const { getMemoryOptimizer, optimizeMemory } = require('./memory-optimizer.js');

// Registrar plugins do compromise
nlp.plugin(numbers);
nlp.plugin(dates);

/**
 * Classe principal para extração de palavras-chave
 */
class KeywordExtractor {
  constructor(options = {}) {
    this.options = {
      maxKeywords: options.maxKeywords || 10,
      minWordLength: options.minWordLength || 3,
      includeNumbers: options.includeNumbers !== false,
      includeDates: options.includeDates !== false,
      includeEntities: options.includeEntities !== false,
      language: options.language || 'pt',
      ...options
    };
    
    // Stopwords customizadas para fact-checking
    this.customStopwords = [
      'disse', 'afirmou', 'declarou', 'segundo', 'conforme',
      'através', 'mediante', 'durante', 'enquanto', 'portanto',
      'entretanto', 'contudo', 'todavia', 'porém', 'mas',
      'então', 'assim', 'logo', 'pois', 'porque', 'como',
      'quando', 'onde', 'quanto', 'qual', 'quem', 'que'
    ];

    // VER-024: Otimizações de memória
    this.cache = new Map();
    this.maxCacheSize = options.maxCacheSize || 50; // Reduzido para economizar memória
    this.memoryOptimizer = null;

    if (options.enableMemoryOptimization !== false) {
      try {
        this.memoryOptimizer = getMemoryOptimizer();
      } catch (error) {
        console.warn('⚠️ Memory optimizer não disponível:', error.message);
      }
    }

    // Lazy loading dos módulos NLP
    this._initLazyModules();
  }

  /**
   * VER-024: Inicialização lazy dos módulos NLP
   */
  _initLazyModules() {
    // Carregar módulos apenas quando necessário
    if (!nlp) {
      nlp = require('compromise');
    }
    if (!numbers) {
      numbers = require('compromise-numbers');
      nlp.plugin(numbers);
    }
    if (!dates) {
      dates = require('compromise-dates');
      nlp.plugin(dates);
    }
    if (!stopword) {
      stopword = require('stopword');
    }
  }
  
  /**
   * Extrai palavras-chave de um texto
   * VER-024: Otimizado para uso eficiente de memória
   * @param {string} text - Texto para análise
   * @returns {Object} Resultado da extração
   */
  extract(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Texto deve ser uma string não vazia');
    }

    // Verificar cache primeiro
    const cacheKey = this._generateCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const startTime = Date.now();

    try {
      // Garantir que módulos estão carregados
      this._initLazyModules();

      // Processar texto com compromise
      const doc = nlp(text);

      // Extrair diferentes tipos de informação de forma otimizada
      const result = {
        keywords: this._extractKeywords(doc),
        entities: this._extractEntities(doc),
        numbers: this._extractNumbers(doc),
        dates: this._extractDates(doc),
        claims: this._extractClaims(doc),
        sentiment: this._analyzeSentiment(doc),
        urgencyIndicators: this._detectUrgency(doc),
        processingTime: Date.now() - startTime,
        textLength: text.length,
        wordCount: doc.wordCount()
      };

      // Combinar e ranquear todas as palavras-chave
      result.combinedKeywords = this._combineAndRank(result);

      // Otimizar resultado para economizar memória
      this._optimizeResult(result);

      // Armazenar no cache com limite de tamanho
      this._cacheResult(cacheKey, result);

      // Verificar uso de memória se optimizer disponível
      if (this.memoryOptimizer) {
        this.memoryOptimizer.checkMemoryUsage();
      }

      return result;

    } catch (error) {
      throw new Error(`Erro na extração de palavras-chave: ${error.message}`);
    }
  }
  
  /**
   * Extrai palavras-chave básicas
   * @private
   */
  _extractKeywords(doc) {
    // Extrair substantivos e adjetivos importantes
    const nouns = doc.nouns().out('array');
    const adjectives = doc.adjectives().out('array');
    const verbs = doc.verbs().out('array');
    
    // Combinar e filtrar
    let keywords = [...nouns, ...adjectives, ...verbs]
      .map(word => word.toLowerCase().trim())
      .filter(word => word.length >= this.options.minWordLength)
      .filter(word => !this._isStopword(word));
    
    // Remover duplicatas e contar frequência
    const frequency = {};
    keywords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Ordenar por frequência e retornar top keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, this.options.maxKeywords)
      .map(([word, freq]) => ({ word, frequency: freq, type: 'keyword' }));
  }
  
  /**
   * Extrai entidades nomeadas
   * @private
   */
  _extractEntities(doc) {
    if (!this.options.includeEntities) return [];
    
    const entities = [];
    
    // Pessoas
    const people = doc.people().out('array');
    people.forEach(person => {
      entities.push({ text: person, type: 'person', confidence: 0.8 });
    });
    
    // Lugares
    const places = doc.places().out('array');
    places.forEach(place => {
      entities.push({ text: place, type: 'place', confidence: 0.7 });
    });
    
    // Organizações
    const organizations = doc.organizations().out('array');
    organizations.forEach(org => {
      entities.push({ text: org, type: 'organization', confidence: 0.6 });
    });
    
    return entities;
  }
  
  /**
   * Extrai números e valores
   * @private
   */
  _extractNumbers(doc) {
    if (!this.options.includeNumbers) return [];
    
    const numbers = [];
    
    // Números básicos
    const basicNumbers = doc.numbers().out('array');
    basicNumbers.forEach(num => {
      numbers.push({ text: num, type: 'number', confidence: 0.9 });
    });
    
    // Percentuais - melhorar detecção
    const percentagePatterns = [
      doc.match('#Value percent').out('array'),
      doc.match('#Value (por cento|porcento|%)').out('array')
    ];

    percentagePatterns.forEach(patternResults => {
      patternResults.forEach(pct => {
        numbers.push({ text: pct, type: 'percentage', confidence: 0.95 });
      });
    });
    
    // Valores monetários
    const money = doc.money().out('array');
    money.forEach(val => {
      numbers.push({ text: val, type: 'money', confidence: 0.9 });
    });
    
    return numbers;
  }
  
  /**
   * Extrai datas
   * @private
   */
  _extractDates(doc) {
    if (!this.options.includeDates) return [];
    
    const dates = [];
    
    // Datas específicas
    const specificDates = doc.dates().out('array');
    specificDates.forEach(date => {
      dates.push({ text: date, type: 'date', confidence: 0.8 });
    });
    
    // Expressões temporais
    const timeExpressions = doc.match('#Date').out('array');
    timeExpressions.forEach(expr => {
      dates.push({ text: expr, type: 'time_expression', confidence: 0.7 });
    });
    
    return dates;
  }
  
  /**
   * Extrai claims (afirmações) potenciais
   * @private
   */
  _extractClaims(doc) {
    const claims = [];
    
    // Padrões de afirmações
    const claimPatterns = [
      '#Person (disse|afirmou|declarou|confirmou)',
      '(segundo|conforme|de acordo com) #Person',
      '#Value (por cento|porcento|%)',
      '(aumentou|diminuiu|cresceu|caiu) #Value',
      '(é|foi|será) (o maior|o menor|o primeiro)',
      '(nunca|sempre|jamais) (aconteceu|ocorreu)'
    ];
    
    claimPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        claims.push({
          text: match,
          type: 'claim',
          confidence: 0.7,
          pattern: pattern
        });
      });
    });
    
    // Sentenças com verbos de afirmação
    const sentences = doc.sentences().out('array');
    sentences.forEach(sentence => {
      const sentenceDoc = nlp(sentence);
      const hasClaimVerbs = sentenceDoc.match('(afirma|declara|confirma|nega|diz)').found;
      
      if (hasClaimVerbs) {
        claims.push({
          text: sentence,
          type: 'statement',
          confidence: 0.6
        });
      }
    });
    
    return claims;
  }
  
  /**
   * Análise básica de sentimento
   * @private
   */
  _analyzeSentiment(doc) {
    // Palavras positivas e negativas básicas
    const positiveWords = ['bom', 'ótimo', 'excelente', 'positivo', 'sucesso', 'melhora', 'crescimento'];
    const negativeWords = ['ruim', 'péssimo', 'terrível', 'negativo', 'fracasso', 'piora', 'queda'];

    const text = doc.out('text').toLowerCase();

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      positiveScore += matches;
    });

    negativeWords.forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      negativeScore += matches;
    });

    const totalWords = doc.wordCount();
    const sentiment = (positiveScore - negativeScore) / Math.max(totalWords, 1);

    return {
      score: sentiment,
      positive: positiveScore,
      negative: negativeScore,
      classification: sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral'
    };
  }

  /**
   * Análise avançada de sentimento
   * @param {string} text - Texto para análise
   * @returns {Object} Análise detalhada de sentimento
   */
  analyzeSentimentAdvanced(text) {
    const doc = nlp(text);

    // Dicionários expandidos de sentimento
    const sentimentLexicon = {
      positive: {
        strong: ['excelente', 'fantástico', 'maravilhoso', 'perfeito', 'incrível', 'extraordinário'],
        moderate: ['bom', 'ótimo', 'positivo', 'agradável', 'satisfatório', 'adequado'],
        weak: ['ok', 'razoável', 'aceitável', 'tolerável']
      },
      negative: {
        strong: ['terrível', 'horrível', 'péssimo', 'catastrófico', 'desastroso', 'inaceitável'],
        moderate: ['ruim', 'negativo', 'problemático', 'preocupante', 'inadequado'],
        weak: ['não muito bom', 'questionável', 'duvidoso']
      }
    };

    const emotions = {
      joy: ['feliz', 'alegre', 'contente', 'eufórico', 'radiante'],
      anger: ['raiva', 'irritado', 'furioso', 'indignado', 'revoltado'],
      fear: ['medo', 'assustado', 'preocupado', 'ansioso', 'nervoso'],
      sadness: ['triste', 'deprimido', 'melancólico', 'desanimado'],
      surprise: ['surpreso', 'espantado', 'chocado', 'impressionado'],
      disgust: ['nojo', 'repugnante', 'asqueroso', 'repulsivo']
    };

    const text_lower = text.toLowerCase();

    // Calcular scores por intensidade
    let sentimentScore = 0;
    const detectedWords = [];

    // Palavras positivas
    Object.entries(sentimentLexicon.positive).forEach(([intensity, words]) => {
      const weight = intensity === 'strong' ? 3 : intensity === 'moderate' ? 2 : 1;
      words.forEach(word => {
        const matches = (text_lower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        if (matches > 0) {
          sentimentScore += matches * weight;
          detectedWords.push({ word, type: 'positive', intensity, matches });
        }
      });
    });

    // Palavras negativas
    Object.entries(sentimentLexicon.negative).forEach(([intensity, words]) => {
      const weight = intensity === 'strong' ? 3 : intensity === 'moderate' ? 2 : 1;
      words.forEach(word => {
        const matches = (text_lower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        if (matches > 0) {
          sentimentScore -= matches * weight;
          detectedWords.push({ word, type: 'negative', intensity, matches });
        }
      });
    });

    // Detectar emoções
    const detectedEmotions = {};
    Object.entries(emotions).forEach(([emotion, words]) => {
      let emotionScore = 0;
      words.forEach(word => {
        const matches = (text_lower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        emotionScore += matches;
      });
      if (emotionScore > 0) {
        detectedEmotions[emotion] = emotionScore;
      }
    });

    // Detectar modificadores (intensificadores e atenuadores)
    const intensifiers = ['muito', 'extremamente', 'bastante', 'super', 'ultra'];
    const diminishers = ['pouco', 'ligeiramente', 'um tanto', 'meio'];

    let intensifierCount = 0;
    let diminisherCount = 0;

    intensifiers.forEach(word => {
      intensifierCount += (text_lower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    });

    diminishers.forEach(word => {
      diminisherCount += (text_lower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    });

    // Ajustar score com modificadores
    const modifierEffect = (intensifierCount * 0.5) - (diminisherCount * 0.3);
    const finalScore = sentimentScore + modifierEffect;

    // Normalizar score
    const wordCount = doc.wordCount();
    const normalizedScore = finalScore / Math.max(wordCount, 1);

    // Classificar sentimento
    let classification;
    if (normalizedScore > 0.2) classification = 'very_positive';
    else if (normalizedScore > 0.05) classification = 'positive';
    else if (normalizedScore > -0.05) classification = 'neutral';
    else if (normalizedScore > -0.2) classification = 'negative';
    else classification = 'very_negative';

    return {
      score: normalizedScore,
      classification: classification,
      confidence: Math.min(1, Math.abs(normalizedScore) * 2),
      detectedWords: detectedWords,
      emotions: detectedEmotions,
      modifiers: {
        intensifiers: intensifierCount,
        diminishers: diminisherCount,
        effect: modifierEffect
      },
      rawScore: finalScore,
      wordCount: wordCount
    };
  }
  
  /**
   * Detecta indicadores de urgência
   * @private
   */
  _detectUrgency(doc) {
    const urgencyWords = [
      'urgente', 'imediato', 'agora', 'já', 'rapidamente',
      'emergência', 'crítico', 'importante', 'alerta',
      'breaking', 'última hora', 'exclusivo'
    ];
    
    const indicators = [];
    const text = doc.out('text').toLowerCase();
    
    urgencyWords.forEach(word => {
      if (text.includes(word)) {
        indicators.push({
          word: word,
          type: 'urgency',
          confidence: 0.8
        });
      }
    });
    
    // Detectar pontos de exclamação múltiplos
    const exclamationMatches = text.match(/!{2,}/g);
    if (exclamationMatches) {
      indicators.push({
        word: 'multiple_exclamations',
        type: 'urgency',
        confidence: 0.6
      });
    }
    
    // Detectar CAPS LOCK
    const capsMatches = text.match(/[A-Z]{3,}/g);
    if (capsMatches && capsMatches.length > 0) {
      indicators.push({
        word: 'caps_lock',
        type: 'urgency',
        confidence: 0.5
      });
    }
    
    return indicators;
  }
  
  /**
   * Combina e ranqueia todas as palavras-chave
   * @private
   */
  _combineAndRank(result) {
    const combined = [];
    
    // Adicionar keywords básicas
    result.keywords.forEach(kw => {
      combined.push({ ...kw, score: kw.frequency * 1.0 });
    });
    
    // Adicionar entidades (peso maior)
    result.entities.forEach(entity => {
      combined.push({
        word: entity.text,
        type: entity.type,
        frequency: 1,
        score: entity.confidence * 2.0
      });
    });
    
    // Adicionar números importantes
    result.numbers.forEach(num => {
      combined.push({
        word: num.text,
        type: num.type,
        frequency: 1,
        score: num.confidence * 1.5
      });
    });
    
    // Adicionar claims (peso alto)
    result.claims.forEach(claim => {
      combined.push({
        word: claim.text.substring(0, 50) + '...',
        type: claim.type,
        frequency: 1,
        score: claim.confidence * 3.0
      });
    });
    
    // Ordenar por score e retornar top resultados
    return combined
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.maxKeywords);
  }
  
  /**
   * Verifica se uma palavra é stopword
   * @private
   */
  _isStopword(word) {
    // Usar biblioteca stopword para português
    const isCommonStopword = stopword.removeStopwords([word], stopword.pt).length === 0;
    
    // Verificar stopwords customizadas
    const isCustomStopword = this.customStopwords.includes(word.toLowerCase());
    
    return isCommonStopword || isCustomStopword;
  }
  
  /**
   * Extrai keywords para uso em APIs de fact-checking
   * @param {string} text - Texto para análise
   * @returns {Array} Array de keywords otimizadas para fact-checking
   */
  extractForFactCheck(text) {
    const result = this.extract(text);

    // Priorizar entidades, números e claims
    const factCheckKeywords = [];

    // Adicionar entidades nomeadas (pessoas, lugares, organizações)
    result.entities.forEach(entity => {
      if (['person', 'place', 'organization'].includes(entity.type)) {
        factCheckKeywords.push(entity.text);
      }
    });

    // Adicionar números e percentuais
    result.numbers.forEach(num => {
      if (['percentage', 'money'].includes(num.type)) {
        factCheckKeywords.push(num.text);
      }
    });

    // Adicionar keywords principais
    result.keywords.slice(0, 5).forEach(kw => {
      factCheckKeywords.push(kw.word);
    });

    // Remover duplicatas e limitar
    return [...new Set(factCheckKeywords)].slice(0, 8);
  }

  /**
   * Extração especializada para diferentes tipos de fact-checking
   * @param {string} text - Texto para análise
   * @param {string} type - Tipo de fact-checking ('political', 'health', 'science', 'general')
   * @returns {Object} Resultado especializado
   */
  extractSpecialized(text, type = 'general') {
    const baseResult = this.extract(text);

    switch (type) {
      case 'political':
        return this._extractPolitical(text, baseResult);
      case 'health':
        return this._extractHealth(text, baseResult);
      case 'science':
        return this._extractScience(text, baseResult);
      default:
        return baseResult;
    }
  }

  /**
   * Extração especializada para conteúdo político
   * @private
   */
  _extractPolitical(text, baseResult) {
    const doc = nlp(text);

    // Termos políticos específicos
    const politicalTerms = [
      'governo', 'presidente', 'ministro', 'deputado', 'senador',
      'partido', 'eleição', 'voto', 'campanha', 'política',
      'congresso', 'senado', 'câmara', 'supremo', 'tribunal'
    ];

    const politicalKeywords = [];
    politicalTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        politicalKeywords.push({
          word: term,
          type: 'political_term',
          confidence: 0.9
        });
      }
    });

    // Detectar promessas e declarações políticas
    const promisePatterns = [
      '(prometo|promete|prometeu) (que|fazer|criar)',
      '(vou|vai|irá) (fazer|criar|implementar)',
      '(meu governo|nossa gestão) (vai|irá|fará)'
    ];

    const promises = [];
    promisePatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        promises.push({
          text: match,
          type: 'political_promise',
          confidence: 0.8
        });
      });
    });

    return {
      ...baseResult,
      politicalTerms: politicalKeywords,
      promises: promises,
      specialization: 'political'
    };
  }

  /**
   * Extração especializada para conteúdo de saúde
   * @private
   */
  _extractHealth(text, baseResult) {
    const doc = nlp(text);

    // Termos médicos e de saúde
    const healthTerms = [
      'doença', 'sintoma', 'tratamento', 'medicamento', 'vacina',
      'vírus', 'bactéria', 'infecção', 'epidemia', 'pandemia',
      'hospital', 'médico', 'enfermeiro', 'paciente', 'diagnóstico',
      'covid', 'coronavirus', 'gripe', 'dengue', 'zika'
    ];

    const healthKeywords = [];
    healthTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        healthKeywords.push({
          word: term,
          type: 'health_term',
          confidence: 0.9
        });
      }
    });

    // Detectar claims médicos
    const medicalClaimPatterns = [
      '(cura|trata|previne) (o|a|os|as) #Noun',
      '(eficaz|eficiente) (contra|para) #Noun',
      '(reduz|aumenta) (o risco|a chance) de',
      '(estudos|pesquisas) (mostram|comprovam|indicam)'
    ];

    const medicalClaims = [];
    medicalClaimPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        medicalClaims.push({
          text: match,
          type: 'medical_claim',
          confidence: 0.85
        });
      });
    });

    return {
      ...baseResult,
      healthTerms: healthKeywords,
      medicalClaims: medicalClaims,
      specialization: 'health'
    };
  }

  /**
   * Extração especializada para conteúdo científico
   * @private
   */
  _extractScience(text, baseResult) {
    const doc = nlp(text);

    // Termos científicos
    const scienceTerms = [
      'pesquisa', 'estudo', 'experimento', 'análise', 'dados',
      'evidência', 'prova', 'teoria', 'hipótese', 'método',
      'resultado', 'conclusão', 'descoberta', 'inovação',
      'universidade', 'instituto', 'laboratório', 'cientista'
    ];

    const scienceKeywords = [];
    scienceTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        scienceKeywords.push({
          word: term,
          type: 'science_term',
          confidence: 0.9
        });
      }
    });

    // Detectar citações científicas
    const citationPatterns = [
      '(segundo|conforme|de acordo com) (o estudo|a pesquisa|os dados)',
      '(publicado|divulgado) (na|no|pela|pelo) #Organization',
      '(revista|journal|periódico) #Organization'
    ];

    const citations = [];
    citationPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        citations.push({
          text: match,
          type: 'scientific_citation',
          confidence: 0.9
        });
      });
    });

    return {
      ...baseResult,
      scienceTerms: scienceKeywords,
      citations: citations,
      specialization: 'science'
    };
  }

  /**
   * Detecta padrões de desinformação comuns
   * @param {string} text - Texto para análise
   * @returns {Object} Indicadores de desinformação
   */
  detectMisinformationPatterns(text) {
    const doc = nlp(text);
    const indicators = [];

    // Padrões de linguagem sensacionalista
    const sensationalPatterns = [
      'você não vai acreditar',
      'mídia não quer que você saiba',
      'verdade oculta',
      'eles não querem que você veja',
      'descoberta chocante',
      'segredo revelado'
    ];

    sensationalPatterns.forEach(pattern => {
      if (text.toLowerCase().includes(pattern)) {
        indicators.push({
          pattern: pattern,
          type: 'sensational_language',
          severity: 'high',
          confidence: 0.8
        });
      }
    });

    // Padrões de urgência excessiva
    const urgencyPatterns = [
      'compartilhe antes que seja tarde',
      'removido em breve',
      'última chance',
      'urgente: compartilhe'
    ];

    urgencyPatterns.forEach(pattern => {
      if (text.toLowerCase().includes(pattern)) {
        indicators.push({
          pattern: pattern,
          type: 'excessive_urgency',
          severity: 'medium',
          confidence: 0.7
        });
      }
    });

    // Padrões de apelo emocional extremo
    const emotionalPatterns = [
      'você ficará indignado',
      'isso vai te deixar furioso',
      'prepare-se para chorar',
      'sua vida nunca mais será a mesma'
    ];

    emotionalPatterns.forEach(pattern => {
      if (text.toLowerCase().includes(pattern)) {
        indicators.push({
          pattern: pattern,
          type: 'emotional_manipulation',
          severity: 'medium',
          confidence: 0.6
        });
      }
    });

    // Calcular score de risco
    const riskScore = indicators.reduce((score, indicator) => {
      const severityWeight = {
        'high': 3,
        'medium': 2,
        'low': 1
      };
      return score + (severityWeight[indicator.severity] * indicator.confidence);
    }, 0);

    return {
      indicators: indicators,
      riskScore: riskScore,
      riskLevel: riskScore > 3 ? 'high' : riskScore > 1 ? 'medium' : 'low'
    };
  }

  /**
   * Detecção avançada de claims verificáveis
   * @param {string} text - Texto para análise
   * @returns {Object} Claims categorizados por tipo
   */
  detectVerifiableClaims(text) {
    const doc = nlp(text);
    const claims = {
      statistical: [],
      factual: [],
      causal: [],
      temporal: [],
      comparative: []
    };

    // Claims estatísticos (números, percentuais, rankings)
    const statisticalPatterns = [
      '#Value (por cento|porcento|%)',
      '#Value (vezes mais|vezes menos)',
      '(primeiro|segundo|terceiro|último) (lugar|posição)',
      '(maior|menor|mais alto|mais baixo) (do|da) (mundo|país|história)',
      '(cresceu|aumentou|diminuiu|caiu) #Value',
      '#Value (milhões|bilhões|trilhões) de'
    ];

    statisticalPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        claims.statistical.push({
          text: match,
          type: 'statistical',
          verifiability: 'high',
          confidence: 0.9
        });
      });
    });

    // Claims factuais (eventos, declarações, fatos)
    const factualPatterns = [
      '#Person (disse|afirmou|declarou|confirmou|negou)',
      '(aconteceu|ocorreu|foi realizado) em #Date',
      '(foi criado|foi fundado|foi estabelecido) em',
      '(é|foi|será) (o primeiro|o único|o último)',
      '(nunca|sempre|jamais) (aconteceu|foi feito)'
    ];

    factualPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        claims.factual.push({
          text: match,
          type: 'factual',
          verifiability: 'high',
          confidence: 0.85
        });
      });
    });

    // Claims causais (causa e efeito)
    const causalPatterns = [
      '(causa|causou|provoca|provocou) #Noun',
      '(devido a|por causa de|em razão de)',
      '(resulta em|leva a|gera)',
      '(se|quando) #Noun (então|logo|portanto)'
    ];

    causalPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        claims.causal.push({
          text: match,
          type: 'causal',
          verifiability: 'medium',
          confidence: 0.7
        });
      });
    });

    // Claims temporais (quando algo aconteceu/acontecerá)
    const temporalPatterns = [
      '(em|no|na) #Date',
      '(antes|depois) de #Date',
      '(durante|ao longo de) #Duration',
      '(há|faz) #Value (anos|meses|dias)'
    ];

    temporalPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        claims.temporal.push({
          text: match,
          type: 'temporal',
          verifiability: 'high',
          confidence: 0.8
        });
      });
    });

    // Claims comparativos
    const comparativePatterns = [
      '(mais|menos) (que|do que) #Noun',
      '(melhor|pior) (que|do que)',
      '(superior|inferior) a',
      '(igual|similar|parecido) (a|com)'
    ];

    comparativePatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        claims.comparative.push({
          text: match,
          type: 'comparative',
          verifiability: 'medium',
          confidence: 0.6
        });
      });
    });

    return claims;
  }

  /**
   * Extração avançada de números e contexto
   * @param {string} text - Texto para análise
   * @returns {Object} Números categorizados com contexto
   */
  extractNumbersWithContext(text) {
    const doc = nlp(text);
    const numbers = {
      percentages: [],
      money: [],
      dates: [],
      quantities: [],
      rankings: [],
      statistics: []
    };

    // Percentuais com contexto
    const percentageMatches = doc.match('#Value (por cento|porcento|%)').out('array');
    percentageMatches.forEach(match => {
      const context = this._getNumberContext(doc, match);
      numbers.percentages.push({
        value: match,
        context: context,
        confidence: 0.95
      });
    });

    // Valores monetários
    const moneyMatches = doc.money().out('array');
    moneyMatches.forEach(match => {
      const context = this._getNumberContext(doc, match);
      numbers.money.push({
        value: match,
        context: context,
        confidence: 0.9
      });
    });

    // Quantidades grandes
    const quantityPatterns = [
      '#Value (milhões|bilhões|trilhões)',
      '#Value (mil|milhares)',
      '#Value (pessoas|habitantes|cidadãos)'
    ];

    quantityPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        const context = this._getNumberContext(doc, match);
        numbers.quantities.push({
          value: match,
          context: context,
          confidence: 0.85
        });
      });
    });

    // Rankings e posições
    const rankingPatterns = [
      '(primeiro|segundo|terceiro|quarto|quinto) (lugar|posição)',
      '#Ordinal (no|na) (ranking|lista|classificação)',
      '(líder|campeão|vencedor) (mundial|nacional)'
    ];

    rankingPatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        const context = this._getNumberContext(doc, match);
        numbers.rankings.push({
          value: match,
          context: context,
          confidence: 0.8
        });
      });
    });

    return numbers;
  }

  /**
   * Obtém contexto ao redor de um número
   * @private
   */
  _getNumberContext(doc, numberText) {
    const sentences = doc.sentences().out('array');

    for (let sentence of sentences) {
      if (sentence.includes(numberText)) {
        // Extrair palavras antes e depois do número
        const words = sentence.split(' ');
        const numberIndex = words.findIndex(word => word.includes(numberText));

        const before = words.slice(Math.max(0, numberIndex - 3), numberIndex).join(' ');
        const after = words.slice(numberIndex + 1, Math.min(words.length, numberIndex + 4)).join(' ');

        return {
          before: before,
          after: after,
          sentence: sentence,
          position: numberIndex
        };
      }
    }

    return null;
  }

  /**
   * Análise de credibilidade baseada em padrões linguísticos
   * @param {string} text - Texto para análise
   * @returns {Object} Score de credibilidade e indicadores
   */
  analyzeCredibility(text) {
    const doc = nlp(text);
    const indicators = {
      positive: [],
      negative: [],
      neutral: []
    };

    // Indicadores positivos de credibilidade
    const positivePatterns = [
      '(segundo|conforme|de acordo com) (estudo|pesquisa|dados)',
      '(publicado|divulgado) (na|no) (revista|jornal|site)',
      '(fonte|referência|citação)',
      '(especialista|expert|autoridade) (em|no)',
      '(universidade|instituto|organização) (reconhecida|respeitada)'
    ];

    positivePatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        indicators.positive.push({
          text: match,
          type: 'source_citation',
          weight: 2
        });
      });
    });

    // Indicadores negativos de credibilidade
    const negativePatterns = [
      '(ouvi dizer|me disseram|alguém falou)',
      '(não tenho certeza|acho que|talvez)',
      '(fonte anônima|não posso revelar)',
      '(boato|rumor|fofoca)',
      '(sem confirmação|não confirmado)'
    ];

    negativePatterns.forEach(pattern => {
      const matches = doc.match(pattern).out('array');
      matches.forEach(match => {
        indicators.negative.push({
          text: match,
          type: 'unreliable_source',
          weight: -2
        });
      });
    });

    // Calcular score de credibilidade
    const positiveScore = indicators.positive.reduce((sum, ind) => sum + ind.weight, 0);
    const negativeScore = indicators.negative.reduce((sum, ind) => sum + Math.abs(ind.weight), 0);

    const credibilityScore = Math.max(0, Math.min(1, (positiveScore - negativeScore + 5) / 10));

    return {
      score: credibilityScore,
      level: credibilityScore > 0.7 ? 'high' : credibilityScore > 0.4 ? 'medium' : 'low',
      indicators: indicators,
      positiveSignals: indicators.positive.length,
      negativeSignals: indicators.negative.length
    };
  }

  /**
   * VER-024: Métodos de otimização de memória
   */

  /**
   * Gera chave de cache para o texto
   */
  _generateCacheKey(text) {
    // Usar hash simples para economizar memória
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Armazena resultado no cache com limite de tamanho
   */
  _cacheResult(key, result) {
    // Verificar limite do cache
    if (this.cache.size >= this.maxCacheSize) {
      // Remover entrada mais antiga (FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
  }

  /**
   * Otimiza resultado para economizar memória
   */
  _optimizeResult(result) {
    // Limitar número de keywords
    if (result.keywords && result.keywords.length > this.options.maxKeywords) {
      result.keywords = result.keywords.slice(0, this.options.maxKeywords);
    }

    // Limitar número de entities
    if (result.entities && result.entities.length > 20) {
      result.entities = result.entities.slice(0, 20);
    }

    // Limitar números e datas
    if (result.numbers && result.numbers.length > 10) {
      result.numbers = result.numbers.slice(0, 10);
    }

    if (result.dates && result.dates.length > 10) {
      result.dates = result.dates.slice(0, 10);
    }

    // Remover propriedades desnecessárias para economizar memória
    if (result.combinedKeywords && result.combinedKeywords.length > this.options.maxKeywords) {
      result.combinedKeywords = result.combinedKeywords.slice(0, this.options.maxKeywords);
    }
  }

  /**
   * Limpa cache para liberar memória
   */
  clearCache() {
    this.cache.clear();

    if (this.memoryOptimizer) {
      this.memoryOptimizer.forceGC();
    }
  }

  /**
   * Obtém estatísticas de uso de memória
   */
  getMemoryStats() {
    const stats = {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      cacheUtilization: (this.cache.size / this.maxCacheSize * 100).toFixed(1) + '%'
    };

    if (this.memoryOptimizer) {
      Object.assign(stats, this.memoryOptimizer.getMemoryStats());
    }

    return stats;
  }
}

module.exports = KeywordExtractor;
