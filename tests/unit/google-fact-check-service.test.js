/**
 * Testes unitários para GoogleFactCheckService
 * Testa integração com Google Fact Check API, cache e rate limiting
 */

const GoogleFactCheckService = require('../../src/services/google-fact-check-service');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Mock do fetch global
global.fetch = jest.fn();

describe('GoogleFactCheckService', () => {
  let service;
  
  beforeEach(() => {
    service = new GoogleFactCheckService({
      apiKey: process.env.GOOGLE_FACT_CHECK_API_KEY || 'test-api-key',
      cacheEnabled: true,
      rateLimitEnabled: false // Desabilitar para testes
    });

    // Limpar mocks
    fetch.mockClear();
    service.clearCache();
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      const defaultService = new GoogleFactCheckService();
      
      expect(defaultService).toBeInstanceOf(GoogleFactCheckService);
      expect(defaultService.options.maxResults).toBe(10);
      expect(defaultService.options.timeout).toBe(10000);
      expect(defaultService.options.cacheEnabled).toBe(true);
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customService = new GoogleFactCheckService({
        maxResults: 5,
        timeout: 5000,
        cacheEnabled: false
      });
      
      expect(customService.options.maxResults).toBe(5);
      expect(customService.options.timeout).toBe(5000);
      expect(customService.options.cacheEnabled).toBe(false);
    });
    
    test('deve validar maxResults máximo', () => {
      const service = new GoogleFactCheckService({
        maxResults: 100
      });
      
      expect(service.options.maxResults).toBe(50);
    });
  });
  
  describe('Verificação de fatos', () => {
    test('deve fazer requisição para API com query simples', async () => {
      const mockResponse = {
        claims: [{
          text: 'Test claim',
          claimant: 'Test claimant',
          claimReview: [{
            publisher: { name: 'Test Publisher' },
            textualRating: 'True',
            url: 'https://test.com'
          }]
        }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.checkFacts('test query');
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.found).toBe(true);
      expect(result.claims).toHaveLength(1);
      expect(result.source).toBe('google_fact_check');
    });
    
    test('deve normalizar query de array para string', async () => {
      const mockResponse = { claims: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      await service.checkFacts(['palavra1', 'palavra2', 'palavra3']);

      // Verificar se fetch foi chamado
      expect(fetch).toHaveBeenCalled();

      if (fetch.mock.calls.length > 0) {
        const calledUrl = fetch.mock.calls[0][0];
        // Aceitar tanto %20 quanto + para espaços
        expect(calledUrl).toMatch(/query=palavra1[%20+]palavra2[%20+]palavra3/);
      }
    });
    
    test('deve retornar resposta vazia quando não há claims', async () => {
      const mockResponse = { claims: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.checkFacts('query sem resultados');
      
      expect(result.success).toBe(true);
      expect(result.found).toBe(false);
      expect(result.claims).toHaveLength(0);
      expect(result.message).toContain('Nenhuma verificação encontrada');
    });
    
    test('deve rejeitar entrada inválida', async () => {
      const result1 = await service.checkFacts(null);
      expect(result1.success).toBe(false);

      const result2 = await service.checkFacts(123);
      expect(result2.success).toBe(false);

      const result3 = await service.checkFacts('');
      expect(result3.success).toBe(false);
    });
  });
  
  describe('Cache', () => {
    test('deve usar cache para queries repetidas', async () => {
      const mockResponse = {
        claims: [{
          text: 'Cached claim',
          claimReview: [{ textualRating: 'True' }]
        }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      // Primeira chamada
      const result1 = await service.checkFacts('cached query');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1.cached).toBeUndefined();
      
      // Segunda chamada (deve usar cache)
      const result2 = await service.checkFacts('cached query');
      expect(fetch).toHaveBeenCalledTimes(1); // Não deve fazer nova requisição
      expect(result2.cached).toBe(true);
      expect(result2.source).toBe('cache');
    });
    
    test('deve atualizar estatísticas de cache', async () => {
      const mockResponse = { claims: [] };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Primeira chamada (miss)
      await service.checkFacts('query1');

      // Segunda chamada mesma query (hit)
      await service.checkFacts('query1');

      // Terceira chamada query diferente (miss)
      await service.checkFacts('query2');

      const stats = service.getStats();
      expect(stats.cache.hits).toBeGreaterThan(0);
      expect(stats.cache.misses).toBeGreaterThan(0);
      expect(stats.cache.hitRate).toBeDefined();
    });
    
    test('deve limpar cache corretamente', async () => {
      const mockResponse = { claims: [] };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await service.checkFacts('query para cache');

      let stats = service.getStats();
      expect(stats.cache.size).toBeGreaterThan(0);

      service.clearCache();

      stats = service.getStats();
      expect(stats.cache.size).toBe(0);
    });
  });
  
  describe('Rate Limiting', () => {
    test('deve respeitar rate limiting quando habilitado', async () => {
      const rateLimitedService = new GoogleFactCheckService({
        apiKey: 'test-key',
        rateLimitEnabled: true,
        cacheEnabled: false
      });
      
      const mockResponse = { claims: [] };
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      // Fazer muitas requisições rapidamente
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(rateLimitedService.checkFacts(`query ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      // Todas devem ter sucesso
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      const stats = rateLimitedService.getStats();
      expect(stats.rateLimit.enabled).toBe(true);
    });
  });
  
  describe('Processamento em lote', () => {
    test('deve processar múltiplas queries em lote', async () => {
      const mockResponse = { claims: [] };
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const queries = ['query1', 'query2', 'query3'];
      const results = await service.checkFactsBatch(queries, { batchSize: 2 });
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
    
    test('deve tratar erros em lote graciosamente', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: [] })
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: [] })
        });
      
      const queries = ['query1', 'query2', 'query3'];
      const results = await service.checkFactsBatch(queries);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
  
  describe('Tratamento de erros', () => {
    test('deve tratar erro HTTP 401', async () => {
      // Simular erro de fetch que lança exceção
      fetch.mockRejectedValueOnce(new Error('HTTP 401: Unauthorized'));

      const result = await service.checkFacts('test query');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    test('deve tratar erro HTTP 429 (rate limit)', async () => {
      // Simular erro de fetch que lança exceção
      fetch.mockRejectedValueOnce(new Error('HTTP 429: Too Many Requests'));

      const result = await service.checkFacts('test query');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    test('deve tratar erro de rede', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await service.checkFacts('test query');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
    
    test('deve fazer retry em caso de erro temporário', async () => {
      const retryService = new GoogleFactCheckService({
        apiKey: 'test-key',
        retryAttempts: 2,
        retryDelay: 10
      });
      
      fetch
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: [] })
        });
      
      const result = await retryService.checkFacts('test query');
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });
  
  describe('Processamento de claims', () => {
    test('deve processar claim com todas as informações', async () => {
      const mockResponse = {
        claims: [{
          text: 'Test claim text',
          claimant: 'Test Claimant',
          claimDate: '2024-01-15',
          claimReview: [{
            publisher: {
              name: 'Test Publisher',
              site: 'test.com'
            },
            url: 'https://test.com/fact-check',
            title: 'Fact Check Title',
            reviewDate: '2024-01-16',
            textualRating: 'Mostly True',
            languageCode: 'pt'
          }]
        }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.checkFacts('test query');
      
      expect(result.claims).toHaveLength(1);
      
      const claim = result.claims[0];
      expect(claim.text).toBe('Test claim text');
      expect(claim.claimant).toBe('Test Claimant');
      expect(claim.publisher.name).toBe('Test Publisher');
      expect(claim.textualRating).toBe('Mostly True');
      expect(claim.confidence).toBeGreaterThan(0);
    });
    
    test('deve calcular confiança baseada no rating', async () => {
      const testCases = [
        { rating: 'True', expectedMin: 0.8 },
        { rating: 'False', expectedMax: 0.2 },
        { rating: 'Half True', expected: 0.5 },
        { rating: 'Unknown Rating', expected: 0.5 }
      ];
      
      for (const testCase of testCases) {
        const mockResponse = {
          claims: [{
            text: 'Test',
            claimReview: [{
              textualRating: testCase.rating,
              publisher: { name: 'Test' }
            }]
          }]
        };
        
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });
        
        const result = await service.checkFacts('test');
        const confidence = result.claims[0].confidence;
        
        if (testCase.expectedMin) {
          expect(confidence).toBeGreaterThanOrEqual(testCase.expectedMin);
        } else if (testCase.expectedMax) {
          expect(confidence).toBeLessThanOrEqual(testCase.expectedMax);
        } else {
          expect(confidence).toBe(testCase.expected);
        }
      }
    });
  });
  
  describe('Resumo e análise', () => {
    test('deve gerar resumo correto para múltiplos claims', async () => {
      const mockResponse = {
        claims: [
          {
            text: 'Claim 1',
            claimReview: [{ textualRating: 'True' }]
          },
          {
            text: 'Claim 2',
            claimReview: [{ textualRating: 'False' }]
          },
          {
            text: 'Claim 3',
            claimReview: [{ textualRating: 'Half True' }]
          }
        ]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await service.checkFacts('multiple claims');
      
      expect(result.summary.total).toBe(3);
      expect(result.summary.verified).toBe(1);
      expect(result.summary.disputed).toBe(1);
      expect(result.summary.mixed).toBe(1);
    });
  });
  
  describe('Estatísticas', () => {
    test('deve fornecer estatísticas completas', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('rateLimit');
      expect(stats).toHaveProperty('config');
      
      expect(stats.cache).toHaveProperty('size');
      expect(stats.cache).toHaveProperty('hitRate');
      expect(stats.config).toHaveProperty('apiKeyConfigured');
    });
  });
  
  describe('Configuração', () => {
    test('deve detectar API key não configurada', () => {
      // Temporariamente remover a API key do ambiente
      const originalKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
      delete process.env.GOOGLE_FACT_CHECK_API_KEY;

      const serviceWithoutKey = new GoogleFactCheckService({});

      // Deve funcionar mas mostrar warning
      expect(serviceWithoutKey.apiKey).toBeUndefined();

      // Restaurar a API key
      if (originalKey) {
        process.env.GOOGLE_FACT_CHECK_API_KEY = originalKey;
      }
    });
    
    test('deve usar variável de ambiente para API key', () => {
      process.env.GOOGLE_FACT_CHECK_API_KEY = 'env-api-key';
      
      const serviceFromEnv = new GoogleFactCheckService();
      
      expect(serviceFromEnv.apiKey).toBe('env-api-key');
      
      delete process.env.GOOGLE_FACT_CHECK_API_KEY;
    });
  });
});
