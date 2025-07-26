/**
 * CostTracker - Sistema avançado de tracking de custos para APIs LLM
 * Monitora gastos, usage patterns e otimizações de custo
 */

/**
 * Classe principal para tracking de custos
 */
class CostTracker {
  constructor(options = {}) {
    this.options = {
      currency: options.currency || 'USD',
      budgetLimit: options.budgetLimit || null,
      alertThresholds: options.alertThresholds || [0.5, 0.8, 0.95],
      trackingEnabled: options.trackingEnabled !== false,
      persistData: options.persistData !== false,
      ...options
    };
    
    // Dados de tracking
    this.data = {
      totalCost: 0,
      totalRequests: 0,
      totalTokens: 0,
      startTime: Date.now(),
      lastReset: Date.now(),
      
      // Por modelo
      models: {},
      
      // Por período
      daily: {},
      monthly: {},
      
      // Por tipo de operação
      operations: {},
      
      // Histórico de requests
      requestHistory: [],
      
      // Alertas disparados
      alerts: []
    };
    
    // Configurações de preços por modelo
    this.pricing = {
      'mixtral-8x7b-32768': {
        inputCost: 0.00027,
        outputCost: 0.00027,
        currency: 'USD',
        per: 1000 // tokens
      },
      'llama3-8b-8192': {
        inputCost: 0.00005,
        outputCost: 0.00005,
        currency: 'USD',
        per: 1000
      },
      'gemma-7b-it': {
        inputCost: 0.00007,
        outputCost: 0.00007,
        currency: 'USD',
        per: 1000
      }
    };
    
    // Carregar dados persistidos se habilitado
    if (this.options.persistData) {
      this._loadPersistedData();
    }
  }
  
