/**
 * VER-024: Memory Optimizer
 * Sistema de otimização de memória para reduzir uso < 60MB
 */

class MemoryOptimizer {
  constructor(options = {}) {
    this.options = {
      maxMemoryUsage: 60 * 1024 * 1024, // 60MB
      gcInterval: 30000, // 30 segundos
      enableLazyLoading: true,
      enableObjectPooling: true,
      enableWeakReferences: true,
      memoryThreshold: 0.8, // 80% do limite
      ...options
    };
    
    this.lazyModules = new Map();
    this.objectPools = new Map();
    this.weakRefs = new Set();
    this.memoryStats = {
      peak: 0,
      current: 0,
      gcCount: 0,
      lastGc: Date.now()
    };
    
    this.init();
  }
  
  /**
   * Inicializa o otimizador
   */
  init() {
    console.log('🧠 Inicializando Memory Optimizer...');
    
    // Configurar monitoramento de memória
    this.startMemoryMonitoring();
    
    // Configurar garbage collection automático
    this.startAutoGC();
    
    // Configurar listeners de eventos
    this.setupEventListeners();
    
    console.log('✅ Memory Optimizer inicializado');
  }
  
  /**
   * Lazy loading de módulos
   */
  async loadModule(moduleName, importPath) {
    if (this.lazyModules.has(moduleName)) {
      return this.lazyModules.get(moduleName);
    }
    
    console.log(`📦 Carregando módulo lazy: ${moduleName}`);
    
    try {
      const module = await import(importPath);
      
      // Usar WeakRef para permitir garbage collection
      if (this.options.enableWeakReferences) {
        const weakRef = new WeakRef(module);
        this.weakRefs.add(weakRef);
        this.lazyModules.set(moduleName, weakRef);
        return module;
      } else {
        this.lazyModules.set(moduleName, module);
        return module;
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);
      throw error;
    }
  }
  
  /**
   * Object pooling para reutilização
   */
  getPooledObject(type, factory) {
    if (!this.options.enableObjectPooling) {
      return factory();
    }
    
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }
    
    const pool = this.objectPools.get(type);
    
    if (pool.length > 0) {
      const obj = pool.pop();
      this.resetObject(obj);
      return obj;
    }
    
