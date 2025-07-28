/**
 * VER-024: Response Time Optimizer
 * Sistema de otimização para reduzir response time < 2s (95th percentile)
 */

class ResponseOptimizer {
  constructor(options = {}) {
    this.options = {
      maxResponseTime: 2000, // 2 segundos
      enableParallelProcessing: true,
      enableQueryOptimization: true,
      enableAsyncProcessing: true,
      enableRequestBatching: true,
      batchSize: 5,
      timeoutThreshold: 1500, // 1.5s para timeout preventivo
      ...options
    };
    
    this.requestQueue = [];
    this.batchProcessor = null;
    this.responseTimeStats = {
      samples: [],
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      max: 0
    };
    
    this.init();
  }
  
  /**
   * Inicializa o otimizador
   */
  init() {
    console.log('⚡ Inicializando Response Optimizer...');
    
    // Configurar processamento em lote
    if (this.options.enableRequestBatching) {
      this.startBatchProcessor();
    }
    
    console.log('✅ Response Optimizer inicializado');
  }
  
  /**
   * Processa requisição com otimizações
   */
  async processRequest(requestFn, context = {}) {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    
    console.log(`🚀 Processando requisição ${requestId}...`);
    
    try {
      let result;
      
      // Escolher estratégia de processamento baseada no contexto
      if (this.options.enableAsyncProcessing && context.allowAsync !== false) {
        result = await this.processAsync(requestFn, context, requestId);
      } else {
        result = await this.processSync(requestFn, context, requestId);
      }
      
      const responseTime = performance.now() - startTime;
      this.recordResponseTime(responseTime);
      
      console.log(`✅ Requisição ${requestId} concluída em ${responseTime.toFixed(2)}ms`);
      
      return {
        success: true,
        data: result,
        responseTime,
        requestId
      };
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.recordResponseTime(responseTime);
      
      console.error(`❌ Erro na requisição ${requestId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        responseTime,
        requestId
      };
    }
  }
  
  /**
   * Processamento assíncrono otimizado
   */
  async processAsync(requestFn, context, requestId) {
    const timeout = context.timeout || this.options.timeoutThreshold;
    
    // Criar promise com timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });
    
    // Executar com timeout
    const result = await Promise.race([
      requestFn(context),
      timeoutPromise
    ]);
    
    return result;
  }
  
  /**
   * Processamento síncrono otimizado
   */
  async processSync(requestFn, context, requestId) {
    // Aplicar otimizações de query se habilitado
    if (this.options.enableQueryOptimization) {
      context = this.optimizeQuery(context);
    }
    
    return await requestFn(context);
  }
  
  /**
   * Processamento paralelo de múltiplas requisições
   */
  async processParallel(requests) {
    if (!this.options.enableParallelProcessing) {
      // Processar sequencialmente se paralelo desabilitado
      const results = [];
      for (const request of requests) {
        const result = await this.processRequest(request.fn, request.context);
        results.push(result);
      }
      return results;
    }
    
    console.log(`🔄 Processando ${requests.length} requisições em paralelo...`);
    
    // Dividir em lotes para evitar sobrecarga
    const batches = this.createBatches(requests, this.options.batchSize);
    const allResults = [];
    
    for (const batch of batches) {
      const batchPromises = batch.map(request => 
        this.processRequest(request.fn, request.context)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      allResults.push(...batchResults.map(r => r.value || r.reason));
    }
    
    return allResults;
  }
  
  /**
   * Adiciona requisição à fila de processamento em lote
   */
  addToBatch(requestFn, context = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        fn: requestFn,
        context,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Inicia processador de lotes
   */
  startBatchProcessor() {
    this.batchProcessor = setInterval(() => {
      this.processBatch();
    }, 100); // Processar a cada 100ms
  }
  
  /**
   * Processa lote de requisições
   */
  async processBatch() {
    if (this.requestQueue.length === 0) return;
    
    const batch = this.requestQueue.splice(0, this.options.batchSize);
    
    console.log(`📦 Processando lote de ${batch.length} requisições...`);
    
    const promises = batch.map(async (request) => {
      try {
        const result = await this.processRequest(request.fn, request.context);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    });
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Otimiza query/contexto da requisição
   */
  optimizeQuery(context) {
    const optimized = { ...context };
    
    // Otimizações específicas baseadas no tipo de requisição
    if (context.type === 'fact-check') {
      // Limitar tamanho do texto para fact-checking
      if (optimized.text && optimized.text.length > 2000) {
        optimized.text = optimized.text.substring(0, 2000);
        optimized.truncated = true;
      }
      
      // Otimizar parâmetros de busca
      optimized.maxResults = Math.min(optimized.maxResults || 10, 5);
    }
    
    if (context.type === 'embedding') {
      // Otimizar processamento de embeddings
      optimized.batchSize = Math.min(optimized.batchSize || 10, 5);
    }
    
    if (context.type === 'llm') {
      // Otimizar prompts para LLM
      optimized.maxTokens = Math.min(optimized.maxTokens || 1000, 500);
      optimized.temperature = optimized.temperature || 0.3; // Mais determinístico
    }
    
    return optimized;
  }
  
  /**
   * Cria lotes de requisições
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Gera ID único para requisição
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Registra tempo de resposta
   */
  recordResponseTime(responseTime) {
    this.responseTimeStats.samples.push(responseTime);
    
    // Manter apenas últimas 1000 amostras
    if (this.responseTimeStats.samples.length > 1000) {
      this.responseTimeStats.samples = this.responseTimeStats.samples.slice(-1000);
    }
    
    this.updateStats();
  }
  
  /**
   * Atualiza estatísticas de response time
   */
  updateStats() {
    const samples = [...this.responseTimeStats.samples].sort((a, b) => a - b);
    const count = samples.length;
    
    if (count === 0) return;
    
    this.responseTimeStats.avg = samples.reduce((a, b) => a + b, 0) / count;
    this.responseTimeStats.max = samples[count - 1];
    this.responseTimeStats.p50 = samples[Math.floor(count * 0.5)];
    this.responseTimeStats.p95 = samples[Math.floor(count * 0.95)];
    this.responseTimeStats.p99 = samples[Math.floor(count * 0.99)];
  }
  
  /**
   * Verifica se está dentro do target de performance
   */
  isWithinTarget() {
    return this.responseTimeStats.p95 <= this.options.maxResponseTime;
  }
  
  /**
   * Obtém estatísticas de performance
   */
  getStats() {
    return {
      ...this.responseTimeStats,
      target: this.options.maxResponseTime,
      withinTarget: this.isWithinTarget(),
      queueSize: this.requestQueue.length,
      samplesCount: this.responseTimeStats.samples.length
    };
  }
  
  /**
   * Gera relatório de performance
   */
  generateReport() {
    const stats = this.getStats();
    
    return {
      timestamp: Date.now(),
      performance: {
        responseTime: {
          avg: `${stats.avg.toFixed(2)}ms`,
          p50: `${stats.p50.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          p99: `${stats.p99.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`
        },
        target: `${stats.target}ms`,
        status: stats.withinTarget ? 'WITHIN_TARGET' : 'ABOVE_TARGET',
        queueSize: stats.queueSize,
        samplesCount: stats.samplesCount
      },
      recommendations: this.generateRecommendations(stats)
    };
  }
  
