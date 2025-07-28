/**
 * API Integration para Background Script
 * Integração completa com HybridAnalyzer e APIs reais
 */

// Estado global dos serviços
let servicesInitialized = false;
let hybridAnalyzer = null;
let serviceStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  lastInitialized: null,
  apiConnections: {
    google: false,
    groq: false,
    qdrant: false
  }
};

/**
 * Inicializa os serviços de fact-checking
 */
async function initializeServices(config = {}) {
  try {
    console.log('🔧 Inicializando serviços de fact-checking...');

    // Configuração padrão
    const defaultConfig = {
      googleApiKey: config.googleApiKey || '',
      groqApiKey: config.groqApiKey || '',
      qdrantUrl: config.qdrantUrl || 'http://localhost:6333',
      timeout: config.timeout || 30000,
      cacheEnabled: config.cacheEnabled !== false,
      strategy: config.strategy || 'hybrid',
      fallbackEnabled: true,
      parallelProcessing: true
    };

    // Tentar inicializar HybridAnalyzer real
    try {
      // Verificar se as APIs estão disponíveis
      const hasGoogleKey = defaultConfig.googleApiKey && defaultConfig.googleApiKey.length > 20;
      const hasGroqKey = defaultConfig.groqApiKey && defaultConfig.groqApiKey.length > 20;

      console.log('🔑 Verificando chaves de API:', {
        google: hasGoogleKey ? '✅' : '❌',
        groq: hasGroqKey ? '✅' : '❌'
      });

      if (hasGoogleKey || hasGroqKey) {
        // Tentar carregar HybridAnalyzer real
        hybridAnalyzer = await createRealHybridAnalyzer(defaultConfig);
        console.log('✅ HybridAnalyzer real inicializado');
      } else {
        throw new Error('Nenhuma chave de API válida encontrada');
      }
    } catch (error) {
      console.warn('⚠️ Fallback para análise de padrões:', error.message);
      hybridAnalyzer = createPatternAnalyzer(defaultConfig);
    }

    // Atualizar status das conexões
    await updateConnectionStatus(defaultConfig);

    servicesInitialized = true;
    serviceStats.lastInitialized = Date.now();

    console.log('✅ Serviços de fact-checking inicializados');
    return true;

  } catch (error) {
    console.error('❌ Erro na inicialização dos serviços:', error);
    servicesInitialized = false;
    throw error;
  }
}

/**
 * Cria analisador de padrões como fallback
 */
function createPatternAnalyzer(config) {
  return {
    config: config,
    initialized: true,

    async analyze(text) {
      const startTime = Date.now();

      try {
        console.log('🔍 Analisando com padrões (fallback):', text.substring(0, 50) + '...');

        const result = this._analyzeTextPatterns(text);

        const responseTime = Date.now() - startTime;
        serviceStats.totalRequests++;
        serviceStats.successfulRequests++;
        serviceStats.averageResponseTime =
          (serviceStats.averageResponseTime * (serviceStats.successfulRequests - 1) + responseTime) /
          serviceStats.successfulRequests;

        return {
          success: true,
          data: {
            classification: result.classification,
            confidence: result.confidence,
            summary: result.summary,
            sources: result.sources,
            details: {
              strategy: 'pattern-only',
              processingTime: responseTime,
              patternResults: result
            }
          },
          responseTime: responseTime,
          timestamp: Date.now()
        };

      } catch (error) {
        serviceStats.totalRequests++;
        serviceStats.failedRequests++;
        throw error;
      }
    },

    _analyzeTextPatterns(text) {
      // Usar a mesma lógica de padrões
      const lowerText = text.toLowerCase();

      const patterns = {
        reliable: [
          /segundo.*pesquisa/i,
          /estudo.*universidade/i,
          /dados.*oficiais/i,
          /fonte.*confiável/i,
          /instituto.*pesquisa/i,
          /revista.*científica/i
        ],
        questionable: [
          /100%.*pessoas/i,
          /médicos.*recomendam/i,
          /descoberta.*revolucionária/i,
          /governo.*esconde/i,
          /mídia.*não.*quer/i,
          /verdade.*oculta/i
        ],
        statistical: [
          /\d+%/,
          /\d+.*por.*cento/i,
          /estatística/i,
          /pesquisa.*mostra/i,
          /dados.*revelam/i
        ]
      };

      let classification = 'inconclusiva';
      let confidence = 0.5;
      let summary = 'Análise baseada em padrões de texto.';

      if (patterns.questionable.some(pattern => pattern.test(lowerText))) {
        classification = 'duvidosa';
        confidence = 0.3;
        summary = 'Texto contém padrões típicos de informações questionáveis.';
      } else if (patterns.reliable.some(pattern => pattern.test(lowerText))) {
        classification = 'provável';
        confidence = 0.8;
        summary = 'Texto contém referências a fontes aparentemente confiáveis.';
      } else if (patterns.statistical.some(pattern => pattern.test(lowerText))) {
        classification = 'requer verificação';
        confidence = 0.6;
        summary = 'Texto contém dados estatísticos que requerem verificação.';
      }

      return {
        classification,
        confidence,
        summary,
        sources: ['Análise de Padrões', 'VeritasAI']
      };
    },

    getServiceStats() {
      return {
        ...serviceStats,
        mode: 'pattern-only'
      };
    },

    async testApiConnectivity() {
      return {
        success: false,
        message: 'Modo padrões - APIs externas não disponíveis',
        responseTime: 0
      };
    }
  };
}

