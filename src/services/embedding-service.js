/**
 * EmbeddingService - Serviço para geração de embeddings usando Transformers.js
 * Suporte para múltiplos modelos e processamento em lote
 */

const { pipeline, env } = require('@xenova/transformers');
const { ErrorHandler } = require('../utils/error-handler');

/**
 * Configuração do ambiente Transformers.js
 */
env.allowLocalModels = false;
env.allowRemoteModels = true;

/**
 * Classe principal para geração de embeddings
 */
class EmbeddingService {
  constructor(options = {}) {
    this.options = {
      defaultModel: options.defaultModel || 'Xenova/all-MiniLM-L6-v2',
      cacheEnabled: options.cacheEnabled !== false,
      batchSize: options.batchSize || 32,
      maxLength: options.maxLength || 512,
      normalize: options.normalize !== false,
      pooling: options.pooling || 'mean',
      device: options.device || 'cpu',
      quantized: options.quantized !== false,
      ...options
    };
    
    // Modelos disponíveis
    this.availableModels = {
      'Xenova/all-MiniLM-L6-v2': {
        name: 'all-MiniLM-L6-v2',
        dimensions: 384,
        maxLength: 512,
        language: 'multilingual',
        size: '23MB',
        description: 'Modelo rápido e eficiente para embeddings gerais'
      },
      'Xenova/all-mpnet-base-v2': {
        name: 'all-mpnet-base-v2',
        dimensions: 768,
        maxLength: 514,
        language: 'multilingual',
        size: '438MB',
        description: 'Modelo de alta qualidade para embeddings semânticos'
      },
      'Xenova/multilingual-e5-small': {
        name: 'multilingual-e5-small',
        dimensions: 384,
        maxLength: 512,
        language: 'multilingual',
        size: '118MB',
        description: 'Modelo multilingual otimizado para múltiplas línguas'
      },
      'Xenova/paraphrase-multilingual-MiniLM-L12-v2': {
        name: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384,
        maxLength: 512,
        language: 'multilingual',
        size: '118MB',
        description: 'Modelo especializado em paráfrases multilingual'
      }
    };
    
    // Cache de modelos carregados
    this.loadedModels = new Map();
    
    // Cache de embeddings
    this.embeddingsCache = new Map();
    this.cacheExpiry = options.cacheExpiry || 3600000; // 1 hora
    
    // Error handler
    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableFallbacks: true,
      maxRetries: 2
    });
    
    // Estatísticas
    this.stats = {
      totalRequests: 0,
      totalTexts: 0,
      totalTokens: 0,
      cacheHits: 0,
      cacheMisses: 0,
      modelsLoaded: 0,
      averageProcessingTime: 0,
      batchProcessingCount: 0,
      startTime: Date.now()
    };
    
    // Validar configuração
    this._validateConfig();
  }
  
  /**
   * Gera embedding para um texto
   * @param {string} text - Texto para gerar embedding
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Resultado com embedding
   */
  async generateEmbedding(text, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.totalTexts++;
    
    try {
      // Validar entrada
      this.errorHandler.validate(text, {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: this.options.maxLength * 4 // Aproximação para tokens
      }, 'text');
      
      const model = options.model || this.options.defaultModel;
      
      // Verificar cache primeiro
      if (this.options.cacheEnabled) {
        const cached = this._getCachedEmbedding(text, model);
        if (cached) {
          this.stats.cacheHits++;
          return {
            success: true,
            embedding: cached.embedding,
            dimensions: cached.dimensions,
            model: model,
            cached: true,
            processingTime: Date.now() - startTime,
            source: 'cache'
          };
        }
        this.stats.cacheMisses++;
      }
      
      // Carregar modelo se necessário
      const extractor = await this._loadModel(model);
      
      // Preprocessar texto
      const processedText = this._preprocessText(text, options);
      
      // Gerar embedding
      const result = await extractor(processedText, {
        pooling: options.pooling || this.options.pooling,
        normalize: options.normalize !== false
      });
      
      // Extrair embedding
      const embedding = Array.from(result.data);
      const dimensions = embedding.length;
      
      // Atualizar estatísticas
      this.stats.totalTokens += this._estimateTokens(processedText);
      
      // Cache do resultado
      if (this.options.cacheEnabled) {
        this._cacheEmbedding(text, model, embedding, dimensions);
      }
      
      const processingTime = Date.now() - startTime;
      this._updateProcessingTime(processingTime);
      
      return {
        success: true,
        embedding: embedding,
        dimensions: dimensions,
        model: model,
        cached: false,
        processingTime: processingTime,
        source: 'transformers',
        textLength: text.length,
        estimatedTokens: this._estimateTokens(processedText)
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateProcessingTime(processingTime);
      
      throw this._handleError(error, 'generateEmbedding', { text: text.substring(0, 100), options });
    }
  }
  
  /**
   * Gera embeddings para múltiplos textos
   * @param {Array} texts - Array de textos
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Resultado com embeddings
   */
  async generateEmbeddings(texts, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.totalTexts += texts.length;
    this.stats.batchProcessingCount++;
    
    try {
      // Validar entrada
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('texts deve ser um array não vazio');
      }
      
      const model = options.model || this.options.defaultModel;
      const batchSize = options.batchSize || this.options.batchSize;
      
      const results = [];
      const cacheResults = [];
      const textsToProcess = [];
      
      // Verificar cache para cada texto
      if (this.options.cacheEnabled) {
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          const cached = this._getCachedEmbedding(text, model);
          
          if (cached) {
            this.stats.cacheHits++;
            cacheResults[i] = {
              success: true,
              embedding: cached.embedding,
              dimensions: cached.dimensions,
              cached: true,
              index: i
            };
          } else {
            this.stats.cacheMisses++;
            textsToProcess.push({ text, originalIndex: i });
          }
        }
      } else {
        textsToProcess.push(...texts.map((text, index) => ({ text, originalIndex: index })));
      }
      
      // Processar textos não cacheados em lotes
      if (textsToProcess.length > 0) {
        const extractor = await this._loadModel(model);
        
        for (let i = 0; i < textsToProcess.length; i += batchSize) {
          const batch = textsToProcess.slice(i, i + batchSize);
          const batchTexts = batch.map(item => this._preprocessText(item.text, options));
          
          // Processar lote
          const batchResults = await extractor(batchTexts, {
            pooling: options.pooling || this.options.pooling,
            normalize: options.normalize !== false
          });
          
          // Processar resultados do lote
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const embedding = Array.from(batchResults[j].data);
            const dimensions = embedding.length;
            
            // Cache do resultado
            if (this.options.cacheEnabled) {
              this._cacheEmbedding(item.text, model, embedding, dimensions);
            }
            
            results[item.originalIndex] = {
              success: true,
              embedding: embedding,
              dimensions: dimensions,
              cached: false,
              index: item.originalIndex
            };
            
            this.stats.totalTokens += this._estimateTokens(item.text);
          }
        }
      }
      
      // Combinar resultados cacheados e processados
      const finalResults = [];
      for (let i = 0; i < texts.length; i++) {
        finalResults[i] = cacheResults[i] || results[i];
      }
      
      const processingTime = Date.now() - startTime;
      this._updateProcessingTime(processingTime);
      
      return {
        success: true,
        embeddings: finalResults,
        model: model,
        totalTexts: texts.length,
        cacheHits: cacheResults.length,
        processedTexts: textsToProcess.length,
        batchesProcessed: Math.ceil(textsToProcess.length / batchSize),
        processingTime: processingTime,
        source: 'transformers'
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateProcessingTime(processingTime);
      
      throw this._handleError(error, 'generateEmbeddings', { textsCount: texts.length, options });
    }
  }
  
  /**
   * Calcula similaridade entre dois embeddings
   * @param {Array} embedding1 - Primeiro embedding
   * @param {Array} embedding2 - Segundo embedding
   * @param {string} metric - Métrica de similaridade ('cosine', 'euclidean', 'dot')
   * @returns {number} Valor de similaridade
   */
  calculateSimilarity(embedding1, embedding2, metric = 'cosine') {
    try {
      if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
        throw new Error('Embeddings devem ser arrays');
      }

      if (embedding1.length !== embedding2.length) {
        throw new Error('Embeddings devem ter a mesma dimensão');
      }

      switch (metric.toLowerCase()) {
        case 'cosine':
          return this._cosineSimilarity(embedding1, embedding2);
        case 'euclidean':
          return this._euclideanDistance(embedding1, embedding2);
        case 'dot':
          return this._dotProduct(embedding1, embedding2);
        default:
          throw new Error(`Métrica não suportada: ${metric}`);
      }

    } catch (error) {
      throw this._handleError(error, 'calculateSimilarity', { metric });
    }
  }

  /**
   * Gera embedding otimizado para fact-checking
   * @param {string} text - Texto para análise
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Embedding otimizado
   */
  async generateFactCheckEmbedding(text, options = {}) {
    try {
      // Usar modelo otimizado para fact-checking
      const model = options.model || 'Xenova/all-mpnet-base-v2';

      // Preprocessamento específico para fact-checking
      const processedText = this._preprocessForFactCheck(text);

      const result = await this.generateEmbedding(processedText, {
        ...options,
        model: model,
        prefix: 'fact-check'
      });

      return {
        ...result,
        type: 'fact-check',
        originalText: text,
        processedText: processedText
      };

    } catch (error) {
      throw this._handleError(error, 'generateFactCheckEmbedding', { text: text.substring(0, 100) });
    }
  }

  /**
   * Gera embedding para busca semântica
   * @param {string} query - Query de busca
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Embedding para busca
   */
  async generateSearchEmbedding(query, options = {}) {
    try {
      // Usar modelo rápido para busca
      const model = options.model || 'Xenova/all-MiniLM-L6-v2';

      // Preprocessamento para busca
      const processedQuery = this._preprocessForSearch(query);

      const result = await this.generateEmbedding(processedQuery, {
        ...options,
        model: model,
        prefix: 'search'
      });

      return {
        ...result,
        type: 'search',
        originalQuery: query,
        processedQuery: processedQuery
      };

    } catch (error) {
      throw this._handleError(error, 'generateSearchEmbedding', { query: query.substring(0, 100) });
    }
  }

  /**
   * Gera embeddings para múltiplos documentos com otimizações
   * @param {Array} documents - Array de documentos
   * @param {Object} options - Opções específicas
   * @returns {Promise<Object>} Embeddings dos documentos
   */
  async generateDocumentEmbeddings(documents, options = {}) {
    try {
      // Usar modelo de alta qualidade para documentos
      const model = options.model || 'Xenova/all-mpnet-base-v2';

      // Preprocessar documentos
      const processedDocs = documents.map(doc => this._preprocessForDocument(doc));

      const result = await this.generateEmbeddings(processedDocs, {
        ...options,
        model: model,
        batchSize: options.batchSize || 16 // Menor batch para documentos longos
      });

      // Enriquecer resultados
      const enrichedEmbeddings = result.embeddings.map((embedding, index) => ({
        ...embedding,
        type: 'document',
        originalDocument: documents[index],
        processedDocument: processedDocs[index],
        documentLength: documents[index].length,
        wordCount: documents[index].split(/\s+/).length
      }));

      return {
        ...result,
        embeddings: enrichedEmbeddings,
        type: 'document-batch'
      };

    } catch (error) {
      throw this._handleError(error, 'generateDocumentEmbeddings', { documentsCount: documents.length });
    }
  }

  /**
   * Encontra textos mais similares
   * @param {Array} queryEmbedding - Embedding da query
   * @param {Array} candidateEmbeddings - Array de embeddings candidatos
   * @param {Object} options - Opções de busca
   * @returns {Array} Resultados ordenados por similaridade
   */
  findMostSimilar(queryEmbedding, candidateEmbeddings, options = {}) {
    try {
      const metric = options.metric || 'cosine';
      const limit = options.limit || 10;
      const threshold = options.threshold || 0.0;

      const results = candidateEmbeddings.map((candidate, index) => {
        const similarity = this.calculateSimilarity(queryEmbedding, candidate.embedding, metric);

        return {
          index: index,
          similarity: similarity,
          embedding: candidate.embedding,
          metadata: candidate.metadata || {},
          ...candidate
        };
      });

      // Filtrar por threshold e ordenar
      const filtered = results
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

      return filtered.slice(0, limit);

    } catch (error) {
      throw this._handleError(error, 'findMostSimilar', { candidatesCount: candidateEmbeddings.length });
    }
  }

  /**
   * Agrupa embeddings por similaridade
   * @param {Array} embeddings - Array de embeddings
   * @param {Object} options - Opções de agrupamento
   * @returns {Array} Grupos de embeddings similares
   */
  clusterEmbeddings(embeddings, options = {}) {
    try {
      const threshold = options.threshold || 0.8;
      const metric = options.metric || 'cosine';
      const maxClusters = options.maxClusters || 10;

      const clusters = [];
      const processed = new Set();

      for (let i = 0; i < embeddings.length && clusters.length < maxClusters; i++) {
        if (processed.has(i)) continue;

        const cluster = {
          centroid: embeddings[i],
          members: [{ index: i, embedding: embeddings[i] }],
          averageSimilarity: 1.0
        };

        processed.add(i);

        // Encontrar membros similares
        for (let j = i + 1; j < embeddings.length; j++) {
          if (processed.has(j)) continue;

          const similarity = this.calculateSimilarity(
            embeddings[i].embedding,
            embeddings[j].embedding,
            metric
          );

          if (similarity >= threshold) {
            cluster.members.push({
              index: j,
              embedding: embeddings[j],
              similarity: similarity
            });
            processed.add(j);
          }
        }

        // Calcular similaridade média do cluster
        if (cluster.members.length > 1) {
          const similarities = cluster.members.slice(1).map(m => m.similarity);
          cluster.averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        }

        clusters.push(cluster);
      }

      // Ordenar clusters por tamanho
      clusters.sort((a, b) => b.members.length - a.members.length);

      return clusters;

    } catch (error) {
      throw this._handleError(error, 'clusterEmbeddings', { embeddingsCount: embeddings.length });
    }
  }
  
  /**
   * Obtém informações sobre modelos disponíveis
   * @returns {Object} Informações dos modelos
   */
  getModelsInfo() {
    return {
      available: this.availableModels,
      default: this.options.defaultModel,
      loaded: Array.from(this.loadedModels.keys()),
      loadedCount: this.loadedModels.size
    };
  }
  
  /**
   * Obtém estatísticas do serviço
   * @returns {Object} Estatísticas de uso
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const cacheHitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2)
      : 0;
    
    return {
      performance: {
        totalRequests: this.stats.totalRequests,
        totalTexts: this.stats.totalTexts,
        totalTokens: this.stats.totalTokens,
        averageProcessingTime: this.stats.averageProcessingTime,
        batchProcessingCount: this.stats.batchProcessingCount,
        uptime: uptime
      },
      
      cache: {
        enabled: this.options.cacheEnabled,
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        hitRate: `${cacheHitRate}%`,
        size: this.embeddingsCache.size,
        expiry: this.cacheExpiry
      },
      
      models: {
        default: this.options.defaultModel,
        loaded: this.stats.modelsLoaded,
        available: Object.keys(this.availableModels).length,
        loadedModels: Array.from(this.loadedModels.keys())
      },
      
      config: {
        batchSize: this.options.batchSize,
        maxLength: this.options.maxLength,
        normalize: this.options.normalize,
        pooling: this.options.pooling,
        device: this.options.device,
        quantized: this.options.quantized
      }
    };
  }
  
  /**
   * Limpa cache de embeddings
   */
  clearCache() {
    this.embeddingsCache.clear();
  }

  /**
   * Limpa cache expirado
   */
  clearExpiredCache() {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of this.embeddingsCache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        this.embeddingsCache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Obtém estatísticas detalhadas do cache
   */
  getCacheStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    const modelDistribution = {};

    for (const [key, value] of this.embeddingsCache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        expiredCount++;
      }

      totalSize += value.embedding.length * 8; // Aproximação em bytes

      if (!modelDistribution[value.model]) {
        modelDistribution[value.model] = 0;
      }
      modelDistribution[value.model]++;
    }

    return {
      totalEntries: this.embeddingsCache.size,
      expiredEntries: expiredCount,
      validEntries: this.embeddingsCache.size - expiredCount,
      estimatedSizeBytes: totalSize,
      estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      modelDistribution: modelDistribution,
      hitRate: this.stats.totalRequests > 0
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Pré-carrega embeddings para textos comuns
   * @param {Array} texts - Textos para pré-carregar
   * @param {Object} options - Opções de pré-carregamento
   * @returns {Promise<Object>} Resultado do pré-carregamento
   */
  async preloadEmbeddings(texts, options = {}) {
    try {
      const model = options.model || this.options.defaultModel;
      const batchSize = options.batchSize || this.options.batchSize;

      let preloadedCount = 0;
      let skippedCount = 0;

      // Filtrar textos já em cache
      const textsToLoad = texts.filter(text => {
        const cached = this._getCachedEmbedding(text, model);
        if (cached) {
          skippedCount++;
          return false;
        }
        return true;
      });

      if (textsToLoad.length > 0) {
        const result = await this.generateEmbeddings(textsToLoad, {
          ...options,
          model: model,
          batchSize: batchSize
        });

        preloadedCount = result.embeddings.filter(e => e.success).length;
      }

      return {
        success: true,
        totalTexts: texts.length,
        preloadedCount: preloadedCount,
        skippedCount: skippedCount,
        model: model
      };

    } catch (error) {
      throw this._handleError(error, 'preloadEmbeddings', { textsCount: texts.length });
    }
  }

  /**
   * Exporta cache para persistência
   * @returns {Object} Dados do cache para exportação
   */
  exportCache() {
    const cacheData = {};

    for (const [key, value] of this.embeddingsCache.entries()) {
      // Só exportar entradas válidas
      if (Date.now() - value.timestamp < this.cacheExpiry) {
        cacheData[key] = {
          embedding: value.embedding,
          dimensions: value.dimensions,
          model: value.model,
          timestamp: value.timestamp
        };
      }
    }

    return {
      version: '1.0',
      exportedAt: Date.now(),
      cacheExpiry: this.cacheExpiry,
      entriesCount: Object.keys(cacheData).length,
      data: cacheData
    };
  }

  /**
   * Importa cache de dados persistidos
   * @param {Object} cacheData - Dados do cache para importar
   * @returns {Object} Resultado da importação
   */
  importCache(cacheData) {
    try {
      if (!cacheData || !cacheData.data) {
        throw new Error('Dados de cache inválidos');
      }

      let importedCount = 0;
      let skippedCount = 0;
      const now = Date.now();

      for (const [key, value] of Object.entries(cacheData.data)) {
        // Verificar se entrada ainda é válida
        if (now - value.timestamp < this.cacheExpiry) {
          this.embeddingsCache.set(key, value);
          importedCount++;
        } else {
          skippedCount++;
        }
      }

      return {
        success: true,
        importedCount: importedCount,
        skippedCount: skippedCount,
        totalEntries: Object.keys(cacheData.data).length
      };

    } catch (error) {
      throw this._handleError(error, 'importCache');
    }
  }

  /**
   * Processamento em lote otimizado com controle de memória
   * @param {Array} texts - Textos para processar
   * @param {Object} options - Opções de processamento
   * @returns {Promise<Object>} Resultado do processamento
   */
  async batchProcessOptimized(texts, options = {}) {
    try {
      const maxMemoryMB = options.maxMemoryMB || 512;
      const adaptiveBatching = options.adaptiveBatching !== false;
      const progressCallback = options.progressCallback;

      let currentBatchSize = options.batchSize || this.options.batchSize;
      const results = [];
      let processedCount = 0;
      let totalMemoryUsed = 0;

      for (let i = 0; i < texts.length; i += currentBatchSize) {
        const batch = texts.slice(i, i + currentBatchSize);

        // Monitorar uso de memória
        const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

        const batchResult = await this.generateEmbeddings(batch, options);

        const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
        const memoryDelta = memoryAfter - memoryBefore;
        totalMemoryUsed += memoryDelta;

        results.push(...batchResult.embeddings);
        processedCount += batch.length;

        // Callback de progresso
        if (progressCallback) {
          progressCallback({
            processed: processedCount,
            total: texts.length,
            progress: (processedCount / texts.length * 100).toFixed(1),
            currentBatchSize: currentBatchSize,
            memoryUsedMB: totalMemoryUsed.toFixed(2)
          });
        }

        // Ajuste adaptativo do batch size
        if (adaptiveBatching) {
          if (memoryDelta > maxMemoryMB / 4) {
            // Reduzir batch size se usando muita memória
            currentBatchSize = Math.max(1, Math.floor(currentBatchSize * 0.7));
          } else if (memoryDelta < maxMemoryMB / 8 && currentBatchSize < this.options.batchSize) {
            // Aumentar batch size se usando pouca memória
            currentBatchSize = Math.min(this.options.batchSize, Math.floor(currentBatchSize * 1.3));
          }
        }

        // Forçar garbage collection se disponível
        if (global.gc && totalMemoryUsed > maxMemoryMB) {
          global.gc();
          totalMemoryUsed = 0;
        }
      }

      return {
        success: true,
        embeddings: results,
        totalTexts: texts.length,
        processedTexts: processedCount,
        finalBatchSize: currentBatchSize,
        memoryUsedMB: totalMemoryUsed.toFixed(2)
      };

    } catch (error) {
      throw this._handleError(error, 'batchProcessOptimized', { textsCount: texts.length });
    }
  }

  /**
   * Processamento paralelo de embeddings
   * @param {Array} texts - Textos para processar
   * @param {Object} options - Opções de processamento
   * @returns {Promise<Object>} Resultado do processamento
   */
  async parallelProcess(texts, options = {}) {
    try {
      const maxConcurrency = options.maxConcurrency || 3;
      const chunkSize = Math.ceil(texts.length / maxConcurrency);

      // Dividir textos em chunks
      const chunks = [];
      for (let i = 0; i < texts.length; i += chunkSize) {
        chunks.push(texts.slice(i, i + chunkSize));
      }

      // Processar chunks em paralelo
      const promises = chunks.map(async (chunk, index) => {
        try {
          const result = await this.generateEmbeddings(chunk, {
            ...options,
            batchSize: Math.min(options.batchSize || this.options.batchSize, chunk.length)
          });

          return {
            success: true,
            chunkIndex: index,
            embeddings: result.embeddings,
            processingTime: result.processingTime
          };

        } catch (error) {
          return {
            success: false,
            chunkIndex: index,
            error: error.message,
            embeddings: []
          };
        }
      });

      const chunkResults = await Promise.allSettled(promises);

      // Combinar resultados
      const allEmbeddings = [];
      let successfulChunks = 0;
      let totalProcessingTime = 0;

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          allEmbeddings.push(...result.value.embeddings);
          successfulChunks++;
          totalProcessingTime += result.value.processingTime;
        } else {
          console.error(`Chunk ${index} falhou:`, result.reason || result.value.error);
        }
      });

      return {
        success: successfulChunks > 0,
        embeddings: allEmbeddings,
        totalTexts: texts.length,
        successfulChunks: successfulChunks,
        totalChunks: chunks.length,
        averageProcessingTime: totalProcessingTime / successfulChunks,
        parallelEfficiency: (successfulChunks / chunks.length * 100).toFixed(1)
      };

    } catch (error) {
      throw this._handleError(error, 'parallelProcess', { textsCount: texts.length });
    }
  }

  /**
   * Processamento streaming para grandes volumes
   * @param {AsyncIterable} textStream - Stream de textos
   * @param {Object} options - Opções de processamento
   * @returns {AsyncGenerator} Generator de embeddings
   */
  async* streamProcess(textStream, options = {}) {
    try {
      const batchSize = options.batchSize || this.options.batchSize;
      let batch = [];
      let processedCount = 0;

      for await (const text of textStream) {
        batch.push(text);

        if (batch.length >= batchSize) {
          const result = await this.generateEmbeddings(batch, options);

          for (const embedding of result.embeddings) {
            yield {
              ...embedding,
              globalIndex: processedCount++
            };
          }

          batch = [];
        }
      }

      // Processar último batch se não vazio
      if (batch.length > 0) {
        const result = await this.generateEmbeddings(batch, options);

        for (const embedding of result.embeddings) {
          yield {
            ...embedding,
            globalIndex: processedCount++
          };
        }
      }

    } catch (error) {
      throw this._handleError(error, 'streamProcess');
    }
  }

  /**
   * Integra com QdrantClient para armazenamento vetorial
   * @param {Object} qdrantClient - Instância do QdrantClient
   */
  integrateWithQdrant(qdrantClient) {
    this.qdrantClient = qdrantClient;
  }

  /**
   * Gera embedding e armazena no Qdrant
   * @param {string} text - Texto para processar
   * @param {Object} options - Opções de processamento e armazenamento
   * @returns {Promise<Object>} Resultado com embedding e armazenamento
   */
  async generateAndStore(text, options = {}) {
    try {
      if (!this.qdrantClient) {
        throw new Error('QdrantClient não configurado. Use integrateWithQdrant() primeiro.');
      }

      const collectionName = options.collection || 'embeddings';
      const pointId = options.pointId || Date.now();

      // Gerar embedding
      const embeddingResult = await this.generateEmbedding(text, options);

      if (!embeddingResult.success) {
        throw new Error('Falha ao gerar embedding');
      }

      // Preparar ponto para Qdrant
      const point = {
        id: pointId,
        vector: embeddingResult.embedding,
        payload: {
          text: text,
          model: embeddingResult.model,
          dimensions: embeddingResult.dimensions,
          generatedAt: Date.now(),
          textLength: text.length,
          estimatedTokens: embeddingResult.estimatedTokens,
          ...options.payload
        }
      };

      // Armazenar no Qdrant
      const storeResult = await this.qdrantClient.upsertPoint(collectionName, point);

      return {
        success: true,
        embedding: embeddingResult,
        storage: storeResult,
        pointId: pointId,
        collection: collectionName
      };

    } catch (error) {
      throw this._handleError(error, 'generateAndStore', { text: text.substring(0, 100), options });
    }
  }

  /**
   * Gera embeddings em lote e armazena no Qdrant
   * @param {Array} texts - Textos para processar
   * @param {Object} options - Opções de processamento e armazenamento
   * @returns {Promise<Object>} Resultado do processamento em lote
   */
  async generateAndStoreBatch(texts, options = {}) {
    try {
      if (!this.qdrantClient) {
        throw new Error('QdrantClient não configurado. Use integrateWithQdrant() primeiro.');
      }

      const collectionName = options.collection || 'embeddings';
      const startId = options.startId || Date.now();

      // Gerar embeddings
      const embeddingsResult = await this.generateEmbeddings(texts, options);

      if (!embeddingsResult.success) {
        throw new Error('Falha ao gerar embeddings');
      }

      // Preparar pontos para Qdrant
      const points = embeddingsResult.embeddings.map((embedding, index) => {
        if (!embedding.success) {
          return null;
        }

        return {
          id: startId + index,
          vector: embedding.embedding,
          payload: {
            text: texts[index],
            model: embeddingsResult.model,
            dimensions: embedding.dimensions,
            generatedAt: Date.now(),
            textLength: texts[index].length,
            batchIndex: index,
            ...options.payload
          }
        };
      }).filter(point => point !== null);

      // Armazenar no Qdrant em lotes
      const storeResult = await this.qdrantClient.batchUpsert(collectionName, points, {
        batchSize: options.qdrantBatchSize || 100,
        parallel: options.parallel || false
      });

      return {
        success: true,
        embeddings: embeddingsResult,
        storage: storeResult,
        pointsStored: points.length,
        collection: collectionName
      };

    } catch (error) {
      throw this._handleError(error, 'generateAndStoreBatch', { textsCount: texts.length, options });
    }
  }

  /**
   * Busca por similaridade usando embeddings
   * @param {string} queryText - Texto da query
   * @param {Object} options - Opções de busca
   * @returns {Promise<Object>} Resultados da busca
   */
  async searchSimilar(queryText, options = {}) {
    try {
      if (!this.qdrantClient) {
        throw new Error('QdrantClient não configurado. Use integrateWithQdrant() primeiro.');
      }

      const collectionName = options.collection || 'embeddings';

      // Gerar embedding da query
      const queryEmbedding = await this.generateSearchEmbedding(queryText, options);

      if (!queryEmbedding.success) {
        throw new Error('Falha ao gerar embedding da query');
      }

      // Buscar no Qdrant
      const searchResults = await this.qdrantClient.search(collectionName, queryEmbedding.embedding, {
        limit: options.limit || 10,
        scoreThreshold: options.scoreThreshold || 0.7,
        filter: options.filter,
        withPayload: true,
        withVector: options.withVector || false
      });

      // Enriquecer resultados
      const enrichedResults = searchResults.map(result => ({
        ...result,
        queryText: queryText,
        queryEmbedding: queryEmbedding,
        similarity: result.score,
        text: result.payload?.text,
        originalModel: result.payload?.model,
        generatedAt: result.payload?.generatedAt
      }));

      return {
        success: true,
        query: queryText,
        queryEmbedding: queryEmbedding,
        results: enrichedResults,
        totalResults: enrichedResults.length,
        collection: collectionName
      };

    } catch (error) {
      throw this._handleError(error, 'searchSimilar', { queryText: queryText.substring(0, 100), options });
    }
  }

  /**
   * Cria coleção otimizada para embeddings
   * @param {string} collectionName - Nome da coleção
   * @param {Object} options - Opções da coleção
   * @returns {Promise<Object>} Resultado da criação
   */
  async createEmbeddingCollection(collectionName, options = {}) {
    try {
      if (!this.qdrantClient) {
        throw new Error('QdrantClient não configurado. Use integrateWithQdrant() primeiro.');
      }

      const model = options.model || this.options.defaultModel;
      const modelInfo = this.availableModels[model];

      if (!modelInfo) {
        throw new Error(`Modelo ${model} não encontrado`);
      }

      const collectionConfig = {
        vectorSize: modelInfo.dimensions,
        distance: options.distance || 'Cosine',
        replicationFactor: options.replicationFactor || 1,
        writeConsistencyFactor: options.writeConsistencyFactor || 1,
        optimizers_config: {
          default_segment_number: 2,
          max_segment_size: options.maxSegmentSize || 20000,
          memmap_threshold: options.memmapThreshold || 50000,
          indexing_threshold: options.indexingThreshold || 20000,
          flush_interval_sec: 5,
          max_optimization_threads: 1
        }
      };

      const result = await this.qdrantClient.createCollection(collectionName, collectionConfig);

      return {
        success: true,
        collection: collectionName,
        model: model,
        dimensions: modelInfo.dimensions,
        config: collectionConfig,
        result: result
      };

    } catch (error) {
      throw this._handleError(error, 'createEmbeddingCollection', { collectionName, options });
    }
  }
  
  /**
   * Valida configuração inicial
   * @private
   */
  _validateConfig() {
    if (!this.availableModels[this.options.defaultModel]) {
      console.warn(`Modelo padrão ${this.options.defaultModel} não reconhecido. Usando all-MiniLM-L6-v2.`);
      this.options.defaultModel = 'Xenova/all-MiniLM-L6-v2';
    }

    if (this.options.batchSize < 1 || this.options.batchSize > 128) {
      console.warn('batchSize deve estar entre 1 e 128. Usando 32.');
      this.options.batchSize = 32;
    }

    if (this.options.maxLength < 1 || this.options.maxLength > 2048) {
      console.warn('maxLength deve estar entre 1 e 2048. Usando 512.');
      this.options.maxLength = 512;
    }
  }

  /**
   * Carrega um modelo de embedding
   * @private
   */
  async _loadModel(modelName) {
    try {
      // Verificar se modelo já está carregado
      if (this.loadedModels.has(modelName)) {
        return this.loadedModels.get(modelName);
      }

      console.log(`Carregando modelo: ${modelName}...`);

      // Carregar modelo usando pipeline
      const extractor = await pipeline('feature-extraction', modelName, {
        quantized: this.options.quantized,
        device: this.options.device
      });

      // Cache do modelo
      this.loadedModels.set(modelName, extractor);
      this.stats.modelsLoaded++;

      console.log(`Modelo ${modelName} carregado com sucesso.`);

      return extractor;

    } catch (error) {
      throw new Error(`Falha ao carregar modelo ${modelName}: ${error.message}`);
    }
  }

  /**
   * Preprocessa texto antes da geração de embedding
   * @private
   */
  _preprocessText(text, options = {}) {
    let processed = text;

    // Normalizar espaços em branco
    processed = processed.replace(/\s+/g, ' ').trim();

    // Truncar se necessário
    const maxLength = options.maxLength || this.options.maxLength;
    if (processed.length > maxLength * 4) { // Aproximação para tokens
      processed = processed.substring(0, maxLength * 4);
    }

    // Adicionar prefixos específicos se necessário
    if (options.prefix) {
      processed = `${options.prefix}: ${processed}`;
    }

    return processed;
  }

  /**
   * Preprocessa texto para fact-checking
   * @private
   */
  _preprocessForFactCheck(text) {
    let processed = text;

    // Normalizar pontuação
    processed = processed.replace(/[""'']/g, '"');
    processed = processed.replace(/[–—]/g, '-');

    // Remover URLs
    processed = processed.replace(/https?:\/\/[^\s]+/g, '[URL]');

    // Normalizar números
    processed = processed.replace(/\d{4,}/g, '[NUMBER]');

    // Normalizar espaços
    processed = processed.replace(/\s+/g, ' ').trim();

    // Manter apenas caracteres relevantes
    processed = processed.replace(/[^\w\s\-.,!?()[\]"]/g, ' ');
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  /**
   * Preprocessa query para busca
   * @private
   */
  _preprocessForSearch(query) {
    let processed = query;

    // Converter para lowercase para busca
    processed = processed.toLowerCase();

    // Remover stop words básicas (português e inglês)
    const stopWords = new Set([
      'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
      'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being'
    ]);

    const words = processed.split(/\s+/);
    const filteredWords = words.filter(word =>
      word.length > 2 && !stopWords.has(word)
    );

    processed = filteredWords.join(' ');

    // Normalizar espaços
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  /**
   * Preprocessa documento para embedding
   * @private
   */
  _preprocessForDocument(document) {
    let processed = document;

    // Normalizar quebras de linha
    processed = processed.replace(/\r\n/g, '\n');
    processed = processed.replace(/\r/g, '\n');

    // Normalizar múltiplas quebras de linha
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // Normalizar espaços
    processed = processed.replace(/[ \t]+/g, ' ');
    processed = processed.replace(/\n /g, '\n');
    processed = processed.replace(/ \n/g, '\n');

    // Remover linhas vazias excessivas
    processed = processed.replace(/\n\s*\n/g, '\n\n');

    // Truncar se muito longo (manter estrutura)
    if (processed.length > this.options.maxLength * 6) {
      const sentences = processed.split(/[.!?]+/);
      let truncated = '';

      for (const sentence of sentences) {
        if ((truncated + sentence).length > this.options.maxLength * 6) {
          break;
        }
        truncated += sentence + '.';
      }

      processed = truncated;
    }

    return processed.trim();
  }

  /**
   * Obtém embedding do cache
   * @private
   */
  _getCachedEmbedding(text, model) {
    const key = this._getCacheKey(text, model);
    const cached = this.embeddingsCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached;
    }

    // Remover entrada expirada
    if (cached) {
      this.embeddingsCache.delete(key);
    }

    return null;
  }

  /**
   * Armazena embedding no cache
   * @private
   */
  _cacheEmbedding(text, model, embedding, dimensions) {
    const key = this._getCacheKey(text, model);

    this.embeddingsCache.set(key, {
      embedding: embedding,
      dimensions: dimensions,
      timestamp: Date.now(),
      model: model
    });

    // Limpar cache se muito grande (máximo 1000 entradas)
    if (this.embeddingsCache.size > 1000) {
      const oldestKey = this.embeddingsCache.keys().next().value;
      this.embeddingsCache.delete(oldestKey);
    }
  }

  /**
   * Gera chave de cache
   * @private
   */
  _getCacheKey(text, model) {
    // Usar hash simples para economizar memória
    const textHash = this._simpleHash(text);
    return `${model}:${textHash}`;
  }

  /**
   * Hash simples para cache
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit
    }
    return hash.toString(36);
  }

  /**
   * Estima número de tokens
   * @private
   */
  _estimateTokens(text) {
    // Estimativa simples: ~4 caracteres por token
    return Math.ceil(text.length / 4);
  }

  /**
   * Atualiza tempo médio de processamento
   * @private
   */
  _updateProcessingTime(processingTime) {
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalRequests - 1) + processingTime;
    this.stats.averageProcessingTime = Math.round(totalTime / this.stats.totalRequests);
  }

  /**
   * Calcula similaridade coseno
   * @private
   */
  _cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Calcula distância euclidiana
   * @private
   */
  _euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Calcula produto escalar
   * @private
   */
  _dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Trata erros
   * @private
   */
  _handleError(error, operation, context = {}) {
    console.error(`Erro na operação ${operation}:`, error.message);

    return new Error(`EmbeddingService ${operation} falhou: ${error.message}`);
  }
}

module.exports = EmbeddingService;
