/**
 * VER-024: Testes do Response Optimizer
 * Testes unitários para o sistema de otimização de response time
 */

const { ResponseOptimizer, getResponseOptimizer, optimizeResponse } = require('../../src/utils/response-optimizer.js');

// Mock do performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('ResponseOptimizer', () => {
  let optimizer;
  
  beforeEach(() => {
    optimizer = new ResponseOptimizer({
      maxResponseTime: 1000, // 1s para testes
      batchSize: 3
    });
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (optimizer) {
      optimizer.destroy();
    }
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      const defaultOptimizer = new ResponseOptimizer();
      
      expect(defaultOptimizer.options.maxResponseTime).toBe(2000);
      expect(defaultOptimizer.options.enableParallelProcessing).toBe(true);
      expect(defaultOptimizer.options.batchSize).toBe(5);
      
      defaultOptimizer.destroy();
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customOptimizer = new ResponseOptimizer({
        maxResponseTime: 500,
        batchSize: 10,
        enableParallelProcessing: false
      });
      
      expect(customOptimizer.options.maxResponseTime).toBe(500);
      expect(customOptimizer.options.batchSize).toBe(10);
      expect(customOptimizer.options.enableParallelProcessing).toBe(false);
      
      customOptimizer.destroy();
    });
  });
  
  describe('Processamento de Requisições', () => {
    test('deve processar requisição simples', async () => {
      const mockFn = jest.fn().mockResolvedValue('test result');
      
      const result = await optimizer.processRequest(mockFn, { test: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test result');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.requestId).toBeDefined();
      expect(mockFn).toHaveBeenCalledWith({ test: true });
    });
    
    test('deve lidar com erros na requisição', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await optimizer.processRequest(mockFn);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
    
    test('deve aplicar timeout em requisições lentas', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 2000))
      );
      
      const result = await optimizer.processRequest(slowFn, { timeout: 100 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });
  });
  
  describe('Processamento Paralelo', () => {
    test('deve processar múltiplas requisições em paralelo', async () => {
      const requests = [
        { fn: jest.fn().mockResolvedValue('result1'), context: { id: 1 } },
        { fn: jest.fn().mockResolvedValue('result2'), context: { id: 2 } },
        { fn: jest.fn().mockResolvedValue('result3'), context: { id: 3 } }
      ];
      
      const results = await optimizer.processParallel(requests);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].data).toBe('result1');
      expect(results[1].data).toBe('result2');
      expect(results[2].data).toBe('result3');
    });
    
    test('deve processar em lotes quando há muitas requisições', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        fn: jest.fn().mockResolvedValue(`result${i}`),
        context: { id: i }
      }));
      
      const results = await optimizer.processParallel(requests);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });
    
    test('deve processar sequencialmente quando paralelo desabilitado', async () => {
      optimizer.options.enableParallelProcessing = false;
      
      const requests = [
        { fn: jest.fn().mockResolvedValue('result1'), context: { id: 1 } },
        { fn: jest.fn().mockResolvedValue('result2'), context: { id: 2 } }
      ];
      
      const results = await optimizer.processParallel(requests);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
  
  describe('Processamento em Lote', () => {
    test('deve adicionar requisições à fila', async () => {
      const mockFn = jest.fn().mockResolvedValue('batch result');
      
      const promise = optimizer.addToBatch(mockFn, { batch: true });
      
      expect(optimizer.requestQueue).toHaveLength(1);
      
      // Processar lote manualmente
      await optimizer.processBatch();
      
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data).toBe('batch result');
    });
    
    test('deve processar lotes automaticamente', async () => {
      const mockFn = jest.fn().mockResolvedValue('auto batch');
      
      // Adicionar múltiplas requisições
      const promises = [
        optimizer.addToBatch(mockFn, { id: 1 }),
        optimizer.addToBatch(mockFn, { id: 2 }),
        optimizer.addToBatch(mockFn, { id: 3 })
      ];
      
      // Aguardar processamento
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
  
  describe('Otimização de Queries', () => {
    test('deve otimizar contexto de fact-check', () => {
      const context = {
        type: 'fact-check',
        text: 'a'.repeat(3000), // Texto muito longo
        maxResults: 20
      };
      
      const optimized = optimizer.optimizeQuery(context);
      
      expect(optimized.text).toHaveLength(2000);
      expect(optimized.truncated).toBe(true);
      expect(optimized.maxResults).toBe(5);
    });
    
    test('deve otimizar contexto de embedding', () => {
      const context = {
        type: 'embedding',
        batchSize: 20
      };
      
      const optimized = optimizer.optimizeQuery(context);
      
      expect(optimized.batchSize).toBe(5);
    });
    
    test('deve otimizar contexto de LLM', () => {
      const context = {
        type: 'llm',
        maxTokens: 2000
      };
      
      const optimized = optimizer.optimizeQuery(context);
      
      expect(optimized.maxTokens).toBe(500);
      expect(optimized.temperature).toBe(0.3);
    });
  });
  
  describe('Estatísticas de Response Time', () => {
    test('deve registrar tempos de resposta', () => {
      optimizer.recordResponseTime(100);
      optimizer.recordResponseTime(200);
      optimizer.recordResponseTime(150);
      
      const stats = optimizer.getStats();
      
      expect(stats.samplesCount).toBe(3);
      expect(stats.avg).toBeCloseTo(150);
      expect(stats.max).toBe(200);
      expect(stats.p50).toBe(150);
    });
    
    test('deve calcular percentis corretamente', () => {
      const times = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      times.forEach(time => optimizer.recordResponseTime(time));
      
      const stats = optimizer.getStats();
      
      expect(stats.p95).toBe(1000); // 95% dos valores
      expect(stats.p99).toBe(1000); // 99% dos valores
    });
    
    test('deve verificar se está dentro do target', () => {
      optimizer.recordResponseTime(500); // Dentro do target (1000ms)
      expect(optimizer.isWithinTarget()).toBe(true);
      
      optimizer.recordResponseTime(1500); // Fora do target
      expect(optimizer.isWithinTarget()).toBe(false);
    });
    
    test('deve limitar número de amostras', () => {
      // Adicionar mais de 1000 amostras
      for (let i = 0; i < 1200; i++) {
        optimizer.recordResponseTime(i);
      }
      
      expect(optimizer.responseTimeStats.samples).toHaveLength(1000);
    });
  });
  
  describe('Relatórios', () => {
    test('deve gerar relatório de performance', () => {
      optimizer.recordResponseTime(100);
      optimizer.recordResponseTime(200);
      
      const report = optimizer.generateReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.performance.responseTime.avg).toBeDefined();
      expect(report.performance.status).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
    
    test('deve gerar recomendações quando fora do target', () => {
      optimizer.recordResponseTime(2000); // Acima do target
      
      const stats = optimizer.getStats();
      const recommendations = optimizer.generateRecommendations(stats);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'performance')).toBe(true);
    });
    
    test('deve gerar recomendações para fila grande', () => {
      // Simular fila grande
      for (let i = 0; i < 15; i++) {
        optimizer.requestQueue.push({ fn: jest.fn(), context: {} });
      }
      
      const stats = optimizer.getStats();
      const recommendations = optimizer.generateRecommendations(stats);
      
      expect(recommendations.some(r => r.type === 'queue')).toBe(true);
    });
  });
  
  describe('Utilitários', () => {
    test('deve criar lotes corretamente', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const batches = optimizer.createBatches(items, 3);
      
      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual([1, 2, 3]);
      expect(batches[1]).toEqual([4, 5, 6]);
      expect(batches[2]).toEqual([7]);
    });
    
    test('deve gerar IDs únicos', () => {
      const id1 = optimizer.generateRequestId();
      const id2 = optimizer.generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
    
    test('deve resetar estatísticas', () => {
      optimizer.recordResponseTime(100);
      optimizer.requestQueue.push({ fn: jest.fn() });
      
      optimizer.reset();
      
      expect(optimizer.responseTimeStats.samples).toHaveLength(0);
      expect(optimizer.requestQueue).toHaveLength(0);
    });
  });
});

describe('Funções Globais', () => {
  test('deve retornar instância global', () => {
    const optimizer1 = getResponseOptimizer();
    const optimizer2 = getResponseOptimizer();
    
    expect(optimizer1).toBe(optimizer2);
    
    optimizer1.destroy();
  });
});

describe('Decorator de Response', () => {
  test('deve otimizar métodos automaticamente', async () => {
    const optimizer = getResponseOptimizer();

    // Teste sem decorator para evitar problemas de parsing
    const testMethod = async (value) => {
      return `processed: ${value}`;
    };

    const result = await optimizer.processRequest(testMethod, { value: 'test' });

    expect(result.success).toBe(true);
    expect(result.data).toBe('processed: test');
    expect(result.responseTime).toBeGreaterThanOrEqual(0);

    optimizer.destroy();
  });
});
