/**
 * Testes unitários para QdrantClient
 * Testa operações de busca vetorial e gerenciamento de coleções
 */

const QdrantClient = require('../../src/services/qdrant-client');

// Mock do fetch global
global.fetch = jest.fn();

describe('QdrantClient', () => {
  let client;
  
  beforeEach(() => {
    client = new QdrantClient({
      host: 'localhost',
      port: 6333,
      timeout: 5000
    });
    
    // Limpar mocks
    fetch.mockClear();
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      const defaultClient = new QdrantClient();
      
      expect(defaultClient).toBeInstanceOf(QdrantClient);
      expect(defaultClient.options.host).toBe('localhost');
      expect(defaultClient.options.port).toBe(6333);
      expect(defaultClient.baseUrl).toBe('http://localhost:6333');
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customClient = new QdrantClient({
        host: 'qdrant.example.com',
        port: 6334,
        apiKey: 'test-key',
        timeout: 10000
      });
      
      expect(customClient.options.host).toBe('qdrant.example.com');
      expect(customClient.options.port).toBe(6334);
      expect(customClient.options.apiKey).toBe('test-key');
      expect(customClient.options.timeout).toBe(10000);
      expect(customClient.baseUrl).toBe('http://qdrant.example.com:6334');
    });
    
    test('deve usar variáveis de ambiente', () => {
      process.env.QDRANT_HOST = 'env-host';
      process.env.QDRANT_PORT = '9999';
      process.env.QDRANT_API_KEY = 'env-key';
      
      const envClient = new QdrantClient();
      
      expect(envClient.options.host).toBe('env-host');
      expect(envClient.options.port).toBe('9999');
      expect(envClient.options.apiKey).toBe('env-key');
      
      // Limpar variáveis
      delete process.env.QDRANT_HOST;
      delete process.env.QDRANT_PORT;
      delete process.env.QDRANT_API_KEY;
    });
  });
  
  describe('Health Check', () => {
    test('deve retornar status saudável', async () => {
      const mockResponse = {
        version: '1.15.0',
        status: 'ok'
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const health = await client.healthCheck();
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(health.healthy).toBe(true);
      expect(health.version).toBe('1.15.0');
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.endpoint).toBe('http://localhost:6333');
    });
    
    test('deve retornar status não saudável em caso de erro', async () => {
      fetch.mockRejectedValueOnce(new Error('Connection refused'));
      
      const health = await client.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection refused');
    });
    
    test('deve fazer health check detalhado', async () => {
      // Mock para health check básico
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.15.0' })
      });
      
      // Mock para listCollections
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: {
            collections: [
              { name: 'test_collection', status: 'green', vectors_count: 100 }
            ]
          }
        })
      });
      
      // Mock para performance test
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });
      
      // Mock para cluster info
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: { peer_id: 'test' } })
      });
      
      // Mock para metrics
      fetch.mockRejectedValueOnce(new Error('Metrics not available'));
      
      const detailedHealth = await client.detailedHealthCheck();
      
      expect(detailedHealth.overall.healthy).toBe(true);
      expect(detailedHealth.connectivity.healthy).toBe(true);
      expect(detailedHealth.collections.healthy).toBe(true);
      expect(detailedHealth.collections.count).toBe(1);
      expect(detailedHealth.performance.healthy).toBe(true);
    });
  });
  
  describe('Gerenciamento de Coleções', () => {
    test('deve listar coleções', async () => {
      const mockResponse = {
        result: {
          collections: [
            { name: 'collection1', status: 'green' },
            { name: 'collection2', status: 'green' }
          ]
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const collections = await client.listCollections();
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections',
        expect.objectContaining({ method: 'GET' })
      );
      expect(collections).toHaveLength(2);
      expect(collections[0].name).toBe('collection1');
    });
    
    test('deve obter informações de uma coleção', async () => {
      const mockResponse = {
        result: {
          name: 'test_collection',
          status: 'green',
          vectors_count: 100
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const collection = await client.getCollection('test_collection');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/test_collection',
        expect.objectContaining({ method: 'GET' })
      );
      expect(collection.name).toBe('test_collection');
      expect(collection.vectors_count).toBe(100);
    });
    
    test('deve criar uma coleção', async () => {
      const mockResponse = {
        result: { operation_id: 123 }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await client.createCollection('new_collection', {
        vectorSize: 384,
        distance: 'Cosine'
      });
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/new_collection',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"size":384')
        })
      );
      expect(result.success).toBe(true);
      expect(result.collection).toBe('new_collection');
    });
    
    test('deve deletar uma coleção', async () => {
      const mockResponse = {
        result: { operation_id: 124 }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await client.deleteCollection('old_collection');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/old_collection',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result.success).toBe(true);
      expect(result.collection).toBe('old_collection');
    });
  });
  
  describe('Operações de Pontos', () => {
    test('deve inserir um ponto', async () => {
      const mockResponse = {
        result: { operation_id: 125, status: 'acknowledged' }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const point = {
        id: 1,
        vector: [0.1, 0.2, 0.3, 0.4],
        payload: { text: 'test' }
      };
      
      const result = await client.upsertPoint('test_collection', point);
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/test_collection/points',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"points":[')
        })
      );
      expect(result.success).toBe(true);
      expect(result.pointId).toBe(1);
    });
    
    test('deve inserir múltiplos pontos', async () => {
      const mockResponse = {
        result: { operation_id: 126, status: 'acknowledged' }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const points = [
        { id: 1, vector: [0.1, 0.2, 0.3, 0.4], payload: { text: 'test1' } },
        { id: 2, vector: [0.2, 0.3, 0.4, 0.5], payload: { text: 'test2' } }
      ];
      
      const result = await client.upsertPoints('test_collection', points);
      
      expect(result.success).toBe(true);
      expect(result.pointsCount).toBe(2);
    });
    
    test('deve obter um ponto específico', async () => {
      const mockResponse = {
        result: {
          id: 1,
          vector: [0.1, 0.2, 0.3, 0.4],
          payload: { text: 'test' }
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const point = await client.getPoint('test_collection', 1, {
        withVector: true,
        withPayload: true
      });
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('with_vector=true'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(point.id).toBe(1);
      expect(point.payload.text).toBe('test');
    });
    
    test('deve deletar um ponto', async () => {
      const mockResponse = {
        result: { operation_id: 127, status: 'acknowledged' }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await client.deletePoint('test_collection', 1);
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/test_collection/points/delete',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"points":[1]')
        })
      );
      expect(result.success).toBe(true);
      expect(result.pointId).toBe(1);
    });
  });
  
  describe('Busca Vetorial', () => {
    test('deve fazer busca por similaridade', async () => {
      const mockResponse = {
        result: [
          {
            id: 1,
            score: 0.95,
            payload: { text: 'similar text' },
            vector: [0.1, 0.2, 0.3, 0.4]
          }
        ]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const results = await client.search('test_collection', [0.1, 0.2, 0.3, 0.4], {
        limit: 5,
        scoreThreshold: 0.8,
        withPayload: true
      });
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/test_collection/points/search',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"limit":5')
        })
      );
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.95);
    });
    
    test('deve fazer busca em lote', async () => {
      const mockResponse = {
        result: [
          [{ id: 1, score: 0.95 }],
          [{ id: 2, score: 0.90 }]
        ]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const searches = [
        { vector: [0.1, 0.2, 0.3, 0.4], limit: 1 },
        { vector: [0.2, 0.3, 0.4, 0.5], limit: 1 }
      ];
      
      const results = await client.searchBatch('test_collection', searches);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(1);
      expect(results[1]).toHaveLength(1);
    });
    
    test('deve contar pontos', async () => {
      const mockResponse = {
        result: { count: 150 }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const count = await client.countPoints('test_collection');
      
      expect(count).toBe(150);
    });
  });
  
  describe('Tratamento de Erros', () => {
    test('deve tratar erro HTTP 404', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Collection not found')
      });
      
      await expect(client.getCollection('nonexistent')).rejects.toThrow('HTTP 404');
    });
    
    test('deve tratar erro de rede', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(client.healthCheck()).resolves.toEqual(
        expect.objectContaining({
          healthy: false,
          error: 'Network error'
        })
      );
    });
    
    test('deve fazer retry em operações', async () => {
      const retryClient = new QdrantClient({
        retryAttempts: 2,
        retryDelay: 10
      });
      
      fetch
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: { collections: [] } })
        });
      
      const collections = await retryClient.listCollections();
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(collections).toEqual([]);
    });
  });
  
  describe('Estatísticas', () => {
    test('deve fornecer estatísticas de uso', () => {
      const stats = client.getStats();
      
      expect(stats.connection).toBeDefined();
      expect(stats.performance).toBeDefined();
      expect(stats.data).toBeDefined();
      expect(stats.config).toBeDefined();
      
      expect(stats.connection.host).toBe('localhost');
      expect(stats.connection.port).toBe(6333);
      expect(stats.config.timeout).toBe(5000);
    });
    
    test('deve limpar cache', () => {
      // Adicionar algo ao cache
      client.collectionsCache.set('test', { name: 'test', cachedAt: Date.now() });
      
      expect(client.collectionsCache.size).toBe(1);
      
      client.clearCache();
      
      expect(client.collectionsCache.size).toBe(0);
    });
  });
});
