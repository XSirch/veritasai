/**
 * VeritasAI - Message Handler
 * Gerencia comunicação entre content script, popup e background
 */

export class MessageHandler {
  constructor(backgroundService) {
    this.backgroundService = backgroundService;
    this.activeConnections = new Map();
    this.messageQueue = [];
    this.stats = {
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      averageResponseTime: 0
    };
    this.isInitialized = false;
  }
  
  /**
   * Inicializa o message handler
   */
  init() {
    try {
      console.log('📡 Inicializando Message Handler...');
      
      // Configurar listeners de mensagens
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
      chrome.runtime.onConnect.addListener(this.handleConnection.bind(this));
      
      this.isInitialized = true;
      console.log('✅ Message Handler inicializado');
      
    } catch (error) {
      console.error('❌ Erro na inicialização do Message Handler:', error);
      this.isInitialized = false;
      throw error;
    }
  }
  
  /**
   * Manipula mensagens recebidas
   */
  handleMessage(request, sender, sendResponse) {
    const startTime = Date.now();
    this.stats.totalMessages++;

    // Processar mensagem de forma assíncrona
    (async () => {
      try {
        console.log(`📨 Mensagem recebida: ${request.action}`, {
          from: sender.tab ? 'content-script' : 'popup',
          tabId: sender.tab?.id
        });

        // Validar request
        if (!request || !request.action) {
          throw new Error('Request inválido: action é obrigatório');
        }

        // Processar mensagem baseado na ação
        let response;
        switch (request.action) {
          case 'verifyText':
            response = await this.handleVerifyText(request, sender);
            break;

          case 'testApiKey':
            response = await this.handleTestApiKey(request, sender);
            break;

          case 'getConfiguration':
            response = await this.handleGetConfiguration(request, sender);
            break;

          case 'saveConfiguration':
            response = await this.handleSaveConfiguration(request, sender);
            break;

          case 'getStats':
            response = await this.handleGetStats(request, sender);
            break;

          case 'clearCache':
            response = await this.handleClearCache(request, sender);
            break;

          case 'ping':
            response = await this.handlePing(request, sender);
            break;

          default:
            throw new Error(`Ação não reconhecida: ${request.action}`);
        }

        // Calcular tempo de resposta
        const responseTime = Date.now() - startTime;
        this.updateStats(true, responseTime);

        // Adicionar metadados à resposta
        response.metadata = {
          ...response.metadata,
          responseTime,
          timestamp: Date.now(),
          version: '1.0.18'
        };

        console.log(`✅ Mensagem processada em ${responseTime}ms`);
        sendResponse(response);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateStats(false, responseTime);

        console.error('❌ Erro ao processar mensagem:', error);

        const errorResponse = {
          success: false,
          error: error.message,
          metadata: {
            responseTime,
            timestamp: Date.now(),
            version: '1.0.18'
          }
        };

        sendResponse(errorResponse);
      }
    })();

    // Manter canal aberto para resposta assíncrona
    return true;
  }
  
  /**
   * Manipula conexões de longa duração
   */
  handleConnection(port) {
    console.log(`🔌 Nova conexão: ${port.name}`);
    
    const connectionId = `${port.name}_${Date.now()}`;
    this.activeConnections.set(connectionId, {
      port,
      connectedAt: Date.now(),
      messageCount: 0
    });
    
    // Configurar listeners da conexão
    port.onMessage.addListener((message) => {
      this.handlePortMessage(connectionId, message);
    });
    
    port.onDisconnect.addListener(() => {
      console.log(`🔌 Conexão desconectada: ${connectionId}`);
      this.activeConnections.delete(connectionId);
    });
  }
  
