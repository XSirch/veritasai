/**
 * VER-024: Performance Monitor
 * Sistema de monitoramento de performance em tempo real
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableMemoryTracking: true,
      enableTimingTracking: true,
      enableCacheTracking: true,
      sampleInterval: 1000, // ms
      maxSamples: 100,
      thresholds: {
        responseTime: 2000, // ms
        memoryUsage: 60 * 1024 * 1024, // 60MB
        cacheHitRate: 0.6 // 60%
      },
      ...options
    };
    
    this.metrics = {
      responseTime: [],
      memoryUsage: [],
      cacheStats: {
        hits: 0,
        misses: 0,
        total: 0
      },
      cpuUsage: [],
      errors: [],
      operations: new Map()
    };
    
    this.isMonitoring = false;
    this.intervalId = null;
    this.startTime = Date.now();
    
    this.init();
  }
  
  /**
   * Inicializa o monitor
   */
  init() {
    console.log('🔍 Inicializando Performance Monitor...');
    
    // Configurar listeners de performance
    if (typeof window !== 'undefined' && window.performance) {
      this.setupPerformanceObserver();
    }
    
    // Configurar monitoramento de erros
    this.setupErrorTracking();
    
    console.log('✅ Performance Monitor inicializado');
  }
  
  /**
   * Configura Performance Observer para métricas do navegador
   */
  setupPerformanceObserver() {
    try {
      if ('PerformanceObserver' in window) {
        // Observer para navigation timing
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordNavigationTiming(entry);
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        
        // Observer para resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordResourceTiming(entry);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        
        // Observer para measure timing
        const measureObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMeasureTiming(entry);
          }
        });
        measureObserver.observe({ entryTypes: ['measure'] });
      }
    } catch (error) {
      console.warn('⚠️ PerformanceObserver não suportado:', error.message);
    }
  }
  
  /**
   * Configura tracking de erros
   */
  setupErrorTracking() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.recordError({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: Date.now()
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.recordError({
          type: 'promise',
          message: event.reason?.message || 'Unhandled Promise Rejection',
          timestamp: Date.now()
        });
      });
    }
  }
  
  /**
   * Inicia monitoramento contínuo
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('⚠️ Monitoramento já está ativo');
      return;
    }
    
    console.log('🚀 Iniciando monitoramento de performance...');
    this.isMonitoring = true;
    
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.options.sampleInterval);
  }
  
  /**
   * Para monitoramento contínuo
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    console.log('⏹️ Parando monitoramento de performance...');
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Coleta métricas atuais
   */
  collectMetrics() {
    const timestamp = Date.now();
    
    // Coletar métricas de memória
    if (this.options.enableMemoryTracking) {
      this.collectMemoryMetrics(timestamp);
    }
    
    // Coletar métricas de timing
    if (this.options.enableTimingTracking) {
      this.collectTimingMetrics(timestamp);
    }
    
    // Limitar número de amostras
    this.limitSamples();
  }
  
  /**
   * Coleta métricas de memória
   */
  collectMemoryMetrics(timestamp) {
    try {
      let memoryInfo = null;
      
      // Chrome/Edge
      if (performance.memory) {
        memoryInfo = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      // Node.js
      else if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        memoryInfo = {
          used: usage.heapUsed,
          total: usage.heapTotal,
          limit: usage.rss
        };
      }
      
      if (memoryInfo) {
        this.metrics.memoryUsage.push({
          timestamp,
          ...memoryInfo,
          percentage: (memoryInfo.used / memoryInfo.total) * 100
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao coletar métricas de memória:', error.message);
    }
  }
  
  /**
   * Coleta métricas de timing
   */
  collectTimingMetrics(timestamp) {
    try {
      if (typeof performance !== 'undefined' && performance.now) {
        // Simular CPU usage baseado em timing
        const start = performance.now();
        
        // Operação simples para medir overhead
        for (let i = 0; i < 1000; i++) {
          Math.random();
        }
        
        const end = performance.now();
        const cpuTime = end - start;
        
        this.metrics.cpuUsage.push({
          timestamp,
          time: cpuTime,
          normalized: Math.min(cpuTime / 10, 100) // Normalizar para 0-100%
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao coletar métricas de timing:', error.message);
    }
  }
  
  /**
   * Limita número de amostras para evitar vazamento de memória
   */
  limitSamples() {
    const { maxSamples } = this.options;
    
    if (this.metrics.responseTime.length > maxSamples) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-maxSamples);
    }
    
    if (this.metrics.memoryUsage.length > maxSamples) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-maxSamples);
    }
    
    if (this.metrics.cpuUsage.length > maxSamples) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-maxSamples);
    }
  }
  
  /**
   * Registra timing de operação
   */
  startOperation(name) {
    const startTime = performance.now();
    const operationId = `${name}-${Date.now()}-${Math.random()}`;
    
    this.metrics.operations.set(operationId, {
      name,
      startTime,
      timestamp: Date.now()
    });
    
    return operationId;
  }
  
  /**
   * Finaliza timing de operação
   */
  endOperation(operationId) {
    const operation = this.metrics.operations.get(operationId);
    if (!operation) {
      console.warn('⚠️ Operação não encontrada:', operationId);
      return null;
    }
    
    const endTime = performance.now();
    const duration = endTime - operation.startTime;
    
    const result = {
      name: operation.name,
      duration,
      startTime: operation.startTime,
      endTime,
      timestamp: operation.timestamp
    };
    
    this.metrics.responseTime.push(result);
    this.metrics.operations.delete(operationId);
    
    // Verificar threshold
    if (duration > this.options.thresholds.responseTime) {
      console.warn(`⚠️ Operação lenta detectada: ${operation.name} (${duration.toFixed(2)}ms)`);
    }
    
    return result;
  }
  
  /**
   * Registra hit/miss de cache
   */
  recordCacheHit() {
    this.metrics.cacheStats.hits++;
    this.metrics.cacheStats.total++;
  }
  
  recordCacheMiss() {
    this.metrics.cacheStats.misses++;
    this.metrics.cacheStats.total++;
  }
  
  /**
   * Registra erro
   */
  recordError(error) {
    this.metrics.errors.push({
      ...error,
      timestamp: error.timestamp || Date.now()
    });
    
    // Limitar número de erros
    if (this.metrics.errors.length > this.options.maxSamples) {
      this.metrics.errors = this.metrics.errors.slice(-this.options.maxSamples);
    }
  }
  
  /**
   * Registra timing de navegação
   */
  recordNavigationTiming(entry) {
    this.metrics.responseTime.push({
      name: 'navigation',
      duration: entry.loadEventEnd - entry.navigationStart,
      startTime: entry.navigationStart,
      endTime: entry.loadEventEnd,
      timestamp: Date.now(),
      details: {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
        firstPaint: entry.loadEventStart - entry.navigationStart
      }
    });
  }
  
  /**
   * Registra timing de recursos
   */
  recordResourceTiming(entry) {
    this.metrics.responseTime.push({
      name: `resource-${entry.name}`,
      duration: entry.responseEnd - entry.startTime,
      startTime: entry.startTime,
      endTime: entry.responseEnd,
      timestamp: Date.now(),
      details: {
        type: entry.initiatorType,
        size: entry.transferSize
      }
    });
  }
  
  /**
   * Registra timing de medidas customizadas
   */
  recordMeasureTiming(entry) {
    this.metrics.responseTime.push({
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.startTime + entry.duration,
      timestamp: Date.now(),
      details: {
        type: 'measure'
      }
    });
  }
  
  /**
   * Obtém estatísticas atuais
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calcular estatísticas de response time
    const responseTimes = this.metrics.responseTime.map(r => r.duration);
    const responseStats = this.calculateStats(responseTimes);
    
    // Calcular estatísticas de memória
    const memoryUsages = this.metrics.memoryUsage.map(m => m.used);
    const memoryStats = this.calculateStats(memoryUsages);
    
    // Calcular cache hit rate
    const cacheHitRate = this.metrics.cacheStats.total > 0 
      ? this.metrics.cacheStats.hits / this.metrics.cacheStats.total 
      : 0;
    
    return {
      uptime,
      responseTime: {
        ...responseStats,
        threshold: this.options.thresholds.responseTime,
        withinThreshold: responseStats.p95 <= this.options.thresholds.responseTime
      },
      memory: {
        ...memoryStats,
        threshold: this.options.thresholds.memoryUsage,
        withinThreshold: memoryStats.current <= this.options.thresholds.memoryUsage
      },
      cache: {
        hitRate: cacheHitRate,
        hits: this.metrics.cacheStats.hits,
        misses: this.metrics.cacheStats.misses,
        total: this.metrics.cacheStats.total,
        threshold: this.options.thresholds.cacheHitRate,
        withinThreshold: cacheHitRate >= this.options.thresholds.cacheHitRate
      },
      errors: {
        total: this.metrics.errors.length,
        recent: this.metrics.errors.filter(e => now - e.timestamp < 60000).length
      },
      operations: {
        active: this.metrics.operations.size,
        completed: this.metrics.responseTime.length
      }
    };
  }
  
  /**
   * Calcula estatísticas de um array de números
   */
  calculateStats(values) {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        current: 0,
        count: 0
      };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      current: values[values.length - 1] || 0,
      count: values.length
    };
  }
  
  /**
   * Gera relatório de performance
   */
  generateReport() {
    const stats = this.getStats();
    
    return {
      timestamp: Date.now(),
      uptime: stats.uptime,
      summary: {
        responseTimeOk: stats.responseTime.withinThreshold,
        memoryOk: stats.memory.withinThreshold,
        cacheOk: stats.cache.withinThreshold,
        errorsLow: stats.errors.recent < 5
      },
      metrics: stats,
      thresholds: this.options.thresholds,
      recommendations: this.generateRecommendations(stats)
    };
  }
  
  /**
   * Gera recomendações baseadas nas métricas
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (!stats.responseTime.withinThreshold) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Response time muito alto (${stats.responseTime.p95.toFixed(2)}ms). Meta: ${this.options.thresholds.responseTime}ms`,
        actions: ['Otimizar queries', 'Implementar cache', 'Usar processamento assíncrono']
      });
    }
    
    if (!stats.memory.withinThreshold) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: `Uso de memória muito alto (${(stats.memory.current / 1024 / 1024).toFixed(2)}MB). Meta: ${this.options.thresholds.memoryUsage / 1024 / 1024}MB`,
        actions: ['Implementar lazy loading', 'Otimizar garbage collection', 'Reduzir objetos em memória']
      });
    }
    
    if (!stats.cache.withinThreshold) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        message: `Cache hit rate baixo (${(stats.cache.hitRate * 100).toFixed(1)}%). Meta: ${this.options.thresholds.cacheHitRate * 100}%`,
        actions: ['Revisar estratégia de cache', 'Aumentar TTL', 'Implementar cache warming']
      });
    }
    
    if (stats.errors.recent > 0) {
      recommendations.push({
        type: 'reliability',
        priority: stats.errors.recent > 5 ? 'high' : 'medium',
        message: `${stats.errors.recent} erros recentes detectados`,
        actions: ['Revisar logs de erro', 'Implementar tratamento de erros', 'Adicionar monitoring']
      });
    }
    
    return recommendations;
  }
  
  /**
   * Limpa todas as métricas
   */
  reset() {
    this.metrics = {
      responseTime: [],
      memoryUsage: [],
      cacheStats: {
        hits: 0,
        misses: 0,
        total: 0
      },
      cpuUsage: [],
      errors: [],
      operations: new Map()
    };
    
    this.startTime = Date.now();
    console.log('🔄 Métricas de performance resetadas');
  }
  
  /**
   * Destrói o monitor
   */
  destroy() {
    this.stopMonitoring();
    this.reset();
    console.log('🗑️ Performance Monitor destruído');
  }
}

// Instância global para uso em toda a aplicação
let globalMonitor = null;

/**
 * Obtém instância global do monitor
 */
function getPerformanceMonitor(options = {}) {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(options);
  }
  return globalMonitor;
}

/**
 * Decorator para monitorar performance de funções
 */
function monitorPerformance(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args) {
    const monitor = getPerformanceMonitor();
    const operationId = monitor.startOperation(`${target.constructor.name}.${propertyName}`);
    
    try {
      const result = await originalMethod.apply(this, args);
      monitor.endOperation(operationId);
      return result;
    } catch (error) {
      monitor.endOperation(operationId);
      monitor.recordError({
        type: 'method',
        method: `${target.constructor.name}.${propertyName}`,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  };
  
  return descriptor;
}

module.exports = {
  PerformanceMonitor,
  getPerformanceMonitor,
  monitorPerformance
};
