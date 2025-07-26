/**
 * Testes unitários para EmbeddingService
 * Testa geração de embeddings, cache e integração com Qdrant
 */

const EmbeddingService = require('../../src/services/embedding-service');

// Mock do @xenova/transformers
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
  env: {
    allowLocalModels: false,
    allowRemoteModels: true
  }
}));

const { pipeline } = require('@xenova/transformers');

describe('EmbeddingService', () => {
  let service;
  let mockExtractor;
  
  beforeEach(() => {
    // Mock do extractor
    mockExtractor = jest.fn();
    pipeline.mockResolvedValue(mockExtractor);
    
    service = new EmbeddingService({
      defaultModel: 'Xenova/all-MiniLM-L6-v2',
      cacheEnabled: true,
      batchSize: 4,
      maxLength: 512
    });
    
    // Limpar mocks
    pipeline.mockClear();
    mockExtractor.mockClear();
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      const defaultService = new EmbeddingService();
      
      expect(defaultService).toBeInstanceOf(EmbeddingService);
      expect(defaultService.options.defaultModel).toBe('Xenova/all-MiniLM-L6-v2');
      expect(defaultService.options.batchSize).toBe(32);
      expect(defaultService.options.cacheEnabled).toBe(true);
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customService = new EmbeddingService({
        defaultModel: 'Xenova/all-mpnet-base-v2',
        batchSize: 16,
        maxLength: 256,
        cacheEnabled: false,
        normalize: false
      });
      
      expect(customService.options.defaultModel).toBe('Xenova/all-mpnet-base-v2');
      expect(customService.options.batchSize).toBe(16);
      expect(customService.options.maxLength).toBe(256);
      expect(customService.options.cacheEnabled).toBe(false);
      expect(customService.options.normalize).toBe(false);
    });
    
    test('deve validar configurações inválidas', () => {
      const service = new EmbeddingService({
        defaultModel: 'modelo-inexistente',
        batchSize: 200,
        maxLength: 5000
      });
      
      expect(service.options.defaultModel).toBe('Xenova/all-MiniLM-L6-v2');
      expect(service.options.batchSize).toBe(32);
      expect(service.options.maxLength).toBe(512);
    });
  });
  
  describe('Geração de embeddings', () => {
    test('deve gerar embedding para um texto', async () => {
      const mockEmbedding = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      mockExtractor.mockResolvedValueOnce({ data: mockEmbedding });
      
      const result = await service.generateEmbedding('Texto de teste');
      
      expect(pipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        expect.objectContaining({
          quantized: true,
          device: 'cpu'
        })
      );
      
      expect(mockExtractor).toHaveBeenCalledWith(
        'Texto de teste',
        expect.objectContaining({
          pooling: 'mean',
          normalize: true
        })
      );
      
      expect(result.success).toBe(true);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result.dimensions).toBe(4);
      expect(result.model).toBe('Xenova/all-MiniLM-L6-v2');
      expect(result.cached).toBe(false);
      expect(result.source).toBe('transformers');
    });
    
    test('deve usar cache para textos repetidos', async () => {
      const mockEmbedding = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      mockExtractor.mockResolvedValueOnce({ data: mockEmbedding });
      
      const text = 'Texto para cache';
      
      // Primeira chamada
      const result1 = await service.generateEmbedding(text);
      expect(result1.cached).toBe(false);
      expect(pipeline).toHaveBeenCalledTimes(1);
      
      // Segunda chamada (deve usar cache)
      const result2 = await service.generateEmbedding(text);
      expect(result2.cached).toBe(true);
      expect(result2.source).toBe('cache');
      expect(pipeline).toHaveBeenCalledTimes(1); // Não deve chamar novamente
    });
    
    test('deve gerar embeddings para múltiplos textos', async () => {
      const mockEmbeddings = [
        { data: new Float32Array([0.1, 0.2, 0.3, 0.4]) },
        { data: new Float32Array([0.5, 0.6, 0.7, 0.8]) }
      ];
      mockExtractor.mockResolvedValueOnce(mockEmbeddings);
      
      const texts = ['Texto 1', 'Texto 2'];
      const result = await service.generateEmbeddings(texts);
      
      expect(result.success).toBe(true);
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result.embeddings[1].embedding).toEqual([0.5, 0.6, 0.7, 0.8]);
      expect(result.totalTexts).toBe(2);
    });
    
    test('deve rejeitar entrada inválida', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow();
      await expect(service.generateEmbedding(null)).rejects.toThrow();
      await expect(service.generateEmbedding('a'.repeat(3000))).rejects.toThrow();
    });
  });
  
  describe('Embeddings especializados', () => {
    test('deve gerar embedding para fact-checking', async () => {
      const mockEmbedding = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      mockExtractor.mockResolvedValueOnce({ data: mockEmbedding });
      
      const result = await service.generateFactCheckEmbedding('Afirmação para verificar');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('fact-check');
      expect(result.originalText).toBe('Afirmação para verificar');
      expect(result.processedText).toBeDefined();
    });
    
    test('deve gerar embedding para busca', async () => {
      const mockEmbedding = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      mockExtractor.mockResolvedValueOnce({ data: mockEmbedding });
      
      const result = await service.generateSearchEmbedding('query de busca');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('search');
      expect(result.originalQuery).toBe('query de busca');
      expect(result.processedQuery).toBeDefined();
    });
    
    test('deve gerar embeddings para documentos', async () => {
      const mockEmbeddings = [
        { data: new Float32Array([0.1, 0.2, 0.3, 0.4]) },
        { data: new Float32Array([0.5, 0.6, 0.7, 0.8]) }
      ];
      mockExtractor.mockResolvedValueOnce(mockEmbeddings);
      
      const documents = ['Documento 1 com conteúdo', 'Documento 2 com mais conteúdo'];
      const result = await service.generateDocumentEmbeddings(documents);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('document-batch');
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0].type).toBe('document');
      expect(result.embeddings[0].wordCount).toBeGreaterThan(0);
    });
  });
  
  describe('Cálculo de similaridade', () => {
    test('deve calcular similaridade coseno', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      const embedding3 = [1, 0, 0];
      
      const similarity1 = service.calculateSimilarity(embedding1, embedding2, 'cosine');
      const similarity2 = service.calculateSimilarity(embedding1, embedding3, 'cosine');
      
      expect(similarity1).toBeCloseTo(0, 5); // Perpendiculares
      expect(similarity2).toBeCloseTo(1, 5); // Idênticos
    });
    
    test('deve calcular distância euclidiana', () => {
      const embedding1 = [0, 0];
      const embedding2 = [3, 4];
      
      const distance = service.calculateSimilarity(embedding1, embedding2, 'euclidean');
      
      expect(distance).toBeCloseTo(5, 5); // 3-4-5 triangle
    });
    
    test('deve calcular produto escalar', () => {
      const embedding1 = [1, 2, 3];
      const embedding2 = [4, 5, 6];
      
      const dotProduct = service.calculateSimilarity(embedding1, embedding2, 'dot');
      
      expect(dotProduct).toBe(32); // 1*4 + 2*5 + 3*6 = 32
    });
    
    test('deve rejeitar embeddings de dimensões diferentes', () => {
      const embedding1 = [1, 2, 3];
      const embedding2 = [4, 5];
      
      expect(() => {
        service.calculateSimilarity(embedding1, embedding2);
      }).toThrow('mesma dimensão');
    });
  });
  
  describe('Busca por similaridade', () => {
    test('deve encontrar textos mais similares', () => {
      const queryEmbedding = [1, 0, 0];
      const candidates = [
        { embedding: [1, 0, 0], metadata: { id: 1 } },
        { embedding: [0, 1, 0], metadata: { id: 2 } },
        { embedding: [0.9, 0.1, 0], metadata: { id: 3 } }
      ];
      
      const results = service.findMostSimilar(queryEmbedding, candidates, {
        limit: 2,
        threshold: 0.5
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].metadata.id).toBe(1); // Mais similar
      expect(results[1].metadata.id).toBe(3); // Segundo mais similar
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });
  });
  
  describe('Agrupamento de embeddings', () => {
    test('deve agrupar embeddings similares', () => {
      const embeddings = [
        { embedding: [1, 0, 0] },
        { embedding: [0.9, 0.1, 0] },
        { embedding: [0, 1, 0] },
        { embedding: [0.1, 0.9, 0] }
      ];
      
      const clusters = service.clusterEmbeddings(embeddings, {
        threshold: 0.8,
        maxClusters: 5
      });
      
      expect(clusters).toHaveLength(2); // Dois grupos
      expect(clusters[0].members.length).toBeGreaterThan(1);
      expect(clusters[1].members.length).toBeGreaterThan(1);
    });
  });
  
  describe('Cache', () => {
    test('deve limpar cache', () => {
      service.embeddingsCache.set('test', { embedding: [1, 2, 3] });
      expect(service.embeddingsCache.size).toBe(1);
      
      service.clearCache();
      expect(service.embeddingsCache.size).toBe(0);
    });
    
    test('deve limpar cache expirado', () => {
      const now = Date.now();
      service.embeddingsCache.set('valid', { 
        embedding: [1, 2, 3], 
        timestamp: now 
      });
      service.embeddingsCache.set('expired', { 
        embedding: [4, 5, 6], 
        timestamp: now - service.cacheExpiry - 1000 
      });
      
      const removedCount = service.clearExpiredCache();
      
      expect(removedCount).toBe(1);
      expect(service.embeddingsCache.size).toBe(1);
      expect(service.embeddingsCache.has('valid')).toBe(true);
    });
    
    test('deve exportar e importar cache', () => {
      service.embeddingsCache.set('test', {
        embedding: [1, 2, 3],
        dimensions: 3,
        model: 'test-model',
        timestamp: Date.now()
      });
      
      const exported = service.exportCache();
      expect(exported.entriesCount).toBe(1);
      expect(exported.data).toBeDefined();
      
      service.clearCache();
      expect(service.embeddingsCache.size).toBe(0);
      
      const imported = service.importCache(exported);
      expect(imported.success).toBe(true);
      expect(imported.importedCount).toBe(1);
      expect(service.embeddingsCache.size).toBe(1);
    });
  });
  
  describe('Estatísticas', () => {
    test('deve fornecer estatísticas de uso', () => {
      const stats = service.getStats();
      
      expect(stats.performance).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.models).toBeDefined();
      expect(stats.config).toBeDefined();
      
      expect(stats.models.default).toBe('Xenova/all-MiniLM-L6-v2');
      expect(stats.config.batchSize).toBe(4);
      expect(stats.cache.enabled).toBe(true);
    });
    
    test('deve fornecer informações sobre modelos', () => {
      const modelsInfo = service.getModelsInfo();
      
      expect(modelsInfo.available).toBeDefined();
      expect(modelsInfo.default).toBe('Xenova/all-MiniLM-L6-v2');
      expect(modelsInfo.loaded).toBeInstanceOf(Array);
      expect(modelsInfo.loadedCount).toBe(0); // Nenhum modelo carregado ainda
    });
  });
  
  describe('Tratamento de erros', () => {
    test('deve tratar erro no carregamento do modelo', async () => {
      pipeline.mockRejectedValueOnce(new Error('Modelo não encontrado'));
      
      await expect(service.generateEmbedding('teste')).rejects.toThrow('Modelo não encontrado');
    });
    
    test('deve tratar erro na geração de embedding', async () => {
      mockExtractor.mockRejectedValueOnce(new Error('Erro no processamento'));
      
      await expect(service.generateEmbedding('teste')).rejects.toThrow('Erro no processamento');
    });
  });
});