  /**
   * Gera recomendações baseadas nas métricas
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (!stats.withinTarget) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `P95 response time (${stats.p95.toFixed(2)}ms) acima do target (${stats.target}ms)`,
        actions: [
          'Habilitar processamento paralelo',
          'Otimizar queries',
          'Implementar cache mais agressivo',
          'Reduzir timeout threshold'
        ]
      });
    }
    
    if (stats.queueSize > 10) {
      recommendations.push({
        type: 'queue',
        priority: 'medium',
        message: `Fila de requisições grande (${stats.queueSize} itens)`,
        actions: [
          'Aumentar batch size',
          'Reduzir intervalo de processamento',
          'Implementar priorização de requisições'
        ]
      });
    }
    
    if (stats.max > stats.target * 3) {
      recommendations.push({
        type: 'outliers',
        priority: 'medium',
        message: `Outliers detectados (max: ${stats.max.toFixed(2)}ms)`,
        actions: [
          'Implementar timeout mais agressivo',
          'Identificar requisições problemáticas',
          'Implementar circuit breaker'
        ]
      });
    }
    
    return recommendations;
  }
  
  /**
   * Limpa estatísticas
   */
  reset() {
    this.responseTimeStats = {
      samples: [],
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      max: 0
    };
    
    this.requestQueue = [];
    console.log('🔄 Estatísticas de response time resetadas');
  }
  
  /**
   * Destrói o otimizador
   */
  destroy() {
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }
    
    this.reset();
    console.log('🗑️ Response Optimizer destruído');
  }
}

// Instância global
let globalOptimizer = null;

/**
 * Obtém instância global do otimizador
 */
function getResponseOptimizer(options = {}) {
  if (!globalOptimizer) {
    globalOptimizer = new ResponseOptimizer(options);
  }
  return globalOptimizer;
}

/**
 * Decorator para otimização automática de response time
 */
function optimizeResponse(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args) {
    const optimizer = getResponseOptimizer();
    
    return await optimizer.processRequest(
      async (context) => {
        return await originalMethod.apply(this, args);
      },
      { 
        method: `${target.constructor.name}.${propertyName}`,
        args: args.length 
      }
    );
  };
  
  return descriptor;
}

module.exports = {
  ResponseOptimizer,
  getResponseOptimizer,
  optimizeResponse
};
