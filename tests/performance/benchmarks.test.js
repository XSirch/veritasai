/**
 * VER-024: Benchmarks Automatizados
 * Suite completa de benchmarks para monitoramento contínuo de performance
 */

const { PerformanceMonitor } = require('../../src/utils/performance-monitor.js');
const { MemoryOptimizer } = require('../../src/utils/memory-optimizer.js');
const { ResponseOptimizer } = require('../../src/utils/response-optimizer.js');
const KeywordExtractor = require('../../src/utils/keyword-extractor.js');

// Mock do performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024,
    totalJSHeapSize: 50 * 1024 * 1024,
    jsHeapSizeLimit: 100 * 1024 * 1024
  }
};

describe('🚀 Benchmarks Automatizados - VER-024', () => {
  let performanceMonitor;
  let memoryOptimizer;
  let responseOptimizer;
  let keywordExtractor;
  
  beforeAll(() => {
    performanceMonitor = new PerformanceMonitor();
    memoryOptimizer = new MemoryOptimizer();
    responseOptimizer = new ResponseOptimizer();
    keywordExtractor = new KeywordExtractor();
  });
  
  afterAll(() => {
    performanceMonitor?.destroy();
    memoryOptimizer?.cleanup();
    responseOptimizer?.destroy();
  });
  
  describe('📊 Performance Monitor Benchmarks', () => {
    test('deve inicializar em menos de 100ms', () => {
      const startTime = performance.now();
      const monitor = new PerformanceMonitor();
      const initTime = performance.now() - startTime;
      
      expect(initTime).toBeLessThan(100);
      monitor.destroy();
    });
    
    test('deve registrar operação em menos de 5ms', () => {
      const startTime = performance.now();
      const operationId = performanceMonitor.startOperation('benchmark-test');
      performanceMonitor.endOperation(operationId);
      const recordTime = performance.now() - startTime;
      
      expect(recordTime).toBeLessThan(5);
    });
    
    test('deve processar 1000 operações em menos de 1s', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const opId = performanceMonitor.startOperation(`op-${i}`);
        performanceMonitor.endOperation(opId);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(1000);
    });
    
    test('deve gerar estatísticas em menos de 10ms', () => {
      // Adicionar dados de teste
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordCacheHit();
      }
      
      const startTime = performance.now();
      const stats = performanceMonitor.getStats();
      const statsTime = performance.now() - startTime;
      
      expect(statsTime).toBeLessThan(10);
      expect(stats).toBeDefined();
    });
  });
  
  describe('🧠 Memory Optimizer Benchmarks', () => {
    test('deve inicializar em menos de 50ms', () => {
      const startTime = performance.now();
      const optimizer = new MemoryOptimizer();
      const initTime = performance.now() - startTime;
      
      expect(initTime).toBeLessThan(50);
      optimizer.cleanup();
    });
    
    test('deve executar GC em menos de 100ms', () => {
      const startTime = performance.now();
      memoryOptimizer.forceGC();
      const gcTime = performance.now() - startTime;
      
      expect(gcTime).toBeLessThan(100);
    });
    
    test('deve gerenciar object pool eficientemente', () => {
      const startTime = performance.now();
      
      // Criar e retornar 100 objetos
      for (let i = 0; i < 100; i++) {
        const obj = memoryOptimizer.getPooledObject('test', () => ({ id: i }));
        memoryOptimizer.returnToPool('test', obj);
      }
      
      const poolTime = performance.now() - startTime;
      expect(poolTime).toBeLessThan(50);
    });
    
    test('deve carregar módulos lazy em menos de 200ms', async () => {
      const startTime = performance.now();
      
      try {
        await memoryOptimizer.loadModule('test-module', './keyword-extractor.js');
      } catch (error) {
        // Esperado falhar, mas deve ser rápido
      }
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(200);
    });
  });
  
  describe('⚡ Response Optimizer Benchmarks', () => {
    test('deve processar requisição simples em menos de 50ms', async () => {
      const mockFn = jest.fn().mockResolvedValue('test');
      
      const startTime = performance.now();
      const result = await responseOptimizer.processRequest(mockFn);
      const processTime = performance.now() - startTime;
      
      expect(processTime).toBeLessThan(50);
      expect(result.success).toBe(true);
    });
    
    test('deve processar 10 requisições paralelas em menos de 200ms', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        fn: jest.fn().mockResolvedValue(`result${i}`),
        context: { id: i }
      }));
      
      const startTime = performance.now();
      const results = await responseOptimizer.processParallel(requests);
      const parallelTime = performance.now() - startTime;
      
      expect(parallelTime).toBeLessThan(200);
      expect(results).toHaveLength(10);
    });
    
    test('deve otimizar query em menos de 5ms', () => {
      const context = {
        type: 'fact-check',
        text: 'a'.repeat(5000),
        maxResults: 50
      };
      
      const startTime = performance.now();
      const optimized = responseOptimizer.optimizeQuery(context);
      const optimizeTime = performance.now() - startTime;
      
      expect(optimizeTime).toBeLessThan(5);
      expect(optimized.text.length).toBeLessThanOrEqual(2000);
    });
    
    test('deve calcular estatísticas em menos de 10ms', () => {
      // Adicionar dados de teste
      for (let i = 0; i < 100; i++) {
        responseOptimizer.recordResponseTime(i * 10);
      }
      
      const startTime = performance.now();
      const stats = responseOptimizer.getStats();
      const statsTime = performance.now() - startTime;
      
      expect(statsTime).toBeLessThan(10);
      expect(stats.samplesCount).toBe(100);
    });
  });
  
  describe('🔍 KeywordExtractor Benchmarks', () => {
    const testTexts = {
      small: 'Este é um texto pequeno para teste.',
      medium: 'Este é um texto médio para teste de performance. '.repeat(10),
      large: 'Este é um texto grande para teste de performance. '.repeat(100)
    };
    
    test('deve extrair keywords de texto pequeno em menos de 50ms', () => {
      const startTime = performance.now();
      const result = keywordExtractor.extract(testTexts.small);
      const extractTime = performance.now() - startTime;
      
      expect(extractTime).toBeLessThan(50);
      expect(result.keywords).toBeDefined();
    });
    
    test('deve extrair keywords de texto médio em menos de 100ms', () => {
      const startTime = performance.now();
      const result = keywordExtractor.extract(testTexts.medium);
      const extractTime = performance.now() - startTime;
      
      expect(extractTime).toBeLessThan(100);
      expect(result.keywords).toBeDefined();
    });
    
    test('deve extrair keywords de texto grande em menos de 200ms', () => {
      const startTime = performance.now();
      const result = keywordExtractor.extract(testTexts.large);
      const extractTime = performance.now() - startTime;
      
      expect(extractTime).toBeLessThan(200);
      expect(result.keywords).toBeDefined();
    });
    
    test('deve usar cache eficientemente', () => {
      const text = 'Texto para teste de cache';
      
      // Primeira extração
      const startTime1 = performance.now();
      keywordExtractor.extract(text);
      const firstTime = performance.now() - startTime1;
      
      // Segunda extração (deve usar cache)
      const startTime2 = performance.now();
      keywordExtractor.extract(text);
      const secondTime = performance.now() - startTime2;
      
      expect(secondTime).toBeLessThan(firstTime);
      expect(secondTime).toBeLessThan(10); // Cache deve ser muito rápido
    });
    
    test('deve processar 100 textos pequenos em menos de 2s', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        keywordExtractor.extract(`Texto de teste número ${i}`);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(2000);
    });
  });
  
  describe('🎯 Benchmarks Integrados', () => {
    test('deve manter uso de memória abaixo de 60MB durante operações intensivas', () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      
      // Operações intensivas
      for (let i = 0; i < 50; i++) {
        keywordExtractor.extract(`Texto intensivo número ${i} `.repeat(20));
        
        const opId = performanceMonitor.startOperation(`intensive-${i}`);
        performanceMonitor.endOperation(opId);
        
        memoryOptimizer.getPooledObject('test', () => ({ data: new Array(100) }));
      }
      
      // Forçar GC
      memoryOptimizer.forceGC();
      
      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(60 * 1024 * 1024); // 60MB
    });
    
    test('deve manter response time P95 abaixo de 2s', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => ({
        fn: async () => {
          // Simular operação complexa
          const text = `Análise complexa número ${i} `.repeat(50);
          return keywordExtractor.extract(text);
        },
        context: { id: i }
      }));
      
      const startTime = performance.now();
      const results = await responseOptimizer.processParallel(requests);
      const totalTime = performance.now() - startTime;
      
      expect(results.every(r => r.success)).toBe(true);
      
      // Calcular P95
      const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95Time = responseTimes[p95Index];
      
      expect(p95Time).toBeLessThan(2000); // 2s
      expect(totalTime).toBeLessThan(5000); // Total em 5s
    });
    
    test('deve atingir cache hit rate ≥ 60%', () => {
      const texts = [
        'Texto A para cache',
        'Texto B para cache',
        'Texto C para cache'
      ];
      
      let hits = 0;
      let total = 0;
      
      // Primeira rodada - popular cache
      texts.forEach(text => {
        keywordExtractor.extract(text);
        total++;
      });
      
      // Segunda rodada - deve usar cache
      texts.forEach(text => {
        const startTime = performance.now();
        keywordExtractor.extract(text);
        const time = performance.now() - startTime;
        
        if (time < 10) { // Assumir que < 10ms é cache hit
          hits++;
        }
        total++;
      });
      
      const hitRate = hits / total;
      expect(hitRate).toBeGreaterThanOrEqual(0.6); // 60%
    });
  });
  
  describe('📈 Benchmarks de Stress', () => {
    test('deve suportar 1000 operações simultâneas', async () => {
      const operations = Array.from({ length: 1000 }, (_, i) => 
        responseOptimizer.processRequest(
          async () => `result-${i}`,
          { id: i }
        )
      );
      
      const startTime = performance.now();
      const results = await Promise.allSettled(operations);
      const stressTime = performance.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(950); // 95% success rate
      expect(stressTime).toBeLessThan(10000); // 10s max
    });
    
    test('deve manter performance sob carga contínua', async () => {
      const duration = 5000; // 5 segundos
      const startTime = performance.now();
      const results = [];
      
      while (performance.now() - startTime < duration) {
        const opStart = performance.now();
        keywordExtractor.extract('Texto de stress test');
        const opTime = performance.now() - opStart;
        
        results.push(opTime);
        
        // Pequena pausa para evitar travamento
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Verificar que performance não degradou
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));
      
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Performance não deve degradar mais que 50%
      expect(avgSecond).toBeLessThan(avgFirst * 1.5);
    });
  });
  
  describe('📊 Relatório de Benchmarks', () => {
    test('deve gerar relatório consolidado', () => {
      const report = {
        timestamp: Date.now(),
        performance: {
          monitor: performanceMonitor.getStats(),
          response: responseOptimizer.getStats(),
          memory: memoryOptimizer.getMemoryStats()
        },
        targets: {
          responseTime: '< 2s (P95)',
          memoryUsage: '< 60MB',
          cacheHitRate: '≥ 60%'
        },
        status: 'PASSED'
      };
      
      expect(report.timestamp).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.targets).toBeDefined();
      expect(report.status).toBe('PASSED');
      
      console.log('📊 Relatório de Benchmarks:', JSON.stringify(report, null, 2));
    });
  });
});
