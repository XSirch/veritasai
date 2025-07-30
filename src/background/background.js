/**
 * VeritasAI - Background Service Worker (Groq + Qdrant)
 * Versão com integração de vector database para cache inteligente
 */

console.log('🚀 VeritasAI Background Service iniciando (Groq + Qdrant)...');

// Add startup completion log
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension startup completed');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 Extension installed/updated');
});

// Qdrant Service for vector database integration
let qdrantService = null;

// Simple Qdrant service implementation to avoid import issues
class SimpleQdrantService {
  constructor() {
    this.baseUrl = 'http://localhost:6333';
    this.collectionName = 'veritas_factcheck';
    this.isAvailable = false;
    this.similarityThreshold = 0.85;
    this.maxResults = 5;

    // Initialize connection check
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/collections`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      this.isAvailable = response.ok;

      if (this.isAvailable) {
        console.log('✅ Qdrant connection established');
        await this.ensureCollection();
      } else {
        console.log('⚠️ Qdrant not available, using LLM-only mode');
      }
    } catch (error) {
      console.log('⚠️ Qdrant connection failed, using LLM-only mode:', error.message);
      this.isAvailable = false;
    }
  }

  async ensureCollection() {
    try {
      const checkResponse = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!checkResponse.ok) {
        console.log('🔧 Creating Qdrant collection for fact-checking...');

        const createResponse = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vectors: { size: 384, distance: 'Cosine' },
            optimizers_config: { default_segment_number: 2 },
            replication_factor: 1
          })
        });

        if (createResponse.ok) {
          console.log('✅ Qdrant collection created successfully');
        } else {
          throw new Error('Failed to create collection');
        }
      } else {
        console.log('✅ Qdrant collection already exists');
      }
    } catch (error) {
      console.error('❌ Error ensuring Qdrant collection:', error);
      this.isAvailable = false;
    }
  }

  async generateEmbeddings(text) {
    try {
      // Usar uma API de embeddings mais simples e confiável
      const cleanText = text.substring(0, 500).replace(/\n/g, ' ').trim();

      // Usar API pública do Hugging Face sem autenticação
      const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: cleanText,
          options: {
            wait_for_model: true,
            use_cache: true
          }
        })
      });

      if (response.ok) {
        const embeddings = await response.json();

        // Verificar se recebemos embeddings válidos
        if (Array.isArray(embeddings)) {
          const vector = Array.isArray(embeddings[0]) ? embeddings[0] : embeddings;

          if (vector && vector.length === 384) {
            console.log('✅ Embeddings gerados com sucesso:', vector.length, 'dimensões');
            return vector;
          }
        }

        throw new Error('Invalid embedding format received');
      } else {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.log('⚠️ Hugging Face API não disponível, usando fallback local:', error.message);

      // Fallback: gerar embedding simples baseado em hash do texto
      console.log('🔄 Gerando embeddings localmente (fallback)...');
      return this.generateFallbackEmbedding(text);
    }
  }

  generateFallbackEmbedding(text) {
    // Gerar embedding simples de 384 dimensões baseado no texto
    const vector = new Array(384).fill(0);
    const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    for (let i = 0; i < cleanText.length && i < 384; i++) {
      const charCode = cleanText.charCodeAt(i);
      vector[i % 384] += (charCode / 255) * Math.sin(i * 0.1);
    }

    // Normalizar o vetor
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    console.log('✅ Embedding local gerado com sucesso:', vector.length, 'dimensões');
    return vector;
  }

  async searchSimilar(text, threshold = null) {
    if (!this.isAvailable) return null;

    try {
      const embeddings = await this.generateEmbeddings(text);
      if (!embeddings) return null;

      const searchThreshold = threshold || this.similarityThreshold;

      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: embeddings,
          limit: this.maxResults,
          score_threshold: searchThreshold,
          with_payload: true,
          with_vector: false
        })
      });

      if (response.ok) {
        const results = await response.json();

        if (results.result && results.result.length > 0) {
          const bestMatch = results.result[0];
          console.log(`🎯 Found similar content with score: ${bestMatch.score.toFixed(3)}`);

          return {
            score: bestMatch.score,
            payload: bestMatch.payload,
            fromCache: true
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Qdrant search failed:', error.message);
      return null;
    }
  }

  async storeResult(text, analysis, metadata = {}) {
    if (!this.isAvailable) return false;

    try {
      const embeddings = await this.generateEmbeddings(text);
      if (!embeddings) return false;

      const pointId = Date.now().toString();

      const payload = {
        original_text: text,
        classification: analysis.classification,
        score: analysis.score || analysis.confidence,
        summary: analysis.summary,
        reasoning: analysis.reasoning,
        timestamp: new Date().toISOString(),
        model_used: metadata.model || 'unknown',
        url: metadata.url || '',
        domain: metadata.domain || '',
        text_length: text.length,
        language: metadata.language || 'pt-BR'
      };

      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [{
            id: pointId,
            vector: embeddings,
            payload: payload
          }]
        })
      });

      if (response.ok) {
        console.log('✅ Fact-check result stored in Qdrant');
        return true;
      } else {
        throw new Error('Failed to store in Qdrant');
      }
    } catch (error) {
      console.warn('⚠️ Failed to store in Qdrant:', error.message);
      return false;
    }
  }

  async getStats() {
    if (!this.isAvailable) return null;

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          total_points: data.result.points_count,
          indexed_points: data.result.indexed_vectors_count,
          status: data.result.status
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to get Qdrant stats:', error.message);
    }

    return null;
  }

  setSimilarityThreshold(threshold) {
    this.similarityThreshold = Math.max(0.1, Math.min(1.0, threshold));
    console.log(`🎯 Similarity threshold set to: ${this.similarityThreshold}`);
  }

  isServiceAvailable() {
    return this.isAvailable;
  }
}

// Initialize Qdrant service
qdrantService = new SimpleQdrantService();

// Configuração padrão - apenas Groq AI
const DEFAULT_CONFIG = {
  groqApiKey: '',
  groqModel: 'llama-3.1-8b-instant', // Modelo otimizado para velocidade
  language: 'pt-BR',
  theme: 'auto',
  notificationsEnabled: true,
  soundEnabled: false,
  autoVerify: false,
  cacheEnabled: true,
  apiTimeout: 30,
  maxTextLength: 5000,
  debugMode: false,
  verboseLogging: false
};

// Função para converter nome técnico do modelo em nome amigável
function getModelDisplayName(modelId) {
  const modelNames = {
    'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
    'llama3-70b-8192': 'Llama 3 70B',
    'gemma2-9b-it': 'Gemma 2 9B'
  };

  return modelNames[modelId] || modelId;
}

// Prompt padrão para todos os modelos
function getSystemPrompt() {
  return `Você é um agente especialista em verificação de fatos. Receberá uma afirmação textual para ser analisada quanto à veracidade. Sua análise deverá ser feita de forma rigorosa, utilizando a seguinte fórmula detalhada para calcular um "score de veracidade":

**Score de Veracidade (SV)** = (Relevância × 0.3) + (Consistência com fontes confiáveis × 0.4) + (Ausência de contradições lógicas × 0.2) + (Precisão de detalhes × 0.1)

- **Relevância (0 a 1)**: Avalia se a afirmação aborda um tema relevante e verificável por fatos objetivos.
- **Consistência com fontes confiáveis (0 a 1)**: Mede o grau de concordância da afirmação com informações disponíveis em fontes reconhecidas e fidedignas.
- **Ausência de contradições lógicas (0 a 1)**: Avalia se a afirmação é logicamente coerente e livre de contradições internas ou contextuais.
- **Precisão de detalhes (0 a 1)**: Avalia se os detalhes apresentados são corretos e verificáveis por fontes ou conhecimento geral.

Classifique o resultado conforme o valor final de SV:
- **0.75 a 1.00** → "confiável"
- **0.50 a 0.74** → "inconclusiva"
- **0.00 a 0.49** → "sem fundamento"

Forneça sua análise APENAS no seguinte formato JSON:

{
  "classification": "confiável|inconclusiva|sem fundamento",
  "score": 0.0-1.0,
  "summary": "Explicação detalhada da análise feita sobre a afirmação",
  "reasoning": "Justificativa clara da classificação e dos valores atribuídos"
}

Critérios:
- confiável: fatos verificáveis e corretos
- inconclusiva: informação insuficiente ou ambígua
- sem fundamento: falso ou enganoso`;
}

// Configurar listener de mensagens principal
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('📨 Mensagem recebida:', request.action, request);
  console.log('🔍 Background script ativo e processando mensagem');

  (async () => {
    try {
      let response;
      console.log('🔄 Iniciando processamento da ação:', request.action);
      
      switch (request.action) {
        case 'getConfiguration':
        case 'getSettings':
          console.log('📋 Processando getConfiguration...');
          response = await handleGetConfiguration();
          break;
          
        case 'saveConfiguration':
        case 'updateSettings':
          console.log('💾 Processando saveConfiguration...');
          response = await handleSaveConfiguration(request.config);

          // Notificar content scripts sobre atualização de configurações
          if (response.success) {
            console.log('📢 Notificando content scripts sobre atualização de configurações...');
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' }).catch(() => {
                  // Ignorar erros para tabs que não têm content script
                });
              });
            });
          }
          break;
          
        case 'verifyText':
          console.log('🔍 Processando verifyText...');
          response = await handleVerifyTextWithGroq(request);
          break;
          
        case 'testGroqApi':
          console.log('🧪 Testando Groq API...');
          response = await testGroqApiKey(request.apiKey, request.model);
          break;

        case 'getQdrantStats':
          console.log('📊 Obtendo estatísticas do Qdrant...');
          response = await getQdrantStats();
          break;
          
        default:
          console.warn('⚠️ Ação não reconhecida:', request.action);
          response = { 
            success: false, 
            error: `Ação não reconhecida: ${request.action}` 
          };
      }
      
      console.log('📤 Enviando resposta:', response);
      sendResponse(response);
      
    } catch (error) {
      console.error('❌ Erro no background script:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  })();
  
  return true; // Manter canal aberto para resposta assíncrona
});

/**
 * Manipula obtenção de configuração
 */
async function handleGetConfiguration() {
  try {
    const result = await chrome.storage.sync.get(['veritasConfig']);
    const config = result.veritasConfig || DEFAULT_CONFIG;

    return {
      success: true,
      data: config,        // ✅ Mudado de 'config' para 'data'
      config: config,      // ✅ Mantido para compatibilidade com popup
      hasGroqKey: !!(config.groqApiKey && config.groqApiKey.length > 20)
    };
  } catch (error) {
    console.error('❌ Erro ao obter configuração:', error);
    return {
      success: false,
      error: error.message,
      data: DEFAULT_CONFIG,  // ✅ Mudado de 'config' para 'data'
      config: DEFAULT_CONFIG // ✅ Mantido para compatibilidade
    };
  }
}

/**
 * Manipula salvamento de configuração
 */
async function handleSaveConfiguration(newConfig) {
  try {
    const configToSave = { ...DEFAULT_CONFIG, ...newConfig };
    
    await chrome.storage.sync.set({ veritasConfig: configToSave });
    
    console.log('✅ Configuração salva:', configToSave);
    
    return {
      success: true,
      config: configToSave,
      message: 'Configuração salva com sucesso'
    };
  } catch (error) {
    console.error('❌ Erro ao salvar configuração:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Manipula verificação de texto usando apenas Groq AI
 */
async function handleVerifyTextWithGroq(request, retryCount = 0) {
  const startTime = Date.now();
  const text = request.text;
  const maxRetries = 2;

  console.log('🔍 Iniciando verificação com cache inteligente:', text.substring(0, 100) + '...', `(tentativa ${retryCount + 1}/${maxRetries + 1})`);

  try {
    // Obter configuração
    const configResult = await chrome.storage.sync.get(['veritasConfig']);
    const config = configResult.veritasConfig || DEFAULT_CONFIG;
    const groqApiKey = config.groqApiKey;
    const groqModel = config.groqModel || DEFAULT_CONFIG.groqModel;

    // Step 1: Check Qdrant for similar content first
    if (qdrantService && qdrantService.isServiceAvailable()) {
      console.log('🔍 Searching Qdrant for similar content...');

      const similarResult = await qdrantService.searchSimilar(text);

      if (similarResult && similarResult.fromCache) {
        console.log(`🎯 Found cached result with similarity: ${(similarResult.score * 100).toFixed(1)}%`);

        // Return cached result with enhanced metadata
        return {
          success: true,
          data: {
            classification: similarResult.payload.classification,
            confidence: Math.min(0.95, similarResult.payload.score || 0.4),
            summary: similarResult.payload.summary + ' (Cache inteligente)',
            sources: [`Groq AI (${getModelDisplayName(similarResult.payload.model_used)}) - Cached`],
            details: {
              strategy: 'qdrant-cache',
              processingTime: Date.now() - startTime,
              reasoning: similarResult.payload.reasoning,
              note: 'Resultado do cache de conhecimento baseado em similaridade semântica',
              cacheScore: similarResult.score,
              originalTimestamp: similarResult.payload.timestamp,
              fromCache: true
            }
          }
        };
      } else {
        console.log('🔍 No similar content found in cache, proceeding with LLM analysis...');
      }
    }

    console.log('🔑 Configuração carregada:', {
      hasConfig: !!config,
      hasGroqKey: !!(groqApiKey && groqApiKey.length > 20),
      groqModel: groqModel,
      isUserSelectedModel: !!config.groqModel,
      defaultModel: DEFAULT_CONFIG.groqModel
    });

    console.log(`🤖 Usando modelo: ${groqModel} ${config.groqModel ? '(selecionado pelo usuário)' : '(padrão)'}`);
    
    if (!groqApiKey || groqApiKey.trim() === '') {
      return {
        success: false,
        error: 'Groq API Key não configurada',
        data: {
          classification: 'erro',
          confidence: 0.0,
          summary: 'Configure sua Groq API Key nas opções da extensão para usar a verificação de fatos.',
          sources: ['VeritasAI (Configuração)'],
          details: {
            strategy: 'no-api-key',
            processingTime: Date.now() - startTime,
            note: 'Groq API Key necessária para verificação'
          }
        }
      };
    }

    console.log('🤖 Fazendo requisição para Groq API...');
    console.log(`🎯 Modelo selecionado para requisição: ${groqModel}`);

    // Criar AbortController para timeout otimizado
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000); // 20 segundos timeout

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'VeritasAI/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: groqModel,
          messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          {
            role: 'user',
            content: `Analise este texto: "${text}"`
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stop: ["}"]
      })
    });

    // Tratamento específico para erro 429 (Rate Limit)
    if (response.status === 429) {
      console.warn('⚠️ Groq API: Limite de requisições atingido (429)');

      return {
        success: true,
        data: {
          classification: 'inconclusiva',
          confidence: 0.3,
          summary: 'Limite diário de verificações atingido. Os créditos da API Groq serão renovados automaticamente amanhã. Tente novamente em algumas horas.',
          sources: ['VeritasAI (Limite Atingido)'],
          details: {
            strategy: 'groq-rate-limited',
            processingTime: Date.now() - startTime,
            error: 'Rate limit exceeded (429)',
            note: 'Créditos diários esgotados. Renovação automática amanhã.'
          }
        }
      };
    }

    // Tratamento específico para erro 499 (Client Closed Request)
    if (response.status === 499) {
      console.warn('⚠️ Groq API: Requisição cancelada (499)');

      return {
        success: true,
        data: {
          classification: 'inconclusiva',
          confidence: 0.2,
          summary: 'A requisição foi cancelada. Isso pode acontecer devido a timeout ou problemas de conectividade. Tente novamente.',
          sources: ['VeritasAI (Timeout)'],
          details: {
            strategy: 'groq-timeout',
            processingTime: Date.now() - startTime,
            error: 'Client closed request (499)',
            note: 'Requisição cancelada - tente novamente'
          }
        }
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Erro da Groq API:', errorData);
      throw new Error(`Groq API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Resposta vazia do Groq');
    }