  /**
   * Registra uso de API
   * @param {Object} usage - Dados de uso da API
   * @param {string} model - Modelo utilizado
   * @param {string} operation - Tipo de operação
   * @returns {Object} Informações de custo calculadas
   */
  trackUsage(usage, model, operation = 'fact_check') {
    if (!this.options.trackingEnabled) {
      return { cost: 0, tracked: false };
    }
    
    const cost = this._calculateCost(usage, model);
    const timestamp = Date.now();
    
    // Atualizar totais
    this.data.totalCost += cost;
    this.data.totalRequests++;
    this.data.totalTokens += usage.total_tokens || 0;
    
    // Tracking por modelo
    if (!this.data.models[model]) {
      this.data.models[model] = {
        requests: 0,
        tokens: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0
      };
    }
    
    this.data.models[model].requests++;
    this.data.models[model].tokens += usage.total_tokens || 0;
    this.data.models[model].cost += cost;
    this.data.models[model].inputTokens += usage.prompt_tokens || 0;
    this.data.models[model].outputTokens += usage.completion_tokens || 0;
    
    // Tracking por operação
    if (!this.data.operations[operation]) {
      this.data.operations[operation] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    this.data.operations[operation].requests++;
    this.data.operations[operation].tokens += usage.total_tokens || 0;
    this.data.operations[operation].cost += cost;
    
    // Tracking por período
    this._trackByPeriod(cost, usage.total_tokens || 0, timestamp);
    
    // Adicionar ao histórico
    this.data.requestHistory.push({
      timestamp: timestamp,
      model: model,
      operation: operation,
      usage: usage,
      cost: cost
    });
    
    // Limitar histórico (manter últimas 1000 requests)
    if (this.data.requestHistory.length > 1000) {
      this.data.requestHistory = this.data.requestHistory.slice(-1000);
    }
    
    // Verificar alertas de budget
    this._checkBudgetAlerts();
    
    // Persistir dados se habilitado
    if (this.options.persistData) {
      this._persistData();
    }
    
    return {
      cost: cost,
      totalCost: this.data.totalCost,
      tracked: true,
      model: model,
      operation: operation,
      timestamp: timestamp
    };
  }
  
  /**
   * Obtém estatísticas detalhadas
   * @returns {Object} Estatísticas completas
   */
  getStats() {
    const uptime = Date.now() - this.data.startTime;
    const timeSinceReset = Date.now() - this.data.lastReset;
    
    return {
      summary: {
        totalCost: this.data.totalCost,
        totalRequests: this.data.totalRequests,
        totalTokens: this.data.totalTokens,
        averageCostPerRequest: this.data.totalRequests > 0 
          ? (this.data.totalCost / this.data.totalRequests).toFixed(6)
          : 0,
        averageCostPerToken: this.data.totalTokens > 0
          ? (this.data.totalCost / this.data.totalTokens * 1000).toFixed(6)
          : 0,
        currency: this.options.currency,
        uptime: uptime,
        timeSinceReset: timeSinceReset
      },
      
      budget: this.options.budgetLimit ? {
        limit: this.options.budgetLimit,
        used: this.data.totalCost,
        remaining: this.options.budgetLimit - this.data.totalCost,
        percentageUsed: (this.data.totalCost / this.options.budgetLimit * 100).toFixed(2)
      } : null,
      
      models: this._getModelStats(),
      operations: this._getOperationStats(),
      periods: this._getPeriodStats(),
      
      trends: this._calculateTrends(),
      projections: this._calculateProjections(),
      
      alerts: this.data.alerts.slice(-10), // Últimos 10 alertas
      
      config: {
        trackingEnabled: this.options.trackingEnabled,
        budgetLimit: this.options.budgetLimit,
        alertThresholds: this.options.alertThresholds,
        persistData: this.options.persistData
      }
    };
  }
  
  /**
   * Obtém recomendações de otimização
   * @returns {Array} Lista de recomendações
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const stats = this.getStats();
    
    // Recomendação de modelo mais econômico
    const modelStats = Object.entries(this.data.models)
      .map(([model, data]) => ({
        model,
        costPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        ...data
      }))
      .sort((a, b) => b.costPerToken - a.costPerToken);
    
    if (modelStats.length > 1) {
      const mostExpensive = modelStats[0];
      const cheapest = modelStats[modelStats.length - 1];
      
      if (mostExpensive.costPerToken > cheapest.costPerToken * 2) {
        recommendations.push({
          type: 'model_optimization',
          priority: 'high',
          title: 'Considerar modelo mais econômico',
          description: `${mostExpensive.model} custa ${(mostExpensive.costPerToken / cheapest.costPerToken).toFixed(1)}x mais por token que ${cheapest.model}`,
          potentialSavings: this._calculatePotentialSavings(mostExpensive, cheapest),
          action: `Avaliar usar ${cheapest.model} para operações menos críticas`
        });
      }
    }
    
    // Recomendação de cache
    const recentRequests = this.data.requestHistory.slice(-100);
    const duplicateRequests = this._findDuplicateRequests(recentRequests);
    
    if (duplicateRequests.length > 10) {
      const potentialSavings = duplicateRequests.reduce((sum, req) => sum + req.cost, 0);
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Implementar cache mais agressivo',
        description: `${duplicateRequests.length} requests duplicadas detectadas`,
        potentialSavings: potentialSavings,
        action: 'Aumentar TTL do cache ou implementar cache persistente'
      });
    }
    
    // Recomendação de budget
    if (this.options.budgetLimit) {
      const percentageUsed = (this.data.totalCost / this.options.budgetLimit) * 100;
      
      if (percentageUsed > 80) {
        recommendations.push({
          type: 'budget_warning',
          priority: 'high',
          title: 'Limite de orçamento próximo',
          description: `${percentageUsed.toFixed(1)}% do orçamento utilizado`,
          action: 'Revisar uso ou aumentar limite de orçamento'
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Reseta estatísticas
   * @param {boolean} keepHistory - Manter histórico de requests
   */
  reset(keepHistory = false) {
    const oldData = { ...this.data };
    
    this.data = {
      totalCost: 0,
      totalRequests: 0,
      totalTokens: 0,
      startTime: Date.now(),
      lastReset: Date.now(),
      models: {},
      daily: {},
      monthly: {},
      operations: {},
      requestHistory: keepHistory ? this.data.requestHistory : [],
      alerts: keepHistory ? this.data.alerts : []
    };
    
    if (this.options.persistData) {
      this._persistData();
    }
    
    return {
      reset: true,
      previousData: oldData,
      timestamp: Date.now()
    };
  }
  
  /**
   * Calcula custo baseado no uso
   * @private
   */
  _calculateCost(usage, model) {
    const pricing = this.pricing[model];
    if (!pricing) {
      console.warn(`Preço não encontrado para modelo ${model}`);
      return 0;
    }
    
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    
    const inputCost = (inputTokens / pricing.per) * pricing.inputCost;
    const outputCost = (outputTokens / pricing.per) * pricing.outputCost;
    
    return inputCost + outputCost;
  }
  
  /**
   * Tracking por período
   * @private
   */
  _trackByPeriod(cost, tokens, timestamp) {
    const date = new Date(timestamp);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    
    // Daily tracking
    if (!this.data.daily[dayKey]) {
      this.data.daily[dayKey] = { cost: 0, tokens: 0, requests: 0 };
    }
    this.data.daily[dayKey].cost += cost;
    this.data.daily[dayKey].tokens += tokens;
    this.data.daily[dayKey].requests++;
    
    // Monthly tracking
    if (!this.data.monthly[monthKey]) {
      this.data.monthly[monthKey] = { cost: 0, tokens: 0, requests: 0 };
    }
    this.data.monthly[monthKey].cost += cost;
    this.data.monthly[monthKey].tokens += tokens;
    this.data.monthly[monthKey].requests++;
  }
  
  /**
   * Verifica alertas de orçamento
   * @private
   */
  _checkBudgetAlerts() {
    if (!this.options.budgetLimit) return;
    
    const percentageUsed = this.data.totalCost / this.options.budgetLimit;
    
    this.options.alertThresholds.forEach(threshold => {
      if (percentageUsed >= threshold) {
        const alertKey = `budget_${Math.round(threshold * 100)}`;
        
        // Verificar se alerta já foi disparado recentemente
        const recentAlert = this.data.alerts.find(alert => 
          alert.type === alertKey && 
          Date.now() - alert.timestamp < 3600000 // 1 hora
        );
        
        if (!recentAlert) {
          this.data.alerts.push({
            type: alertKey,
            message: `${Math.round(threshold * 100)}% do orçamento utilizado`,
            cost: this.data.totalCost,
            budget: this.options.budgetLimit,
            percentage: percentageUsed,
            timestamp: Date.now()
          });
        }
      }
    });
  }
  
  /**
   * Obtém estatísticas por modelo
   * @private
   */
  _getModelStats() {
    return Object.entries(this.data.models).map(([model, data]) => ({
      model,
      ...data,
      averageCostPerRequest: data.requests > 0 ? (data.cost / data.requests).toFixed(6) : 0,
      averageCostPerToken: data.tokens > 0 ? (data.cost / data.tokens * 1000).toFixed(6) : 0,
      percentageOfTotal: this.data.totalCost > 0 ? (data.cost / this.data.totalCost * 100).toFixed(2) : 0
    }));
  }
  
  /**
   * Obtém estatísticas por operação
   * @private
   */
  _getOperationStats() {
    return Object.entries(this.data.operations).map(([operation, data]) => ({
      operation,
      ...data,
      averageCostPerRequest: data.requests > 0 ? (data.cost / data.requests).toFixed(6) : 0,
      percentageOfTotal: this.data.totalCost > 0 ? (data.cost / this.data.totalCost * 100).toFixed(2) : 0
    }));
  }
  
  /**
   * Obtém estatísticas por período
   * @private
   */
  _getPeriodStats() {
    return {
      daily: Object.entries(this.data.daily)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 30) // Últimos 30 dias
        .map(([date, data]) => ({ date, ...data })),
      
      monthly: Object.entries(this.data.monthly)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 12) // Últimos 12 meses
        .map(([month, data]) => ({ month, ...data }))
    };
  }
  
  /**
   * Calcula tendências
   * @private
   */
  _calculateTrends() {
    const recentDays = Object.entries(this.data.daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7); // Últimos 7 dias
    
    if (recentDays.length < 2) {
      return { trend: 'insufficient_data' };
    }
    
    const costs = recentDays.map(([, data]) => data.cost);
    const avgFirst = costs.slice(0, Math.ceil(costs.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(costs.length / 2);
    const avgLast = costs.slice(Math.floor(costs.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(costs.length / 2);
    
    const percentageChange = avgFirst > 0 ? ((avgLast - avgFirst) / avgFirst * 100) : 0;
    
    return {
      trend: percentageChange > 10 ? 'increasing' : percentageChange < -10 ? 'decreasing' : 'stable',
      percentageChange: percentageChange.toFixed(2),
      avgDailyCostFirst: avgFirst.toFixed(6),
      avgDailyCostLast: avgLast.toFixed(6)
    };
  }
  
  /**
   * Calcula projeções
   * @private
   */
  _calculateProjections() {
    const uptime = Date.now() - this.data.startTime;
    const dailyAverage = this.data.totalCost / (uptime / (1000 * 60 * 60 * 24));
    
    return {
      dailyAverage: dailyAverage.toFixed(6),
      weeklyProjection: (dailyAverage * 7).toFixed(6),
      monthlyProjection: (dailyAverage * 30).toFixed(6),
      yearlyProjection: (dailyAverage * 365).toFixed(6)
    };
  }
  
  /**
   * Encontra requests duplicadas
   * @private
   */
  _findDuplicateRequests(requests) {
    const seen = new Map();
    const duplicates = [];
    
    requests.forEach(req => {
      const key = `${req.model}_${req.operation}_${JSON.stringify(req.usage)}`;
      
      if (seen.has(key)) {
        duplicates.push(req);
      } else {
        seen.set(key, req);
      }
    });
    
    return duplicates;
  }
  
  /**
   * Calcula economia potencial
   * @private
   */
  _calculatePotentialSavings(expensiveModel, cheapModel) {
    const savingsPerToken = expensiveModel.costPerToken - cheapModel.costPerToken;
    return (savingsPerToken * expensiveModel.tokens).toFixed(6);
  }
  
  /**
   * Carrega dados persistidos
   * @private
   */
  _loadPersistedData() {
    // Implementação básica - em produção usar localStorage ou banco
    try {
      const stored = localStorage?.getItem('veritasai_cost_tracker');
      if (stored) {
        this.data = { ...this.data, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Falha ao carregar dados de custo persistidos:', error);
    }
  }
  
  /**
   * Persiste dados
   * @private
   */
  _persistData() {
    // Implementação básica - em produção usar localStorage ou banco
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('veritasai_cost_tracker', JSON.stringify(this.data));
      }
    } catch (error) {
      console.warn('Falha ao persistir dados de custo:', error);
    }
  }
}

module.exports = CostTracker;