    return factory();
  }
  
  /**
   * Retorna objeto para o pool
   */
  returnToPool(type, obj) {
    if (!this.options.enableObjectPooling) {
      return;
    }
    
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }
    
    const pool = this.objectPools.get(type);
    
    // Limitar tamanho do pool
    if (pool.length < 10) {
      this.resetObject(obj);
      pool.push(obj);
    }
  }
  
  /**
   * Reset de objeto para reutilização
   */
  resetObject(obj) {
    if (obj && typeof obj === 'object') {
      // Limpar propriedades do objeto
      Object.keys(obj).forEach(key => {
        if (obj.hasOwnProperty(key)) {
          delete obj[key];
        }
      });
    }
  }
  
  /**
   * Força garbage collection
   */
  forceGC() {
    console.log('🗑️ Forçando garbage collection...');
    
    // Limpar WeakRefs mortas
    this.cleanupWeakRefs();
    
    // Limpar pools desnecessários
    this.cleanupObjectPools();
    
    // Limpar módulos lazy não utilizados
    this.cleanupLazyModules();
    
    // Forçar GC se disponível (Chrome DevTools)
    if (window.gc) {
      window.gc();
    }
    
    this.memoryStats.gcCount++;
    this.memoryStats.lastGc = Date.now();
    
    console.log('✅ Garbage collection concluído');
  }
  
  /**
   * Limpa WeakRefs mortas
   */
  cleanupWeakRefs() {
    const deadRefs = [];
    
    for (const weakRef of this.weakRefs) {
      if (weakRef.deref() === undefined) {
        deadRefs.push(weakRef);
      }
    }
    
    deadRefs.forEach(ref => this.weakRefs.delete(ref));
    
    if (deadRefs.length > 0) {
      console.log(`🧹 Removidas ${deadRefs.length} WeakRefs mortas`);
    }
  }
  
  /**
   * Limpa object pools
   */
  cleanupObjectPools() {
    let totalCleaned = 0;
    
    for (const [type, pool] of this.objectPools.entries()) {
      // Manter apenas metade dos objetos no pool
      const keepCount = Math.floor(pool.length / 2);
      const removed = pool.splice(keepCount);
      totalCleaned += removed.length;
    }
    
    if (totalCleaned > 0) {
      console.log(`🧹 Removidos ${totalCleaned} objetos dos pools`);
    }
  }
  
  /**
   * Limpa módulos lazy não utilizados
   */
  cleanupLazyModules() {
    const toRemove = [];
    
    for (const [name, moduleRef] of this.lazyModules.entries()) {
      if (moduleRef instanceof WeakRef && moduleRef.deref() === undefined) {
        toRemove.push(name);
      }
    }
    
    toRemove.forEach(name => this.lazyModules.delete(name));
    
    if (toRemove.length > 0) {
      console.log(`🧹 Removidos ${toRemove.length} módulos lazy não utilizados`);
    }
  }
  
  /**
   * Monitora uso de memória
   */
  startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // A cada 5 segundos
  }
  
  /**
   * Verifica uso atual de memória
   */
  checkMemoryUsage() {
    let memoryUsage = 0;
    
    try {
      if (performance.memory) {
        memoryUsage = performance.memory.usedJSHeapSize;
      } else if (typeof process !== 'undefined' && process.memoryUsage) {
        memoryUsage = process.memoryUsage().heapUsed;
      }
      
      this.memoryStats.current = memoryUsage;
      
      if (memoryUsage > this.memoryStats.peak) {
        this.memoryStats.peak = memoryUsage;
      }
      
      // Verificar se excedeu threshold
      const threshold = this.options.maxMemoryUsage * this.options.memoryThreshold;
      
      if (memoryUsage > threshold) {
        console.warn(`⚠️ Uso de memória alto: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        this.forceGC();
      }
      
      // Verificar se excedeu limite máximo
      if (memoryUsage > this.options.maxMemoryUsage) {
        console.error(`❌ Limite de memória excedido: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        this.emergencyCleanup();
      }
      
    } catch (error) {
      console.warn('⚠️ Erro ao verificar uso de memória:', error.message);
    }
  }
  
  /**
   * Limpeza de emergência
   */
  emergencyCleanup() {
    console.log('🚨 Executando limpeza de emergência...');
    
    // Limpar todos os pools
    this.objectPools.clear();
    
    // Limpar módulos lazy
    this.lazyModules.clear();
    
    // Limpar WeakRefs
    this.weakRefs.clear();
    
    // Forçar GC múltiplas vezes
    for (let i = 0; i < 3; i++) {
      if (window.gc) {
        window.gc();
      }
    }
    
    console.log('✅ Limpeza de emergência concluída');
  }
  
  /**
   * Inicia garbage collection automático
   */
  startAutoGC() {
    setInterval(() => {
      this.forceGC();
    }, this.options.gcInterval);
  }
  
  /**
   * Configura listeners de eventos
   */
  setupEventListeners() {
    // Cleanup quando página é descarregada
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      
      // Cleanup quando tab fica inativa
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.forceGC();
        }
      });
    }
  }
  
  /**
   * Otimiza arrays grandes
   */
  optimizeArray(arr, maxSize = 1000) {
    if (arr.length > maxSize) {
      console.log(`📊 Otimizando array de ${arr.length} para ${maxSize} elementos`);
      return arr.slice(-maxSize); // Manter apenas os últimos elementos
    }
    return arr;
  }
  
  /**
   * Otimiza objetos grandes
   */
  optimizeObject(obj, maxKeys = 100) {
    const keys = Object.keys(obj);
    
    if (keys.length > maxKeys) {
      console.log(`📊 Otimizando objeto de ${keys.length} para ${maxKeys} chaves`);
      
      const optimized = {};
      const keepKeys = keys.slice(-maxKeys);
      
      keepKeys.forEach(key => {
        optimized[key] = obj[key];
      });
      
      return optimized;
    }
    
    return obj;
  }
  
  /**
   * Cria proxy para lazy loading de propriedades
   */
  createLazyProxy(target, lazyProps) {
    return new Proxy(target, {
      get(obj, prop) {
        if (lazyProps.has(prop) && !(prop in obj)) {
          console.log(`🔄 Carregando propriedade lazy: ${prop}`);
          const factory = lazyProps.get(prop);
          obj[prop] = factory();
        }
        return obj[prop];
      }
    });
  }
  
  /**
   * Obtém estatísticas de memória
   */
  getMemoryStats() {
    return {
      ...this.memoryStats,
      currentMB: (this.memoryStats.current / 1024 / 1024).toFixed(2),
      peakMB: (this.memoryStats.peak / 1024 / 1024).toFixed(2),
      limitMB: (this.options.maxMemoryUsage / 1024 / 1024).toFixed(2),
      utilizationPercent: ((this.memoryStats.current / this.options.maxMemoryUsage) * 100).toFixed(1),
      poolsCount: this.objectPools.size,
      lazyModulesCount: this.lazyModules.size,
      weakRefsCount: this.weakRefs.size
    };
  }
  
  /**
   * Cleanup geral
   */
  cleanup() {
    console.log('🧹 Executando cleanup do Memory Optimizer...');
    
    this.objectPools.clear();
    this.lazyModules.clear();
    this.weakRefs.clear();
    
    console.log('✅ Cleanup concluído');
  }
}

// Instância global
let globalOptimizer = null;

/**
 * Obtém instância global do otimizador
 */
function getMemoryOptimizer(options = {}) {
  if (!globalOptimizer) {
    globalOptimizer = new MemoryOptimizer(options);
  }
  return globalOptimizer;
}

/**
 * Decorator para otimização automática de métodos
 */
function optimizeMemory(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args) {
    const optimizer = getMemoryOptimizer();
    
    try {
      const result = originalMethod.apply(this, args);
      
      // Verificar memória após execução
      optimizer.checkMemoryUsage();
      
      return result;
    } catch (error) {
      // Forçar GC em caso de erro
      optimizer.forceGC();
      throw error;
    }
  };
  
  return descriptor;
}

module.exports = {
  MemoryOptimizer,
  getMemoryOptimizer,
  optimizeMemory
};