    console.log('📊 Resposta da Groq recebida:', aiResponse.substring(0, 100) + '...');
    console.log('🔍 Resposta completa da Groq:', aiResponse);

    // Função para extrair JSON da resposta
    function extractAndParseJSON(response) {
      // Tentar encontrar JSON válido na resposta
      let jsonStr = response.trim();

      // Remover markdown code blocks se existirem
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      jsonStr = jsonStr.replace(/```\s*/g, '');

      // Tentar encontrar JSON entre chaves
      const jsonMatch = jsonStr.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonStr);
        console.log('✅ JSON parseado com sucesso:', parsed);
        return parsed;
      } catch (e) {
        console.warn('⚠️ Fallback: extraindo campos manualmente da resposta');

        // Fallback para extrair campos
        const classificationMatch = response.match(/"classification":\s*"([^"]+)"/i);
        const scoreMatch = response.match(/"score":\s*([0-9.]+)/i);
        const summaryMatch = response.match(/"summary":\s*"([^"]+)"/i);
        const reasoningMatch = response.match(/"reasoning":\s*"([^"]+)"/i);

        const fallbackResult = {
          classification: classificationMatch ? classificationMatch[1] : 'inconclusiva',
          score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
          confidence: scoreMatch ? parseFloat(scoreMatch[1]) : 0.4,
          summary: summaryMatch ? summaryMatch[1] : response.substring(0, 150) + '...',
          reasoning: reasoningMatch ? reasoningMatch[1] : 'Parsing manual aplicado'
        };

        return fallbackResult;
      }
    }

    // Tentar parsear resposta JSON
    let analysis;
    try {
      analysis = extractAndParseJSON(aiResponse);
      console.log('✅ JSON parseado com sucesso:', analysis);
    } catch (parseError) {
      console.warn('⚠️ Erro ao parsear resposta do Groq, usando fallback completo');
      console.error('🔍 Erro de parsing:', parseError);
      console.log('🔍 Resposta que causou erro:', aiResponse);

      analysis = {
        classification: 'inconclusiva',
        score: null,
        confidence: null, // Será tratado na validação
        summary: 'Não foi possível processar a resposta da IA. Resposta original: ' + aiResponse.substring(0, 100) + '...',
        reasoning: 'Erro no processamento da resposta'
      };
    }

    // Validar e normalizar campos
    const validClassifications = ['confiável', 'provável', 'inconclusiva', 'duvidosa', 'sem fundamento', 'fake'];
    let classification = analysis.classification || 'inconclusiva';

    // Normalizar classificação para valores válidos
    if (!validClassifications.includes(classification.toLowerCase())) {
      console.warn('⚠️ Classificação inválida recebida:', classification);
      classification = 'inconclusiva';
    }

    // Validar score/confiança (0-1)
    // Priorizar 'score' se disponível, senão usar 'confidence'
    let confidence = parseFloat(analysis.score) || parseFloat(analysis.confidence) || null;

    console.log('🔍 Debug score/confidence:', {
      rawScore: analysis.score,
      rawConfidence: analysis.confidence,
      parsedConfidence: confidence,
      analysisObject: analysis
    });

    if (confidence === null || isNaN(confidence) || confidence < 0 || confidence > 1) {
      console.warn('⚠️ Score/Confiança inválida recebida:', {
        score: analysis.score,
        confidence: analysis.confidence,
        parsed: confidence
      });
      confidence = 0.4; // Fallback apenas quando realmente necessário
    }

    // Validar summary
    let summary = analysis.summary || 'Análise realizada por IA';
    if (typeof summary !== 'string' || summary.length < 10) {
      summary = 'Análise concluída. Classificação: ' + classification;
    }

    // Limitar tamanho do summary
    if (summary.length > 300) {
      summary = summary.substring(0, 297) + '...';
    }

    const finalConfidence = Math.min(0.95, confidence);

    console.log('✅ Score final calculado:', {
      originalScore: analysis.score,
      originalConfidence: analysis.confidence,
      processedConfidence: confidence,
      finalConfidence: finalConfidence,
      classification: classification
    });

    // Step 3: Store result in Qdrant for future similarity searches
    if (qdrantService && qdrantService.isServiceAvailable()) {
      console.log('💾 Storing result in Qdrant for future cache...');

      const metadata = {
        model: groqModel,
        url: request.url || '',
        domain: request.domain || '',
        language: 'pt-BR'
      };

      // Store asynchronously (don't wait for completion)
      qdrantService.storeResult(text, {
        classification: classification,
        score: finalConfidence,
        summary: summary,
        reasoning: analysis.reasoning || 'Análise baseada em IA'
      }, metadata).catch(error => {
        console.warn('⚠️ Failed to store in Qdrant (non-blocking):', error.message);
      });
    }

    return {
      success: true,
      data: {
        classification: classification,
        confidence: finalConfidence, // Máximo 95% para manter humildade
        summary: summary,
        sources: [`Groq AI (${getModelDisplayName(groqModel)})`],
        details: {
          strategy: 'groq-ai',
          processingTime: Date.now() - startTime,
          reasoning: analysis.reasoning || 'Análise baseada em IA',
          note: 'Análise realizada por inteligência artificial',
          rawResponse: aiResponse.substring(0, 200) + '...', // Para debug
          originalScore: analysis.score, // Score original da IA
          scoreUsed: confidence, // Score efetivamente usado
          storedInCache: qdrantService && qdrantService.isServiceAvailable()
        }
      }
    };

  } catch (error) {
    console.error('❌ Erro na verificação:', error);

    // Limpar timeout se ainda estiver ativo
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Verificar se deve tentar novamente
    if (retryCount < maxRetries && (error.name === 'AbortError' || error.message.includes('fetch'))) {
      console.log(`🔄 Tentando novamente... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Delay progressivo
      return handleVerifyTextWithGroq(request, retryCount + 1);
    }

    // Verificar se é erro de timeout/abort
    if (error.name === 'AbortError') {
      return {
        success: true,
        data: {
          classification: 'inconclusiva',
          confidence: 0.2,
          summary: 'Timeout na verificação. A requisição demorou muito para responder. Tente novamente.',
          sources: ['VeritasAI (Timeout)'],
          details: {
            strategy: 'groq-timeout',
            processingTime: Date.now() - startTime,
            error: 'Request timeout (20s)',
            note: 'Requisição cancelada por timeout'
          }
        }
      };
    }

    // Verificar se é erro de rate limit não capturado
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return {
        success: true,
        data: {
          classification: 'inconclusiva',
          confidence: 0.3,
          summary: 'Limite de uso da API atingido. Tente novamente amanhã quando os créditos forem renovados.',
          sources: ['VeritasAI (Limite Atingido)'],
          details: {
            strategy: 'groq-rate-limited',
            processingTime: Date.now() - startTime,
            error: error.message,
            note: 'Créditos diários da API Groq esgotados'
          }
        }
      };
    }