  /**
   * Manipula mensagens de porta
   */
  async handlePortMessage(connectionId, message) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      console.error('Conexão não encontrada:', connectionId);
      return;
    }
    
    connection.messageCount++;
    
    try {
      // Processar mensagem (similar ao handleMessage)
      const response = await this.processPortMessage(message);
      connection.port.postMessage(response);
      
    } catch (error) {
      console.error('Erro ao processar mensagem da porta:', error);
      connection.port.postMessage({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Processa mensagem de porta
   */
  async processPortMessage(message) {
    // Implementar processamento específico para conexões de longa duração
    return {
      success: true,
      data: 'Port message processed',
      timestamp: Date.now()
    };
  }
  
  /**
   * Manipula verificação de texto
   */
  async handleVerifyText(request, sender) {
    const { text, contentType, options } = request;
    
    if (!text || text.trim().length === 0) {
      throw new Error('Texto é obrigatório para verificação');
    }
    
    const result = await this.backgroundService.verifyText({
      text: text.trim(),
      contentType: contentType || 'general',
      options: options || {}
    });
    
    return result;
  }
  
  /**
   * Manipula teste de API key
   */
  async handleTestApiKey(request, sender) {
    const { apiType, apiKey } = request;
    
    if (!apiType || !apiKey) {
      throw new Error('apiType e apiKey são obrigatórios');
    }
    
    const result = await this.backgroundService.testApiKey({
      apiType,
      apiKey
    });
    
    return result;
  }
  
  /**
   * Manipula obtenção de configuração
   */
  async handleGetConfiguration(request, sender) {
    const result = await this.backgroundService.getConfiguration();
    return result;
  }
  
  /**
   * Manipula salvamento de configuração
   */
  async handleSaveConfiguration(request, sender) {
    const { config } = request;
    
    if (!config) {
      throw new Error('Configuração é obrigatória');
    }
    
    const result = await this.backgroundService.saveConfiguration({ config });
    return result;
  }
  
  /**
   * Manipula obtenção de estatísticas
   */
  async handleGetStats(request, sender) {
    const result = await this.backgroundService.getStats();
    return result;
  }
  
  /**
   * Manipula limpeza de cache
   */
  async handleClearCache(request, sender) {
    const result = await this.backgroundService.clearAllData();
    return result;
  }
  
  /**
   * Manipula ping para verificar conectividade
   */
  async handlePing(request, sender) {
    return {
      success: true,
      data: {
        pong: true,
        uptime: Date.now() - this.backgroundService.startTime,
        isInitialized: this.backgroundService.isInitialized
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * Envia mensagem para content script
   */
  async sendToContentScript(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Envia mensagem para todas as abas ativas
   */
  async broadcastToAllTabs(message) {
    try {
      const tabs = await chrome.tabs.query({ active: true });
      
      const promises = tabs.map(tab => 
        this.sendToContentScript(tab.id, message).catch(error => {
          console.warn(`Erro ao enviar para aba ${tab.id}:`, error);
          return null;
        })
      );
      
      const results = await Promise.all(promises);
      return results.filter(result => result !== null);
      
    } catch (error) {
      console.error('Erro no broadcast:', error);
      return [];
    }
  }
  
  /**
   * Envia notificação para conexões ativas
   */
  notifyConnections(notification) {
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      try {
        connection.port.postMessage({
          type: 'notification',
          data: notification,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`Erro ao notificar conexão ${connectionId}:`, error);
        // Remover conexão inválida
        this.activeConnections.delete(connectionId);
      }
    }
  }
  
  /**
   * Atualiza estatísticas
   */
  updateStats(success, responseTime) {
    if (success) {
      this.stats.successfulMessages++;
    } else {
      this.stats.failedMessages++;
    }
    
    // Calcular média de tempo de resposta
    const totalMessages = this.stats.successfulMessages + this.stats.failedMessages;
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (totalMessages - 1) + responseTime) / totalMessages
    );
  }
  
  /**
   * Obtém estatísticas do message handler
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.activeConnections.size,
      queueSize: this.messageQueue.length,
      isInitialized: this.isInitialized
    };
  }
  
  /**
   * Processa fila de mensagens
   */
  async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      try {
        await this.handleMessage(message.request, message.sender, message.sendResponse);
      } catch (error) {
        console.error('Erro ao processar mensagem da fila:', error);
      }
    }
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    // Fechar todas as conexões ativas
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      try {
        connection.port.disconnect();
      } catch (error) {
        console.warn(`Erro ao fechar conexão ${connectionId}:`, error);
      }
    }
    
    this.activeConnections.clear();
    this.messageQueue = [];
    this.isInitialized = false;
  }
}
