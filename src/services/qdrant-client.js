/**
 * QdrantClient - Cliente para integração com Qdrant Vector Database
 * Implementa operações de busca vetorial e armazenamento para VeritasAI
 */

const { ErrorHandler } = require('../utils/error-handler');

/**
 * Classe principal para integração com Qdrant
 */
class QdrantClient {
  constructor(options = {}) {
    this.options = {
      host: options.host || process.env.QDRANT_HOST || 'localhost',
      port: options.port || process.env.QDRANT_PORT || 6333,
      apiKey: options.apiKey || process.env.QDRANT_API_KEY,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    this.baseUrl = `http://${this.options.host}:${this.options.port}`;
    
    // Error handler
    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableFallbacks: false,
      maxRetries: this.options.retryAttempts
    });
    
    // Estatísticas de uso
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalPoints: 0,
      totalCollections: 0,
      averageResponseTime: 0,
      lastHealthCheck: null,
      startTime: Date.now()
    };
    
    // Cache de informações de coleções
    this.collectionsCache = new Map();
    this.cacheExpiry = 300000; // 5 minutos
    
    // Validar configuração
    this._validateConfig();
  }
  
  /**
   * Verifica conectividade com Qdrant
   * @returns {Promise<Object>} Status da conexão
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await this._makeRequest('GET', '/');
      const responseTime = Date.now() - startTime;

      this.stats.lastHealthCheck = Date.now();

      return {
        healthy: true,
        version: response.version || 'unknown',
        responseTime: responseTime,
        timestamp: Date.now(),
        endpoint: this.baseUrl
      };

    } catch (error) {
      this.stats.lastHealthCheck = Date.now();

      return {
        healthy: false,
        error: error.message,
        timestamp: Date.now(),
        endpoint: this.baseUrl
      };
    }
  }

  /**
   * Health check detalhado com métricas do sistema
   * @returns {Promise<Object>} Status detalhado
   */
  async detailedHealthCheck() {
    const results = {
      overall: { healthy: true, issues: [] },
      connectivity: null,
      collections: null,
      performance: null,
      storage: null,
      cluster: null,
      timestamp: Date.now()
    };

    try {
      // 1. Teste de conectividade básica
      results.connectivity = await this.healthCheck();
      if (!results.connectivity.healthy) {
        results.overall.healthy = false;
        results.overall.issues.push('Falha na conectividade básica');
      }

      // 2. Teste de coleções
      try {
        const collections = await this.listCollections();
        results.collections = {
          healthy: true,
          count: collections.length,
          collections: collections.map(c => ({
            name: c.name,
            status: c.status || 'unknown',
            vectorsCount: c.vectors_count || 0
          }))
        };
      } catch (error) {
        results.collections = {
          healthy: false,
          error: error.message
        };
        results.overall.healthy = false;
        results.overall.issues.push('Falha ao acessar coleções');
      }

      // 3. Teste de performance
      const perfStart = Date.now();
      try {
        // Fazer uma operação simples para testar performance
        await this._makeRequest('GET', '/');
        const perfTime = Date.now() - perfStart;

        results.performance = {
          healthy: perfTime < 1000, // Considerar saudável se < 1s
          responseTime: perfTime,
          threshold: 1000,
          status: perfTime < 500 ? 'excellent' : perfTime < 1000 ? 'good' : 'slow'
        };

        if (!results.performance.healthy) {
          results.overall.issues.push(`Performance degradada: ${perfTime}ms`);
        }
      } catch (error) {
        results.performance = {
          healthy: false,
          error: error.message
        };
        results.overall.issues.push('Falha no teste de performance');
      }

      // 4. Informações de cluster (se disponível)
      try {
        const clusterInfo = await this.getClusterInfo();
        results.cluster = {
          healthy: true,
          info: clusterInfo
        };
      } catch (error) {
        // Cluster info pode não estar disponível em instalações single-node
        results.cluster = {
          healthy: true,
          info: null,
          note: 'Cluster info não disponível (single-node?)'
        };
      }

      // 5. Verificar storage (através de métricas se disponível)
      try {
        const metricsResponse = await this._makeRequest('GET', '/metrics');
        results.storage = {
          healthy: true,
          metrics: this._parseMetrics(metricsResponse)
        };
      } catch (error) {
        results.storage = {
          healthy: true,
          metrics: null,
          note: 'Métricas de storage não disponíveis'
        };
      }

    } catch (error) {
      results.overall.healthy = false;
      results.overall.issues.push(`Erro geral: ${error.message}`);
    }

    return results;
  }

  /**
   * Monitora saúde continuamente
   * @param {Object} options - Opções de monitoramento
   * @returns {Object} Controle do monitoramento
   */
  startHealthMonitoring(options = {}) {
    const interval = options.interval || 30000; // 30 segundos
    const onHealthChange = options.onHealthChange || (() => {});
    const onError = options.onError || console.error;

    let lastHealthy = null;
    let consecutiveFailures = 0;

    const monitor = async () => {
      try {
        const health = await this.healthCheck();

        if (health.healthy !== lastHealthy) {
          onHealthChange(health);
          lastHealthy = health.healthy;
        }

        if (health.healthy) {
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;

          if (consecutiveFailures >= 3) {
            onError(new Error(`Qdrant não saudável por ${consecutiveFailures} verificações consecutivas`));
          }
        }

      } catch (error) {
        consecutiveFailures++;
        onError(error);
      }
    };

    // Primeira verificação imediata
    monitor();

    // Configurar intervalo
    const intervalId = setInterval(monitor, interval);

    return {
      stop: () => clearInterval(intervalId),
      getStatus: () => ({
        lastHealthy,
        consecutiveFailures,
        interval
      })
    };
  }

  /**
   * Testa operações básicas para verificar funcionalidade
   * @returns {Promise<Object>} Resultado dos testes
   */
  async functionalityTest() {
    const testCollectionName = `test_${Date.now()}`;
    const results = {
      overall: { success: true, errors: [] },
      tests: {},
      timestamp: Date.now()
    };

    try {
      // 1. Teste de criação de coleção
      try {
        await this.createCollection(testCollectionName, {
          vectors: { size: 4, distance: 'Cosine' }
        });
        results.tests.createCollection = { success: true };
      } catch (error) {
        results.tests.createCollection = { success: false, error: error.message };
        results.overall.success = false;
        results.overall.errors.push('Falha ao criar coleção');
      }

      // 2. Teste de inserção de ponto
      try {
        await this.upsertPoint(testCollectionName, {
          id: 1,
          vector: [0.1, 0.2, 0.3, 0.4],
          payload: { test: true }
        });
        results.tests.upsertPoint = { success: true };
      } catch (error) {
        results.tests.upsertPoint = { success: false, error: error.message };
        results.overall.success = false;
        results.overall.errors.push('Falha ao inserir ponto');
      }

      // 3. Teste de busca
      try {
        const searchResults = await this.search(testCollectionName, [0.1, 0.2, 0.3, 0.4], {
          limit: 1
        });
        results.tests.search = {
          success: true,
          resultsCount: searchResults.length
        };
      } catch (error) {
        results.tests.search = { success: false, error: error.message };
        results.overall.success = false;
        results.overall.errors.push('Falha na busca');
      }

      // 4. Teste de contagem
      try {
        const count = await this.countPoints(testCollectionName);
        results.tests.countPoints = {
          success: true,
          count: count
        };
      } catch (error) {
        results.tests.countPoints = { success: false, error: error.message };
        results.overall.success = false;
        results.overall.errors.push('Falha na contagem');
      }

      // 5. Limpeza - deletar coleção de teste
      try {
        await this.deleteCollection(testCollectionName);
        results.tests.deleteCollection = { success: true };
      } catch (error) {
        results.tests.deleteCollection = { success: false, error: error.message };
        // Não marcar como falha geral, apenas avisar
        results.overall.errors.push('Aviso: Falha ao limpar coleção de teste');
      }

    } catch (error) {
      results.overall.success = false;
      results.overall.errors.push(`Erro geral nos testes: ${error.message}`);
    }

    return results;
  }

  /**
   * Faz parse de métricas do Qdrant
   * @private
   */
  _parseMetrics(metricsText) {
    // Parse básico de métricas Prometheus
    const metrics = {};

    if (typeof metricsText === 'string') {
      const lines = metricsText.split('\n');

      lines.forEach(line => {
        if (line.startsWith('#') || !line.trim()) return;

        const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+([0-9.]+)/);
        if (match) {
          metrics[match[1]] = parseFloat(match[2]);
        }
      });
    }

    return metrics;
  }
  
  /**
   * Lista todas as coleções
   * @returns {Promise<Array>} Lista de coleções
   */
  async listCollections() {
    try {
      const response = await this._makeRequest('GET', '/collections');
      
      const collections = response.result?.collections || [];
      
      // Atualizar cache
      collections.forEach(collection => {
        this.collectionsCache.set(collection.name, {
          ...collection,
          cachedAt: Date.now()
        });
      });
      
      this.stats.totalCollections = collections.length;
      
      return collections;
      
    } catch (error) {
      throw this._handleError(error, 'listCollections');
    }
  }
  
  /**
   * Obtém informações de uma coleção
   * @param {string} collectionName - Nome da coleção
   * @returns {Promise<Object>} Informações da coleção
   */
  async getCollection(collectionName) {
    try {
      // Verificar cache primeiro
      const cached = this.collectionsCache.get(collectionName);
      if (cached && Date.now() - cached.cachedAt < this.cacheExpiry) {
        return cached;
      }
      
      const response = await this._makeRequest('GET', `/collections/${collectionName}`);
      
      const collection = response.result;
      
      // Atualizar cache
      this.collectionsCache.set(collectionName, {
        ...collection,
        cachedAt: Date.now()
      });
      
      return collection;
      
    } catch (error) {
      throw this._handleError(error, 'getCollection', { collectionName });
    }
  }
  
  /**
   * Cria uma nova coleção
   * @param {string} collectionName - Nome da coleção
   * @param {Object} config - Configuração da coleção
   * @returns {Promise<Object>} Resultado da criação
   */
  async createCollection(collectionName, config = {}) {
    try {
      const defaultConfig = {
        vectors: {
          size: config.vectorSize || 384, // Padrão para sentence-transformers
          distance: config.distance || 'Cosine'
        },
        optimizers_config: {
          default_segment_number: 2,
          max_segment_size: 20000,
          memmap_threshold: 50000,
          indexing_threshold: 20000,
          flush_interval_sec: 5,
          max_optimization_threads: 1
        },
        replication_factor: config.replicationFactor || 1,
        write_consistency_factor: config.writeConsistencyFactor || 1
      };
      
      const collectionConfig = {
        ...defaultConfig,
        ...config
      };
      
      const response = await this._makeRequest('PUT', `/collections/${collectionName}`, collectionConfig);
      
      // Limpar cache
      this.collectionsCache.delete(collectionName);
      
      this.stats.totalCollections++;
      
      return {
        success: true,
        collection: collectionName,
        config: collectionConfig,
        result: response.result
      };
      
    } catch (error) {
      throw this._handleError(error, 'createCollection', { collectionName, config });
    }
  }
  
  /**
   * Deleta uma coleção
   * @param {string} collectionName - Nome da coleção
   * @returns {Promise<Object>} Resultado da deleção
   */
  async deleteCollection(collectionName) {
    try {
      const response = await this._makeRequest('DELETE', `/collections/${collectionName}`);

      // Limpar cache
      this.collectionsCache.delete(collectionName);

      this.stats.totalCollections = Math.max(0, this.stats.totalCollections - 1);

      return {
        success: true,
        collection: collectionName,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'deleteCollection', { collectionName });
    }
  }

  /**
   * Atualiza configuração de uma coleção
   * @param {string} collectionName - Nome da coleção
   * @param {Object} config - Nova configuração
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updateCollection(collectionName, config) {
    try {
      const response = await this._makeRequest('PATCH', `/collections/${collectionName}`, config);

      // Limpar cache
      this.collectionsCache.delete(collectionName);

      return {
        success: true,
        collection: collectionName,
        config: config,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'updateCollection', { collectionName, config });
    }
  }

  /**
   * Cria um alias para uma coleção
   * @param {string} aliasName - Nome do alias
   * @param {string} collectionName - Nome da coleção
   * @returns {Promise<Object>} Resultado da criação do alias
   */
  async createAlias(aliasName, collectionName) {
    try {
      const response = await this._makeRequest('POST', '/collections/aliases', {
        actions: [{
          create_alias: {
            alias_name: aliasName,
            collection_name: collectionName
          }
        }]
      });

      return {
        success: true,
        alias: aliasName,
        collection: collectionName,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'createAlias', { aliasName, collectionName });
    }
  }

  /**
   * Remove um alias
   * @param {string} aliasName - Nome do alias
   * @returns {Promise<Object>} Resultado da remoção
   */
  async deleteAlias(aliasName) {
    try {
      const response = await this._makeRequest('POST', '/collections/aliases', {
        actions: [{
          delete_alias: {
            alias_name: aliasName
          }
        }]
      });

      return {
        success: true,
        alias: aliasName,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'deleteAlias', { aliasName });
    }
  }

  /**
   * Lista todos os aliases
   * @returns {Promise<Array>} Lista de aliases
   */
  async listAliases() {
    try {
      const response = await this._makeRequest('GET', '/aliases');

      return response.result?.aliases || [];

    } catch (error) {
      throw this._handleError(error, 'listAliases');
    }
  }

  /**
   * Obtém informações de cluster
   * @returns {Promise<Object>} Informações do cluster
   */
  async getClusterInfo() {
    try {
      const response = await this._makeRequest('GET', '/cluster');

      return response.result || {};

    } catch (error) {
      throw this._handleError(error, 'getClusterInfo');
    }
  }

  /**
   * Insere um ponto na coleção
   * @param {string} collectionName - Nome da coleção
   * @param {Object} point - Ponto a ser inserido
   * @returns {Promise<Object>} Resultado da inserção
   */
  async upsertPoint(collectionName, point) {
    try {
      const response = await this._makeRequest('PUT', `/collections/${collectionName}/points`, {
        points: [point]
      });

      this.stats.totalPoints++;

      return {
        success: true,
        collection: collectionName,
        pointId: point.id,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'upsertPoint', { collectionName, pointId: point.id });
    }
  }

  /**
   * Insere múltiplos pontos na coleção
   * @param {string} collectionName - Nome da coleção
   * @param {Array} points - Array de pontos
   * @returns {Promise<Object>} Resultado da inserção
   */
  async upsertPoints(collectionName, points) {
    try {
      const response = await this._makeRequest('PUT', `/collections/${collectionName}/points`, {
        points: points
      });

      this.stats.totalPoints += points.length;

      return {
        success: true,
        collection: collectionName,
        pointsCount: points.length,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'upsertPoints', { collectionName, pointsCount: points.length });
    }
  }

  /**
   * Obtém um ponto específico
   * @param {string} collectionName - Nome da coleção
   * @param {string|number} pointId - ID do ponto
   * @param {Object} options - Opções da consulta
   * @returns {Promise<Object>} Ponto encontrado
   */
  async getPoint(collectionName, pointId, options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.withVector !== undefined) {
        params.append('with_vector', options.withVector);
      }

      if (options.withPayload !== undefined) {
        params.append('with_payload', options.withPayload);
      }

      const queryString = params.toString();
      const endpoint = `/collections/${collectionName}/points/${pointId}${queryString ? '?' + queryString : ''}`;

      const response = await this._makeRequest('GET', endpoint);

      return response.result;

    } catch (error) {
      throw this._handleError(error, 'getPoint', { collectionName, pointId });
    }
  }

  /**
   * Obtém múltiplos pontos
   * @param {string} collectionName - Nome da coleção
   * @param {Array} pointIds - Array de IDs dos pontos
   * @param {Object} options - Opções da consulta
   * @returns {Promise<Array>} Pontos encontrados
   */
  async getPoints(collectionName, pointIds, options = {}) {
    try {
      const requestBody = {
        ids: pointIds,
        with_vector: options.withVector || false,
        with_payload: options.withPayload !== false
      };

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points`, requestBody);

      return response.result || [];

    } catch (error) {
      throw this._handleError(error, 'getPoints', { collectionName, pointIds });
    }
  }

  /**
   * Deleta um ponto
   * @param {string} collectionName - Nome da coleção
   * @param {string|number} pointId - ID do ponto
   * @returns {Promise<Object>} Resultado da deleção
   */
  async deletePoint(collectionName, pointId) {
    try {
      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/delete`, {
        points: [pointId]
      });

      this.stats.totalPoints = Math.max(0, this.stats.totalPoints - 1);

      return {
        success: true,
        collection: collectionName,
        pointId: pointId,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'deletePoint', { collectionName, pointId });
    }
  }

  /**
   * Deleta múltiplos pontos
   * @param {string} collectionName - Nome da coleção
   * @param {Array} pointIds - Array de IDs dos pontos
   * @returns {Promise<Object>} Resultado da deleção
   */
  async deletePoints(collectionName, pointIds) {
    try {
      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/delete`, {
        points: pointIds
      });

      this.stats.totalPoints = Math.max(0, this.stats.totalPoints - pointIds.length);

      return {
        success: true,
        collection: collectionName,
        pointsCount: pointIds.length,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'deletePoints', { collectionName, pointIds });
    }
  }

  /**
   * Atualiza payload de um ponto
   * @param {string} collectionName - Nome da coleção
   * @param {string|number} pointId - ID do ponto
   * @param {Object} payload - Novo payload
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updatePointPayload(collectionName, pointId, payload) {
    try {
      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/payload`, {
        payload: payload,
        points: [pointId]
      });

      return {
        success: true,
        collection: collectionName,
        pointId: pointId,
        result: response.result
      };

    } catch (error) {
      throw this._handleError(error, 'updatePointPayload', { collectionName, pointId });
    }
  }

  /**
   * Busca por similaridade vetorial
   * @param {string} collectionName - Nome da coleção
   * @param {Array} vector - Vetor de consulta
   * @param {Object} options - Opções da busca
   * @returns {Promise<Array>} Resultados da busca
   */
  async search(collectionName, vector, options = {}) {
    try {
      const requestBody = {
        vector: vector,
        limit: options.limit || 10,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false
      };

      // Adicionar filtros se especificados
      if (options.filter) {
        requestBody.filter = options.filter;
      }

      // Adicionar parâmetros de busca
      if (options.params) {
        requestBody.params = options.params;
      }

      // Score threshold
      if (options.scoreThreshold !== undefined) {
        requestBody.score_threshold = options.scoreThreshold;
      }

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/search`, requestBody);

      return response.result || [];

    } catch (error) {
      throw this._handleError(error, 'search', { collectionName, options });
    }
  }

  /**
   * Busca por múltiplos vetores
   * @param {string} collectionName - Nome da coleção
   * @param {Array} searches - Array de buscas
   * @returns {Promise<Array>} Resultados das buscas
   */
  async searchBatch(collectionName, searches) {
    try {
      const requestBody = {
        searches: searches.map(search => ({
          vector: search.vector,
          limit: search.limit || 10,
          with_payload: search.withPayload !== false,
          with_vector: search.withVector || false,
          filter: search.filter,
          params: search.params,
          score_threshold: search.scoreThreshold
        }))
      };

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/search/batch`, requestBody);

      return response.result || [];

    } catch (error) {
      throw this._handleError(error, 'searchBatch', { collectionName, searchCount: searches.length });
    }
  }

  /**
   * Busca por grupos (clustering)
   * @param {string} collectionName - Nome da coleção
   * @param {Array} vector - Vetor de consulta
   * @param {string} groupBy - Campo para agrupar
   * @param {Object} options - Opções da busca
   * @returns {Promise<Array>} Resultados agrupados
   */
  async searchGroups(collectionName, vector, groupBy, options = {}) {
    try {
      const requestBody = {
        vector: vector,
        group_by: groupBy,
        limit: options.limit || 10,
        group_size: options.groupSize || 3,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false
      };

      if (options.filter) {
        requestBody.filter = options.filter;
      }

      if (options.scoreThreshold !== undefined) {
        requestBody.score_threshold = options.scoreThreshold;
      }

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/search/groups`, requestBody);

      return response.result || [];

    } catch (error) {
      throw this._handleError(error, 'searchGroups', { collectionName, groupBy, options });
    }
  }

  /**
   * Recomendação baseada em pontos positivos e negativos
   * @param {string} collectionName - Nome da coleção
   * @param {Array} positive - IDs de pontos positivos
   * @param {Array} negative - IDs de pontos negativos
   * @param {Object} options - Opções da recomendação
   * @returns {Promise<Array>} Pontos recomendados
   */
  async recommend(collectionName, positive, negative = [], options = {}) {
    try {
      const requestBody = {
        positive: positive,
        negative: negative,
        limit: options.limit || 10,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false
      };

      if (options.filter) {
        requestBody.filter = options.filter;
      }

      if (options.scoreThreshold !== undefined) {
        requestBody.score_threshold = options.scoreThreshold;
      }

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/recommend`, requestBody);

      return response.result || [];

    } catch (error) {
      throw this._handleError(error, 'recommend', { collectionName, positive, negative, options });
    }
  }

  /**
   * Conta pontos que atendem aos filtros
   * @param {string} collectionName - Nome da coleção
   * @param {Object} filter - Filtro para contagem
   * @returns {Promise<number>} Número de pontos
   */
  async countPoints(collectionName, filter = null) {
    try {
      const requestBody = {};

      if (filter) {
        requestBody.filter = filter;
      }

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/count`, requestBody);

      return response.result?.count || 0;

    } catch (error) {
      throw this._handleError(error, 'countPoints', { collectionName, filter });
    }
  }

  /**
   * Scroll através de pontos (paginação)
   * @param {string} collectionName - Nome da coleção
   * @param {Object} options - Opções do scroll
   * @returns {Promise<Object>} Pontos e próximo offset
   */
  async scrollPoints(collectionName, options = {}) {
    try {
      const requestBody = {
        limit: options.limit || 100,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false
      };

      if (options.offset) {
        requestBody.offset = options.offset;
      }

      if (options.filter) {
        requestBody.filter = options.filter;
      }

      const response = await this._makeRequest('POST', `/collections/${collectionName}/points/scroll`, requestBody);

      return {
        points: response.result?.points || [],
        nextPageOffset: response.result?.next_page_offset || null
      };

    } catch (error) {
      throw this._handleError(error, 'scrollPoints', { collectionName, options });
    }
  }

  /**
   * Operação em lote para inserir muitos pontos eficientemente
   * @param {string} collectionName - Nome da coleção
   * @param {Array} points - Array de pontos
   * @param {Object} options - Opções da operação
   * @returns {Promise<Object>} Resultado da operação
   */
  async batchUpsert(collectionName, points, options = {}) {
    const batchSize = options.batchSize || 100;
    const parallel = options.parallel || false;
    const results = [];

    try {
      if (parallel && points.length > batchSize) {
        // Processamento paralelo para grandes volumes
        const batches = this._chunkArray(points, batchSize);
        const promises = batches.map(batch => this.upsertPoints(collectionName, batch));

        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Batch ${index} falhou:`, result.reason);
            results.push({ success: false, error: result.reason.message });
          }
        });

      } else {
        // Processamento sequencial
        for (let i = 0; i < points.length; i += batchSize) {
          const batch = points.slice(i, i + batchSize);
          const result = await this.upsertPoints(collectionName, batch);
          results.push(result);
        }
      }

      const totalSuccess = results.filter(r => r.success).length;
      const totalFailed = results.length - totalSuccess;

      return {
        success: totalFailed === 0,
        totalBatches: results.length,
        successfulBatches: totalSuccess,
        failedBatches: totalFailed,
        totalPoints: points.length,
        results: results
      };

    } catch (error) {
      throw this._handleError(error, 'batchUpsert', { collectionName, pointsCount: points.length });
    }
  }

  /**
   * Operação em lote para deletar muitos pontos
   * @param {string} collectionName - Nome da coleção
   * @param {Array} pointIds - Array de IDs dos pontos
   * @param {Object} options - Opções da operação
   * @returns {Promise<Object>} Resultado da operação
   */
  async batchDelete(collectionName, pointIds, options = {}) {
    const batchSize = options.batchSize || 100;
    const results = [];

    try {
      for (let i = 0; i < pointIds.length; i += batchSize) {
        const batch = pointIds.slice(i, i + batchSize);
        const result = await this.deletePoints(collectionName, batch);
        results.push(result);
      }

      const totalSuccess = results.filter(r => r.success).length;
      const totalFailed = results.length - totalSuccess;

      return {
        success: totalFailed === 0,
        totalBatches: results.length,
        successfulBatches: totalSuccess,
        failedBatches: totalFailed,
        totalPoints: pointIds.length,
        results: results
      };

    } catch (error) {
      throw this._handleError(error, 'batchDelete', { collectionName, pointsCount: pointIds.length });
    }
  }

  /**
   * Busca em lote com múltiplas queries
   * @param {string} collectionName - Nome da coleção
   * @param {Array} queries - Array de queries de busca
   * @param {Object} options - Opções da busca
   * @returns {Promise<Array>} Resultados das buscas
   */
  async batchSearch(collectionName, queries, options = {}) {
    const batchSize = options.batchSize || 10;
    const results = [];

    try {
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);

        // Usar searchBatch do Qdrant se disponível
        if (batch.length > 1) {
          const batchResult = await this.searchBatch(collectionName, batch);
          results.push(...batchResult);
        } else {
          const singleResult = await this.search(collectionName, batch[0].vector, batch[0]);
          results.push(singleResult);
        }
      }

      return results;

    } catch (error) {
      throw this._handleError(error, 'batchSearch', { collectionName, queriesCount: queries.length });
    }
  }

  /**
   * Atualização em lote de payloads
   * @param {string} collectionName - Nome da coleção
   * @param {Array} updates - Array de atualizações {pointId, payload}
   * @param {Object} options - Opções da operação
   * @returns {Promise<Object>} Resultado da operação
   */
  async batchUpdatePayload(collectionName, updates, options = {}) {
    const batchSize = options.batchSize || 50;
    const results = [];

    try {
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        // Agrupar por payload similar para otimizar
        const groupedUpdates = this._groupUpdatesByPayload(batch);

        for (const [payload, pointIds] of groupedUpdates) {
          const result = await this._makeRequest('POST', `/collections/${collectionName}/points/payload`, {
            payload: payload,
            points: pointIds
          });

          results.push({
            success: true,
            pointIds: pointIds,
            payload: payload,
            result: result.result
          });
        }
      }

      const totalSuccess = results.filter(r => r.success).length;
      const totalFailed = results.length - totalSuccess;

      return {
        success: totalFailed === 0,
        totalOperations: results.length,
        successfulOperations: totalSuccess,
        failedOperations: totalFailed,
        totalPoints: updates.length,
        results: results
      };

    } catch (error) {
      throw this._handleError(error, 'batchUpdatePayload', { collectionName, updatesCount: updates.length });
    }
  }

  /**
   * Divide array em chunks
   * @private
   */
  _chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Agrupa atualizações por payload similar
   * @private
   */
  _groupUpdatesByPayload(updates) {
    const groups = new Map();

    updates.forEach(update => {
      const payloadKey = JSON.stringify(update.payload);

      if (!groups.has(payloadKey)) {
        groups.set(payloadKey, {
          payload: update.payload,
          pointIds: []
        });
      }

      groups.get(payloadKey).pointIds.push(update.pointId);
    });

    return Array.from(groups.values()).map(group => [group.payload, group.pointIds]);
  }
  
  /**
   * Obtém estatísticas do cliente
   * @returns {Object} Estatísticas de uso
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      connection: {
        host: this.options.host,
        port: this.options.port,
        baseUrl: this.baseUrl,
        healthy: this.stats.lastHealthCheck ? 
          Date.now() - this.stats.lastHealthCheck < 60000 : null
      },
      
      performance: {
        totalRequests: this.stats.totalRequests,
        successfulRequests: this.stats.successfulRequests,
        failedRequests: this.stats.failedRequests,
        successRate: `${successRate}%`,
        averageResponseTime: this.stats.averageResponseTime,
        uptime: uptime
      },
      
      data: {
        totalCollections: this.stats.totalCollections,
        totalPoints: this.stats.totalPoints,
        cachedCollections: this.collectionsCache.size
      },
      
      config: {
        timeout: this.options.timeout,
        retryAttempts: this.options.retryAttempts,
        retryDelay: this.options.retryDelay,
        apiKeyConfigured: !!this.options.apiKey
      }
    };
  }
  
  /**
   * Limpa cache de coleções
   */
  clearCache() {
    this.collectionsCache.clear();
  }
  
  /**
   * Valida configuração inicial
   * @private
   */
  _validateConfig() {
    if (!this.options.host) {
      console.warn('Qdrant host não configurado. Usando localhost.');
    }
    
    if (!this.options.port) {
      console.warn('Qdrant port não configurado. Usando 6333.');
    }
    
    if (this.options.timeout < 1000) {
      console.warn('Timeout muito baixo. Recomendado pelo menos 1000ms.');
    }
  }
  
  /**
   * Faz requisição HTTP para Qdrant
   * @private
   */
  async _makeRequest(method, endpoint, data = null) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    let timeoutId = null;

    try {
      const url = `${this.baseUrl}${endpoint}`;

      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.options.apiKey) {
        headers['api-key'] = this.options.apiKey;
      }

      const requestOptions = {
        method: method,
        headers: headers
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(data);
      }

      // Configurar timeout se especificado
      if (this.options.timeout > 0) {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        requestOptions.signal = controller.signal;
      }

      const response = await fetch(url, requestOptions);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const responseTime = Date.now() - startTime;
      this._updateResponseTime(responseTime);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      this.stats.successfulRequests++;

      return result;

    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.stats.failedRequests++;

      const responseTime = Date.now() - startTime;
      this._updateResponseTime(responseTime);

      throw error;
    }
  }
  
  /**
   * Atualiza tempo médio de resposta
   * @private
   */
  _updateResponseTime(responseTime) {
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = Math.round(totalTime / this.stats.totalRequests);
  }
  
  /**
   * Trata erros
   * @private
   */
  _handleError(error, operation, context = {}) {
    console.error(`Erro na operação ${operation}:`, error.message);
    
    return new Error(`Qdrant ${operation} falhou: ${error.message}`);
  }
}

module.exports = QdrantClient;