    return {
      success: false,
      error: error.message,
      data: {
        classification: 'erro',
        confidence: 0.0,
        summary: `Erro na verificação: ${error.message}`,
        sources: ['VeritasAI (Erro)'],
        details: {
          strategy: 'groq-error',
          processingTime: Date.now() - startTime,
          error: error.message,
          note: 'Erro ao conectar com a API Groq'
        }
      }
    };
  }
}

/**
 * Obtém estatísticas do Qdrant
 */
async function getQdrantStats() {
  try {
    if (!qdrantService || !qdrantService.isServiceAvailable()) {
      return {
        success: false,
        error: 'Qdrant service not available',
        data: {
          available: false,
          message: 'Qdrant vector database is not connected. Install and run Qdrant locally for enhanced caching.'
        }
      };
    }

    const stats = await qdrantService.getStats();

    if (stats) {
      return {
        success: true,
        data: {
          available: true,
          total_points: stats.total_points,
          indexed_points: stats.indexed_points,
          status: stats.status,
          similarity_threshold: qdrantService.similarityThreshold,
          message: `Knowledge base contains ${stats.total_points} fact-checked items`
        }
      };
    } else {
      return {
        success: false,
        error: 'Failed to get Qdrant statistics',
        data: {
          available: false,
          message: 'Unable to retrieve Qdrant statistics'
        }
      };
    }
  } catch (error) {
    console.error('❌ Error getting Qdrant stats:', error);
    return {
      success: false,
      error: error.message,
      data: {
        available: false,
        message: 'Error connecting to Qdrant vector database'
      }
    };
  }
}

