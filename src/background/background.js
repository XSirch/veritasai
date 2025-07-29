/**
 * VeritasAI - Background Service Worker (Groq Only)
 * Versão simplificada usando apenas Groq AI
 */

console.log('🚀 VeritasAI Background Service iniciando (Groq Only)...');

// Configuração padrão - apenas Groq AI
const DEFAULT_CONFIG = {
  groqApiKey: '',
  groqModel: 'llama3-70b-8192', // Modelo padrão atualizado
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

// Configurar listener de mensagens principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensagem recebida:', request.action, request);
  
  (async () => {
    try {
      let response;
      
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
async function handleVerifyTextWithGroq(request) {
  const startTime = Date.now();
  const text = request.text;
  
  console.log('🔍 Iniciando verificação com Groq AI:', text.substring(0, 100) + '...');
  
  try {
    // Obter configuração
    const configResult = await chrome.storage.sync.get(['veritasConfig']);
    const config = configResult.veritasConfig || DEFAULT_CONFIG;
    const groqApiKey = config.groqApiKey;
    const groqModel = config.groqModel || DEFAULT_CONFIG.groqModel;

    console.log('🔑 Configuração carregada:', {
      hasConfig: !!config,
      hasGroqKey: !!(groqApiKey && groqApiKey.length > 20),
      groqModel: groqModel
    });
    
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
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em verificação de fatos. Analise o texto fornecido e determine:
1. Se é uma afirmação factual verificável
2. Sua veracidade baseada em conhecimento geral
3. Nível de confiança na análise

Responda APENAS em formato JSON:
{
  "classification": "confiável|inconclusiva|sem fundamento",
  "confidence": 0.0-1.0,
  "summary": "Explicação detalhada da análise",
  "reasoning": "Justificativa da classificação"
}`
          },
          {
            role: 'user',
            content: `Analise este texto: "${text}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
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

    // Tentar parsear resposta JSON
    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('⚠️ Erro ao parsear resposta do Groq, usando fallback');
      analysis = {
        classification: 'inconclusiva',
        confidence: 0.4,
        summary: aiResponse.substring(0, 200) + '...',
        reasoning: 'Análise baseada em IA'
      };
    }

    return {
      success: true,
      data: {
        classification: analysis.classification || 'inconclusiva',
        confidence: Math.min(0.9, analysis.confidence || 0.4),
        summary: analysis.summary || 'Análise realizada por IA',
        sources: ['Groq AI (Llama 3.1)'],
        details: {
          strategy: 'groq-ai',
          processingTime: Date.now() - startTime,
          reasoning: analysis.reasoning,
          note: 'Análise realizada por inteligência artificial'
        }
      }
    };

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    
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
      const data = await response.json();
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
