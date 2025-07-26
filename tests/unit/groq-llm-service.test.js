/**
 * Testes unitários para GroqLLMService
 * Testa integração com Groq API, fallbacks e cost tracking
 */

const GroqLLMService = require('../../src/services/groq-llm-service');

// Mock do fetch global
global.fetch = jest.fn();

describe('GroqLLMService', () => {
  let service;
  
  beforeEach(() => {
    service = new GroqLLMService({
      apiKey: 'test-api-key',
      cacheEnabled: false, // Desabilitar para evitar timers
      rateLimitEnabled: false, // Desabilitar para testes
      costTrackingEnabled: true
    });

    // Limpar mocks
    fetch.mockClear();
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      const defaultService = new GroqLLMService();
      
      expect(defaultService).toBeInstanceOf(GroqLLMService);
      expect(defaultService.options.defaultModel).toBe('mixtral-8x7b-32768');
      expect(defaultService.options.maxTokens).toBe(1024);
      expect(defaultService.options.temperature).toBe(0.1);
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customService = new GroqLLMService({
        defaultModel: 'llama3-8b-8192',
        maxTokens: 512,
        temperature: 0.5,
        cacheEnabled: false
      });
      
      expect(customService.options.defaultModel).toBe('llama3-8b-8192');
      expect(customService.options.maxTokens).toBe(512);
      expect(customService.options.temperature).toBe(0.5);
      expect(customService.options.cacheEnabled).toBe(false);
    });
    
    test('deve validar modelo padrão inválido', () => {
      const service = new GroqLLMService({
        defaultModel: 'modelo-inexistente'
      });
      
      expect(service.options.defaultModel).toBe('mixtral-8x7b-32768');
    });
    
    test('deve limitar maxTokens excessivo', () => {
      const service = new GroqLLMService({
        maxTokens: 10000
      });
      
      expect(service.options.maxTokens).toBe(4096);
    });
  });
  
  describe('Análise para fact-checking', () => {
    test('deve fazer análise básica com sucesso', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"classificacao_geral": "VERIFICADO", "confianca_geral": 85, "resumo": "Análise concluída"}'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.analyzeForFactCheck('Texto para análise de teste');
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.source).toBe('groq_llm');
      expect(result.model).toBe('mixtral-8x7b-32768');
      expect(result.structuredData).toBeDefined();
    });
    
    test('deve rejeitar entrada inválida', async () => {
      const result1 = await service.analyzeForFactCheck('');
      expect(result1.success).toBe(false);
      
      const result2 = await service.analyzeForFactCheck('ab'); // Muito curto
      expect(result2.success).toBe(false);
      
      const result3 = await service.analyzeForFactCheck('a'.repeat(11000)); // Muito longo
      expect(result3.success).toBe(false);
    });
    
    test('deve usar cache para análises repetidas', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Análise de teste' },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 100 }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const text = 'Texto para teste de cache';
      
      // Primeira chamada
      const result1 = await service.analyzeForFactCheck(text);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1.cached).toBeUndefined();
      
      // Segunda chamada (deve usar cache)
      const result2 = await service.analyzeForFactCheck(text);
      expect(fetch).toHaveBeenCalledTimes(1); // Não deve fazer nova requisição
      expect(result2.cached).toBe(true);
      expect(result2.source).toBe('cache');
    });
  });
  
  describe('Sistema de fallback', () => {
    test('deve usar fallback quando modelo principal falha', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Modelo principal falhou'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Fallback funcionou' }, finish_reason: 'stop' }],
            usage: { total_tokens: 100 }
          })
        });
      
      const result = await service.analyzeWithFallback('Teste de fallback');
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.modelUsed).not.toBe(service.options.defaultModel);
    });
    
    test('deve usar estratégia de fallback otimizada por custo', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Análise' }, finish_reason: 'stop' }],
        usage: { total_tokens: 100 }
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.analyzeWithFallback('Texto longo para teste de fallback', {
        fallbackStrategy: 'cost_optimized'
      });

      expect(result.success).toBe(true);
      expect(result.fallbackStrategy).toBe('cost_optimized');
    });
    
    test('deve falhar quando todos os modelos falharem', async () => {
      fetch.mockRejectedValue(new Error('Todos os modelos falharam'));
      
      await expect(service.analyzeWithFallback('Teste')).rejects.toThrow();
    });
  });
  
  describe('Análise ensemble', () => {
    test('deve combinar resultados de múltiplos modelos', async () => {
      const mockResponse1 = {
        choices: [{
          message: { content: '{"classificacao": "VERIFICADO", "confianca": 80}' },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 100 }
      };
      
      const mockResponse2 = {
        choices: [{
          message: { content: '{"classificacao": "VERIFICADO", "confianca": 90}' },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 120 }
      };
      
      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse1) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse2) });
      
      const result = await service.analyzeWithEnsemble('Teste ensemble', {
        models: ['mixtral-8x7b-32768', 'llama3-8b-8192']
      });
      
      expect(result.ensembleUsed).toBe(true);
      expect(result.modelsUsed).toHaveLength(2);
      expect(result.individualResults).toHaveLength(2);
    });
    
    test('deve falhar quando todos os modelos do ensemble falharem', async () => {
      fetch.mockRejectedValue(new Error('Erro na API'));

      await expect(service.analyzeWithEnsemble('Texto longo para teste de ensemble', {
        models: ['mixtral-8x7b-32768', 'llama3-8b-8192']
      })).rejects.toThrow();
    });
  });
  
  describe('Classificação de credibilidade', () => {
    test('deve classificar credibilidade de uma afirmação', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"classificacao": "ALTA_CREDIBILIDADE", "confianca": 85, "justificativa": "Afirmação bem fundamentada"}'
          },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 100 }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.classifyCredibility('O céu é azul');
      
      expect(result.success).toBe(true);
      expect(result.classification).toBeDefined();
      expect(result.classification.classification).toBeDefined();
    });
  });
  
  describe('Extração de claims', () => {
    test('deve extrair claims verificáveis de um texto', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"claims_encontrados": [{"texto": "Claim extraído", "tipo": "estatistica", "prioridade": "alta"}], "resumo": {"total_claims": 1}}'
          },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 150 }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.extractClaims('Texto com claims para extrair');
      
      expect(result.success).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.claims.claims).toHaveLength(1);
    });
  });
  
  describe('Cost tracking', () => {
    test('deve rastrear custos corretamente', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Análise' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      await service.analyzeForFactCheck('Teste de custo');
      
      const stats = service.getStats();
      expect(stats.costs.enabled).not.toBe(false);
      expect(stats.costs.summary.totalRequests).toBeGreaterThan(0);
    });
    
    test('deve fornecer recomendações de otimização', () => {
      const recommendations = service.getCostOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
    
    test('deve resetar tracking de custos', () => {
      const result = service.resetCostTracking();
      expect(result.reset).toBe(true);
    });
  });
  
  describe('Tratamento de erros', () => {
    test('deve tratar erro HTTP 401', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      
      const result = await service.analyzeForFactCheck('Teste erro 401');
      expect(result.success).toBe(false);
    });
    
    test('deve tratar erro de rede', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await service.analyzeForFactCheck('Teste erro rede');
      expect(result.success).toBe(false);
    });
    
    test('deve fazer retry em erros temporários', async () => {
      const retryService = new GroqLLMService({
        apiKey: 'test-key',
        retryAttempts: 2
      });
      
      fetch
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Sucesso após retry' }, finish_reason: 'stop' }],
            usage: { total_tokens: 100 }
          })
        });
      
      const result = await retryService.analyzeForFactCheck('Teste retry');
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });
  
  describe('Informações de modelos', () => {
    test('deve fornecer informações sobre modelos disponíveis', () => {
      const modelsInfo = service.getModelsInfo();
      
      expect(modelsInfo.available).toBeDefined();
      expect(modelsInfo.default).toBe('mixtral-8x7b-32768');
      expect(modelsInfo.fallbackOrder).toBeInstanceOf(Array);
      expect(modelsInfo.fallbackOrder.length).toBeGreaterThan(0);
    });
  });
  
  describe('Estatísticas', () => {
    test('deve fornecer estatísticas completas', () => {
      const stats = service.getStats();
      
      expect(stats.config).toBeDefined();
      expect(stats.costs).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.rateLimit).toBeDefined();
      
      expect(stats.config.apiKeyConfigured).toBe(true);
      expect(stats.config.defaultModel).toBe('mixtral-8x7b-32768');
      expect(stats.config.modelsAvailable).toBe(3);
    });
  });
  
  describe('Configuração', () => {
    test('deve detectar API key não configurada', () => {
      const serviceWithoutKey = new GroqLLMService({});
      
      const stats = serviceWithoutKey.getStats();
      expect(stats.config.apiKeyConfigured).toBe(false);
    });
    
    test('deve usar variável de ambiente para API key', () => {
      process.env.GROQ_API_KEY = 'env-api-key';
      
      const serviceFromEnv = new GroqLLMService();
      expect(serviceFromEnv.apiKey).toBe('env-api-key');
      
      delete process.env.GROQ_API_KEY;
    });
  });
});