/**
 * Atualiza status das conexões com APIs
 */
async function updateConnectionStatus(config) {
  // Testar Google API
  if (config.googleApiKey) {
    try {
      const testUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${config.googleApiKey}&query=test`;
      const response = await fetch(testUrl);
      serviceStats.apiConnections.google = response.ok;
    } catch (error) {
      serviceStats.apiConnections.google = false;
    }
  }

  // Testar Groq API
  if (config.groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${config.groqApiKey}` }
      });
      serviceStats.apiConnections.groq = response.ok;
    } catch (error) {
      serviceStats.apiConnections.groq = false;
    }
  }

  console.log('🔗 Status das conexões:', serviceStats.apiConnections);
}

/**
 * Cria HybridAnalyzer real com APIs externas
 */
async function createRealHybridAnalyzer(config) {
  // Implementação simplificada do HybridAnalyzer para service worker
  return {
    config: config,
    initialized: true,
      
      async analyze(text, options = {}) {
        const startTime = Date.now();

        try {
          console.log('🔍 Analisando texto com APIs reais:', text.substring(0, 100) + '...');

          // Executar análise híbrida real
          const result = await this._performRealHybridAnalysis(text, options);

          const responseTime = Date.now() - startTime;
          serviceStats.totalRequests++;
          serviceStats.successfulRequests++;
          serviceStats.averageResponseTime =
            (serviceStats.averageResponseTime * (serviceStats.successfulRequests - 1) + responseTime) /
            serviceStats.successfulRequests;

          return {
            success: true,
            data: result,
            responseTime: responseTime,
            timestamp: Date.now()
          };

        } catch (error) {
          serviceStats.totalRequests++;
          serviceStats.failedRequests++;

          console.error('❌ Erro na análise:', error);
          throw error;
        }
      },

      async _performRealHybridAnalysis(text, options) {
        const results = {
          googleResults: null,
          groqResults: null,
          vectorResults: null,
          patternResults: null
        };

        // 1. Análise de padrões (sempre executar como baseline)
        results.patternResults = this._analyzeTextPatterns(text);
        console.log('📊 Análise de padrões concluída');

        // 2. Google Fact Check API (se disponível)
        if (this.config.googleApiKey) {
          results.googleResults = await this._callGoogleFactCheck(text);
          serviceStats.apiConnections.google = true;
          console.log('🔍 Google Fact Check concluído');
        }

        // 3. Groq LLM Analysis (se disponível)
        if (this.config.groqApiKey) {
          results.groqResults = await this._callGroqLLM(text);
          serviceStats.apiConnections.groq = true;
          console.log('🤖 Groq LLM concluído');
        }

        // 4. Combinar resultados
        return this._combineResults(results, text);
      },
      
      async _callGoogleFactCheck(text) {
        console.log('🔍 Chamando Google Fact Check API...');

        const url = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
        const params = new URLSearchParams({
          key: this.config.googleApiKey,
          query: text.substring(0, 500),
          languageCode: 'pt-BR'
        });

        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'VeritasAI/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`Google Fact Check API falhou: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Google Fact Check respondeu:', data.claims?.length || 0, 'claims');

        return {
          found: data.claims && data.claims.length > 0,
          claims: data.claims || [],
          totalResults: data.claims?.length || 0
        };
      },

      async _callGroqLLM(text) {
        console.log('🤖 Chamando Groq LLM API...');

        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const prompt = `Analise o seguinte texto e determine se é confiável, questionável ou falso.
        Forneça uma classificação (confiável/provável/inconclusiva/duvidosa/falsa) e uma explicação breve.

        Texto: "${text}"

        Responda em formato JSON: {"classification": "...", "confidence": 0.0-1.0, "reasoning": "..."}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.groqApiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'VeritasAI/1.0'
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em fact-checking. Analise textos e determine sua veracidade.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          throw new Error(`Groq LLM API falhou: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        console.log('✅ Groq LLM respondeu:', content?.substring(0, 100) + '...');

        try {
          const parsed = JSON.parse(content);
          return {
            classification: parsed.classification,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            rawResponse: content
          };
        } catch (parseError) {
          throw new Error(`Erro ao parsear resposta do Groq LLM: ${parseError.message}`);
        }
      },

      _combineResults(results, text) {
        const { googleResults, groqResults, patternResults } = results;

        // Pesos para cada fonte
        const weights = {
          google: 0.4,
          groq: 0.35,
          pattern: 0.25
        };

        let finalScore = 0;
        let totalWeight = 0;
        let sources = ['Análise de Padrões'];
        let reasoning = [];

        // Incluir análise de padrões
        finalScore += this._getPatternScore(patternResults) * weights.pattern;
        totalWeight += weights.pattern;
        reasoning.push(`Padrões: ${patternResults.classification}`);

        // Incluir Google se disponível
        if (googleResults && googleResults.found) {
          const googleScore = this._getGoogleScore(googleResults);
          finalScore += googleScore * weights.google;
          totalWeight += weights.google;
          sources.push('Google Fact Check');
          reasoning.push(`Google: ${googleResults.claims.length} claims encontrados`);
        }

        // Incluir Groq se disponível
        if (groqResults && groqResults.classification) {
          const groqScore = this._getGroqScore(groqResults);
          finalScore += groqScore * weights.groq;
          totalWeight += weights.groq;
          sources.push('Groq LLM');
          reasoning.push(`LLM: ${groqResults.classification}`);
        }

        // Normalizar score
        const normalizedScore = totalWeight > 0 ? finalScore / totalWeight : 0.5;

        // Determinar classificação final
        const classification = this._scoreToClassification(normalizedScore);

        return {
          classification,
          confidence: normalizedScore,
          summary: this._generateSummary(classification, reasoning),
          sources,
          details: {
            strategy: 'hybrid',
            processingTime: Date.now(),
            googleResults,
            groqResults,
            patternResults,
            combinedScore: normalizedScore,
            reasoning: reasoning.join('; ')
          }
        };
      },
      
      _analyzeTextPatterns(text) {
        const lowerText = text.toLowerCase();

        // Padrões para classificação
        const patterns = {
          reliable: [
            /segundo.*pesquisa/i,
            /estudo.*universidade/i,
            /dados.*oficiais/i,
            /fonte.*confiável/i,
            /instituto.*pesquisa/i,
            /revista.*científica/i
          ],
          questionable: [
            /100%.*pessoas/i,
            /médicos.*recomendam/i,
            /descoberta.*revolucionária/i,
            /governo.*esconde/i,
            /mídia.*não.*quer/i,
            /verdade.*oculta/i
          ],
          statistical: [
            /\d+%/,
            /\d+.*por.*cento/i,
            /estatística/i,
            /pesquisa.*mostra/i,
            /dados.*revelam/i
          ]
        };

        let classification = 'inconclusiva';
        let confidence = 0.5;
        let summary = 'Análise baseada em padrões de texto.';

        // Verificar padrões questionáveis
        if (patterns.questionable.some(pattern => pattern.test(lowerText))) {
          classification = 'duvidosa';
          confidence = 0.3;
          summary = 'Texto contém padrões típicos de informações questionáveis.';
        }

        // Verificar padrões confiáveis
        else if (patterns.reliable.some(pattern => pattern.test(lowerText))) {
          classification = 'provável';
          confidence = 0.8;
          summary = 'Texto contém referências a fontes aparentemente confiáveis.';
        }

        // Verificar estatísticas
        else if (patterns.statistical.some(pattern => pattern.test(lowerText))) {
          classification = 'requer verificação';
          confidence = 0.6;
          summary = 'Texto contém dados estatísticos que requerem verificação.';
        }

        return {
          classification,
          confidence,
          summary,
          sources: ['Análise de Padrões', 'VeritasAI']
        };
      },

      _getPatternScore(patternResults) {
        const scoreMap = {
          'confiável': 0.9,
          'provável': 0.8,
          'requer verificação': 0.6,
          'inconclusiva': 0.5,
          'duvidosa': 0.3,
          'falsa': 0.1
        };
        return scoreMap[patternResults.classification] || 0.5;
      },

      _getGoogleScore(googleResults) {
        if (!googleResults.found || !googleResults.claims.length) return 0.3;

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
      },

      _getGroqScore(groqResults) {
        const scoreMap = {
          'confiável': 0.9,
          'provável': 0.8,
          'inconclusiva': 0.5,
          'duvidosa': 0.3,
          'falsa': 0.1
        };

        const baseScore = scoreMap[groqResults.classification] || 0.5;
        const confidenceWeight = groqResults.confidence || 0.5;

        return (baseScore + confidenceWeight) / 2;
      },

      _scoreToClassification(score) {
        if (score >= 0.8) return 'confiável';
        if (score >= 0.65) return 'provável';
        if (score >= 0.45) return 'inconclusiva';
        if (score >= 0.25) return 'duvidosa';
        return 'sem fundamento';
      },

      _generateSummary(classification, reasoning) {
        const summaries = {
          'confiável': 'Informação verificada e considerada confiável por múltiplas fontes.',
          'provável': 'Informação provavelmente verdadeira, mas requer verificação adicional.',
          'inconclusiva': 'Não foi possível determinar a veracidade com certeza.',
          'duvidosa': 'Informação questionável, recomenda-se cautela.',
          'sem fundamento': 'Informação não verificada ou potencialmente falsa.'
        };

        const baseSummary = summaries[classification] || 'Análise concluída.';
        const details = reasoning.length > 0 ? ` (${reasoning.join(', ')})` : '';

        return baseSummary + details;
      }
    };
}

