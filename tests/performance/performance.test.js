/**
 * VER-023: Testes de Performance
 * Validar métricas críticas de performance da extensão
 */

const { performance } = require('perf_hooks');

// Mock do Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue()
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Importar serviços para teste
const KeywordExtractor = require('../../src/utils/keyword-extractor.js');

describe('VER-023: Testes de Performance', () => {
  
  describe('KeywordExtractor Performance', () => {
    let extractor;
    
    beforeEach(() => {
      extractor = new KeywordExtractor();
    });
    
    test('deve processar texto curto em < 50ms', async () => {
      const text = 'O presidente anunciou novas medidas econômicas hoje.';
      
      const startTime = performance.now();
      const result = await extractor.extract(text);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(processingTime).toBeLessThan(50); // < 50ms
    });
    
    test('deve processar texto médio em < 100ms', async () => {
      const text = `
        O presidente da República anunciou hoje novas medidas econômicas 
        que devem impactar diretamente a inflação do país. Segundo dados 
        do Banco Central, a taxa de juros pode subir 0.5% nos próximos meses.
        Especialistas afirmam que essas mudanças são necessárias para 
        controlar a economia nacional.
      `;
      
      const startTime = performance.now();
      const result = await extractor.extract(text);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(processingTime).toBeLessThan(100); // < 100ms
    });
    
    test('deve processar texto longo em < 200ms', async () => {
      const text = `
        O presidente da República anunciou hoje novas medidas econômicas 
        que devem impactar diretamente a inflação do país. Segundo dados 
        do Banco Central, a taxa de juros pode subir 0.5% nos próximos meses.
        Especialistas afirmam que essas mudanças são necessárias para 
        controlar a economia nacional. A decisão foi tomada após reunião
        com o ministro da Fazenda e representantes do setor privado.
        
        As medidas incluem ajustes na política fiscal, revisão de gastos
        públicos e incentivos para pequenas e médias empresas. O governo
        espera que essas ações resultem em crescimento de 2.5% do PIB
        no próximo ano, superando as expectativas do mercado financeiro.
        
        Analistas econômicos consideram as medidas positivas, mas alertam
        para possíveis impactos sociais. A população deve sentir os efeitos
        das mudanças nos próximos 6 meses, especialmente no setor de
        serviços e no mercado de trabalho.
      `;
      
      const startTime = performance.now();
      const result = await extractor.extract(text);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(processingTime).toBeLessThan(200); // < 200ms
    });
    
    test('deve manter performance consistente em múltiplas execuções', async () => {
      const text = 'O Brasil registrou inflação de 4.2% no último trimestre.';
      const executions = 10;
      const times = [];
      
      for (let i = 0; i < executions; i++) {
        const startTime = performance.now();
        await extractor.extract(text);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      expect(avgTime).toBeLessThan(50); // Média < 50ms
      expect(maxTime).toBeLessThan(100); // Máximo < 100ms
      expect(maxTime - minTime).toBeLessThan(50); // Variação < 50ms
    });
  });
  
  describe('Memory Usage Performance', () => {
    
    test('deve manter uso de memória baixo', async () => {
      const extractor = new KeywordExtractor();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Processar múltiplos textos
      const texts = [
        'Texto de teste 1 com informações importantes.',
        'Segundo texto para análise de performance.',
        'Terceiro exemplo com dados econômicos relevantes.',
        'Quarto texto contendo estatísticas governamentais.',
        'Quinto exemplo para teste de memória.'
      ];
      
      for (const text of texts) {
        await extractor.extract(text);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Aumento de memória deve ser < 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
  
  describe('Cache Performance', () => {
    
    test('deve melhorar performance com cache', async () => {
      const extractor = new KeywordExtractor({ cacheEnabled: true });
      const text = 'Teste de performance com cache habilitado.';
      
      // Primeira execução (sem cache)
      const startTime1 = performance.now();
      const result1 = await extractor.extract(text);
      const endTime1 = performance.now();
      const time1 = endTime1 - startTime1;
      
      // Segunda execução (com cache)
      const startTime2 = performance.now();
      const result2 = await extractor.extract(text);
      const endTime2 = performance.now();
      const time2 = endTime2 - startTime2;
      
      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1); // Cache deve ser mais rápido
      expect(time2).toBeLessThan(10); // Cache deve ser < 10ms
    });
  });
  
  describe('Concurrent Processing Performance', () => {
    
    test('deve processar múltiplas requisições concorrentes', async () => {
      const extractor = new KeywordExtractor();
      const texts = [
        'Primeiro texto para processamento concorrente.',
        'Segunda análise simultânea de performance.',
        'Terceiro teste de concorrência do sistema.',
        'Quarta verificação de capacidade paralela.',
        'Quinta análise de throughput do extrator.'
      ];
      
      const startTime = performance.now();
      
      // Processar todos os textos simultaneamente
      const promises = texts.map(text => extractor.extract(text));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(texts.length);
      expect(results.every(result => result && result.keywords)).toBe(true);
      expect(totalTime).toBeLessThan(500); // Todas as 5 análises em < 500ms
    });
  });
  
  describe('Stress Testing', () => {
    
    test('deve manter performance sob carga', async () => {
      const extractor = new KeywordExtractor();
      const baseText = 'Análise de stress test para verificar performance ';
      const iterations = 50;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const text = baseText + `iteração ${i} com dados únicos.`;
        
        const startTime = performance.now();
        await extractor.extract(text);
        const endTime = performance.now();
        
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(100); // Média < 100ms mesmo sob carga
      expect(maxTime).toBeLessThan(300); // Máximo < 300ms
      
      // Performance não deve degradar significativamente
      const firstHalf = times.slice(0, 25);
      const secondHalf = times.slice(25);
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      expect(avgSecond).toBeLessThan(avgFirst * 2); // Degradação < 100%
    });
  });
  
  describe('Resource Cleanup Performance', () => {
    
    test('deve limpar recursos eficientemente', async () => {
      const extractor = new KeywordExtractor();
      
      // Processar alguns textos
      await extractor.extract('Texto 1 para teste de cleanup.');
      await extractor.extract('Texto 2 para verificação de limpeza.');
      
      const startTime = performance.now();
      
      // Simular cleanup (se método existir)
      if (typeof extractor.cleanup === 'function') {
        await extractor.cleanup();
      }
      
      const endTime = performance.now();
      const cleanupTime = endTime - startTime;
      
      expect(cleanupTime).toBeLessThan(50); // Cleanup < 50ms
    });
  });
});

// Utilitários para benchmark
function createBenchmark(name, fn, iterations = 100) {
  return async () => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await fn();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`\n📊 Benchmark: ${name}`);
    console.log(`   Iterações: ${iterations}`);
    console.log(`   Tempo médio: ${avgTime.toFixed(2)}ms`);
    console.log(`   Tempo mínimo: ${minTime.toFixed(2)}ms`);
    console.log(`   Tempo máximo: ${maxTime.toFixed(2)}ms`);
    
    return { avgTime, minTime, maxTime, times };
  };
}

module.exports = { createBenchmark };