/**
 * Testa se a API Key do Groq é válida
 */
async function testGroqApiKey(apiKey, model = DEFAULT_CONFIG.groqModel) {
  console.log('🧪 Testando Groq API Key:', apiKey?.substring(0, 10) + '...', 'Modelo:', model);

  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      error: 'API Key não fornecida',
      details: 'Por favor, insira uma Groq API Key válida'
    };
  }

  try {
    // Fazer uma requisição simples para testar a API Key
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: 'Teste de conectividade. Responda apenas "OK".'
          }
        ],
        max_tokens: 10
      })
    });

    if (response.ok) {
      await response.json();
      return {
        success: true,
        message: 'Groq API Key válida e funcionando!',
        details: `Teste realizado com sucesso. Modelo: ${model}`
      };
    } else if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limit atingido',
        details: 'API Key válida, mas limite de requisições atingido. Tente novamente mais tarde.'
      };
    } else {
      const errorData = await response.json().catch(() => null);

      if (response.status === 401) {
        return {
          success: false,
          error: 'API Key inválida',
          details: 'Verifique se a Groq API Key está correta'
        };
      }

      return {
        success: false,
        error: `Erro HTTP ${response.status}`,
        details: errorData?.error?.message || response.statusText
      };
    }

  } catch (error) {
    console.error('❌ Erro no teste da Groq API:', error);
    return {
      success: false,
      error: 'Erro de conexão',
      details: error.message
    };
  }
}

// Listeners de instalação e inicialização
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🎉 Extensão instalada/atualizada:', details.reason);
});

console.log('✅ Background Service carregado e listeners ativos (Groq Only)');