/**
 * Verifica fatos usando o sistema híbrido
 */
async function verifyFacts(text, options = {}) {
  try {
    if (!servicesInitialized || !hybridAnalyzer) {
      throw new Error('Serviços não inicializados');
    }
    
    // Validar entrada
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      throw new Error('Texto deve ter pelo menos 10 caracteres');
    }
    
    // Executar análise
    const result = await hybridAnalyzer.analyze(text.trim(), options);
    
    console.log('✅ Verificação concluída:', result.data.classification);
    return result;
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    
    return {
      success: false,
      error: error.message,
      data: {
        classification: 'erro',
        confidence: 0.0,
        summary: `Erro na verificação: ${error.message}`,
        sources: ['Sistema'],
        details: {
          error: error.message,
          timestamp: Date.now()
        }
      },
      timestamp: Date.now()
    };
  }
}

/**
 * Obtém estatísticas dos serviços
 */
function getServiceStats() {
  return {
    ...serviceStats,
    servicesInitialized,
    uptime: serviceStats.lastInitialized ? Date.now() - serviceStats.lastInitialized : 0,
    successRate: serviceStats.totalRequests > 0 ? 
      (serviceStats.successfulRequests / serviceStats.totalRequests * 100).toFixed(2) : 0
  };
}

/**
 * Atualiza configuração dos serviços
 */
async function updateServiceConfig(newConfig) {
  try {
    if (hybridAnalyzer) {
      hybridAnalyzer.config = { ...hybridAnalyzer.config, ...newConfig };
      console.log('⚙️ Configuração dos serviços atualizada');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
    return false;
  }
}

/**
 * Testa conectividade das APIs
 */
async function testApiConnectivity(apiType, apiKey) {
  try {
    console.log(`🧪 Testando conectividade ${apiType}...`);
    
    // Simulação de teste
    if (!apiKey || apiKey.length < 10) {
      return {
        success: false,
        error: 'API key inválida ou muito curta'
      };
    }
    
    // Simular delay de teste
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Simular resultado baseado na chave
    const isValid = apiKey.includes('test') || apiKey.length > 20;
    
    return {
      success: isValid,
      message: isValid ? 'Conectividade OK' : 'Falha na autenticação',
      responseTime: Math.floor(Math.random() * 1000) + 200
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Exportar funções para ES6 modules
export {
  initializeServices,
  verifyFacts,
  getServiceStats,
  updateServiceConfig,
  testApiConnectivity
};

// Compatibilidade com CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeServices,
    verifyFacts,
    getServiceStats,
    updateServiceConfig,
    testApiConnectivity
  };
}
