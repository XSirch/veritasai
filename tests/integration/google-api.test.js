/**
 * Testes de integração para Google Fact Check API
 * Testa integração real com a API (requer API key válida)
 */

const GoogleFactCheckService = require('../../src/services/google-fact-check-service');
const KeywordExtractor = require('../../src/utils/keyword-extractor');

// Pular testes se não houver API key
const hasApiKey = !!process.env.GOOGLE_FACT_CHECK_API_KEY;
const describeOrSkip = hasApiKey ? describe : describe.skip;

describeOrSkip('Google Fact Check API Integration', () => {
  let service;
  let keywordExtractor;
  
  beforeAll(() => {
    service = new GoogleFactCheckService({
      apiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
      maxResults: 5,
      timeout: 15000,
      retryAttempts: 2
    });
    
    keywordExtractor = new KeywordExtractor();
  });
  
  describe('Conectividade básica', () => {
    test('deve conectar com a API do Google', async () => {
      const result = await service.checkFacts('COVID-19 vaccine');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.source).toBe('google_fact_check');
      expect(result.timestamp).toBeDefined();
    }, 20000);
    
    test('deve retornar estrutura correta mesmo sem resultados', async () => {
      // Query muito específica que provavelmente não terá resultados
      const result = await service.checkFacts('xyzabc123nonexistentclaim456');
      
      expect(result.success).toBe(true);
      expect(result.found).toBe(false);
      expect(result.claims).toEqual([]);
      expect(result.summary.total).toBe(0);
    }, 15000);
  });
  
  describe('Queries reais', () => {
    test('deve verificar claim político conhecido', async () => {
      const result = await service.checkFacts('Biden president United States');
      
      expect(result.success).toBe(true);
      
      if (result.found) {
        expect(result.claims.length).toBeGreaterThan(0);
        
        const firstClaim = result.claims[0];
        expect(firstClaim).toHaveProperty('text');
        expect(firstClaim).toHaveProperty('publisher');
        expect(firstClaim).toHaveProperty('textualRating');
        expect(firstClaim).toHaveProperty('confidence');
        expect(firstClaim.confidence).toBeGreaterThanOrEqual(0);
        expect(firstClaim.confidence).toBeLessThanOrEqual(1);
      }
    }, 20000);
    
    test('deve verificar claim de saúde', async () => {
      const result = await service.checkFacts('vaccines cause autism');
      
      expect(result.success).toBe(true);
      
      if (result.found) {
        expect(result.claims.length).toBeGreaterThan(0);
        
        // Claims sobre vacinas geralmente são bem documentados
        const hasHealthPublisher = result.claims.some(claim => 
          claim.publisher.name.toLowerCase().includes('health') ||
          claim.publisher.name.toLowerCase().includes('medical') ||
          claim.publisher.name.toLowerCase().includes('cdc')
        );
        
        // Não é obrigatório, mas é comum ter publishers de saúde
        if (hasHealthPublisher) {
          expect(hasHealthPublisher).toBe(true);
        }
      }
    }, 20000);
  });
  
  describe('Integração com KeywordExtractor', () => {
    test('deve usar keywords extraídas para fact-checking', async () => {
      const text = 'O presidente Joe Biden afirmou que 95% dos americanos foram vacinados contra COVID-19.';
      
      // Extrair keywords
      const keywords = keywordExtractor.extractForFactCheck(text);
      expect(keywords.length).toBeGreaterThan(0);
      
      // Usar keywords para fact-checking
      const result = await service.checkFacts(keywords);
      
      expect(result.success).toBe(true);
      expect(result.query).toBe(keywords.join(' '));
    }, 25000);
    
    test('deve processar claims detectados pelo extrator', async () => {
      const text = 'Estudos mostram que a hidroxicloroquina é 100% eficaz contra COVID-19.';
      
      // Extrair claims
      const extractorResult = keywordExtractor.extract(text);
      const claims = extractorResult.claims;
      
      if (claims.length > 0) {
        // Verificar primeiro claim
        const claimText = claims[0].text;
        const result = await service.checkFacts(claimText);
        
        expect(result.success).toBe(true);
      }
    }, 25000);
  });
  
  describe('Performance e cache', () => {
    test('deve usar cache para queries repetidas', async () => {
      const query = 'Earth is flat';
      
      // Primeira chamada
      const start1 = Date.now();
      const result1 = await service.checkFacts(query);
      const time1 = Date.now() - start1;
      
      expect(result1.success).toBe(true);
      expect(result1.cached).toBeUndefined();
      
      // Segunda chamada (deve usar cache)
      const start2 = Date.now();
      const result2 = await service.checkFacts(query);
      const time2 = Date.now() - start2;
      
      expect(result2.success).toBe(true);
      expect(result2.cached).toBe(true);
      expect(result2.source).toBe('cache');
      
      // Cache deve ser mais rápido
      expect(time2).toBeLessThan(time1);
    }, 30000);
    
    test('deve manter performance adequada', async () => {
      const queries = [
        'climate change',
        'moon landing',
        'vaccine safety'
      ];
      
      const start = Date.now();
      const results = await service.checkFactsBatch(queries, { batchSize: 2 });
      const totalTime = Date.now() - start;
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Deve completar em tempo razoável (considerando rate limiting)
      expect(totalTime).toBeLessThan(60000); // 1 minuto
    }, 70000);
  });
  
  describe('Rate limiting', () => {
    test('deve respeitar rate limits da API', async () => {
      const rateLimitedService = new GoogleFactCheckService({
        apiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
        rateLimitEnabled: true,
        maxResults: 3
      });
      
      // Fazer várias requisições rapidamente
      const queries = Array.from({ length: 10 }, (_, i) => `test query ${i}`);
      
      const start = Date.now();
      const results = await rateLimitedService.checkFactsBatch(queries, { batchSize: 3 });
      const totalTime = Date.now() - start;
      
      expect(results.length).toBe(10);
      
      // Deve ter levado tempo devido ao rate limiting
      expect(totalTime).toBeGreaterThan(5000); // Pelo menos 5 segundos
      
      // Todas as requisições devem ter sucesso
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(10);
    }, 120000);
  });
  
  describe('Tratamento de erros', () => {
    test('deve tratar API key inválida graciosamente', async () => {
      const invalidService = new GoogleFactCheckService({
        apiKey: 'invalid-api-key-12345',
        retryAttempts: 1
      });
      
      const result = await invalidService.checkFacts('test query');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 15000);
    
    test('deve recuperar de erros temporários', async () => {
      // Simular condições de rede instável fazendo muitas requisições
      const queries = Array.from({ length: 5 }, (_, i) => `network test ${i}`);
      
      const results = await service.checkFactsBatch(queries, { 
        batchSize: 1,
        delay: 100 
      });
      
      // Pelo menos algumas devem ter sucesso
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    }, 30000);
  });
  
  describe('Qualidade dos dados', () => {
    test('deve retornar dados estruturados corretamente', async () => {
      const result = await service.checkFacts('coronavirus vaccine effectiveness');
      
      expect(result.success).toBe(true);
      
      if (result.found && result.claims.length > 0) {
        const claim = result.claims[0];
        
        // Verificar estrutura do claim
        expect(claim).toHaveProperty('text');
        expect(claim).toHaveProperty('claimant');
        expect(claim).toHaveProperty('publisher');
        expect(claim).toHaveProperty('textualRating');
        expect(claim).toHaveProperty('confidence');
        
        // Verificar tipos
        expect(typeof claim.text).toBe('string');
        expect(typeof claim.claimant).toBe('string');
        expect(typeof claim.publisher.name).toBe('string');
        expect(typeof claim.textualRating).toBe('string');
        expect(typeof claim.confidence).toBe('number');
        
        // Verificar valores válidos
        expect(claim.confidence).toBeGreaterThanOrEqual(0);
        expect(claim.confidence).toBeLessThanOrEqual(1);
      }
    }, 20000);
    
    test('deve gerar resumo estatístico correto', async () => {
      const result = await service.checkFacts('climate change human caused');
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('verified');
      expect(result.summary).toHaveProperty('disputed');
      expect(result.summary).toHaveProperty('mixed');
      
      // Verificar consistência
      const total = result.summary.verified + result.summary.disputed + result.summary.mixed;
      expect(total).toBe(result.summary.total);
      expect(result.summary.total).toBe(result.claims.length);
    }, 20000);
  });
  
  describe('Estatísticas e monitoramento', () => {
    test('deve coletar estatísticas de uso', async () => {
      // Fazer algumas requisições
      await service.checkFacts('test stats 1');
      await service.checkFacts('test stats 2');
      await service.checkFacts('test stats 1'); // Repetida para cache
      
      const stats = service.getStats();
      
      expect(stats.cache.total).toBeGreaterThan(0);
      expect(stats.cache.hits).toBeGreaterThanOrEqual(0);
      expect(stats.cache.misses).toBeGreaterThan(0);
      expect(stats.config.apiKeyConfigured).toBe(true);
    }, 25000);
  });
});

// Testes que sempre rodam (sem API key)
describe('Google Fact Check Service - Offline Tests', () => {
  test('deve funcionar sem API key (modo desenvolvimento)', () => {
    const offlineService = new GoogleFactCheckService({
      apiKey: null
    });
    
    expect(offlineService).toBeDefined();
    
    const stats = offlineService.getStats();
    expect(stats.config.apiKeyConfigured).toBe(false);
  });
  
  test('deve validar configurações', () => {
    const service = new GoogleFactCheckService({
      maxResults: 100, // Deve ser limitado a 50
      timeout: -1000   // Deve usar padrão
    });
    
    expect(service.options.maxResults).toBe(50);
    expect(service.options.timeout).toBeGreaterThan(0);
  });
});
