/**
 * CommunicationManager - Módulo para comunicação com background script
 */

export class CommunicationManager {
  constructor() {
    this.messageHandlers = new Map();
    this.setupMessageListener();
  }
  
  /**
   * Envia mensagem para background script com Promise
   */
  sendMessage(action, data = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na comunicação'));
      }, 30000); // 30 segundos timeout
      
      chrome.runtime.sendMessage({
        action: action,
        data: data,
        timestamp: Date.now(),
        tabId: this.getTabId()
      }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        resolve(response);
      });
    });
  }
  
  /**
   * Registra handler para mensagem específica
   */
  onMessage(action, handler) {
    this.messageHandlers.set(action, handler);
  }
  
  /**
   * Remove handler de mensagem
   */
  offMessage(action) {
    this.messageHandlers.delete(action);
  }
  
  /**
   * Configura listener para mensagens do background
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        const handler = this.messageHandlers.get(request.action);
        
        if (handler) {
          const result = handler(request.data, request);
          
          // Se handler retorna Promise
          if (result && typeof result.then === 'function') {
            result
              .then(data => sendResponse({ success: true, data }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Indica resposta assíncrona
          } else {
            sendResponse({ success: true, data: result });
          }
        } else {
          // Handler padrão para ações não registradas
          this.handleDefaultMessage(request, sendResponse);
        }
      } catch (error) {
        console.error('Erro no message listener:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
  }
  
  /**
   * Handler padrão para mensagens não registradas
   */
  handleDefaultMessage(request, sendResponse) {
    switch (request.action) {
      case 'ping':
        sendResponse({ success: true, timestamp: Date.now() });
        break;
        
      case 'getStatus':
        sendResponse({ 
          success: true, 
          data: {
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
          }
        });
        break;
        
      default:
        console.warn('Ação não reconhecida:', request.action);
        sendResponse({ success: false, error: 'Ação não reconhecida' });
    }
  }
  
  /**
   * Obtém ID da aba atual
   */
  getTabId() {
    try {
      return chrome.runtime.getURL('').match(/chrome-extension:\/\/([^\/]+)/)?.[1];
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Verifica se extensão está conectada
   */
  async isConnected() {
    try {
      const response = await this.sendMessage('ping');
      return response && response.success;
    } catch {
      return false;
    }
  }
  
  /**
   * Reporta erro para análise
   */
  async reportError(error, context = {}) {
    try {
      return await this.sendMessage('reportError', {
        error: error.toString(),
        stack: error.stack,
        context: context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      });
    } catch (reportError) {
      console.error('Erro ao reportar erro:', reportError);
      throw reportError;
    }
  }
  
  /**
   * Obtém configurações da extensão
   */
  async getSettings() {
    try {
      return await this.sendMessage('getSettings');
    } catch (error) {
      console.warn('Erro ao obter configurações:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Atualiza configurações da extensão
   */
  async updateSettings(settings) {
    try {
      return await this.sendMessage('updateSettings', settings);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  }
  
  /**
   * Verifica texto com o serviço de fact-checking
   */
  async verifyText(textData) {
    try {
      return await this.sendMessage('verifyText', textData);
    } catch (error) {
      console.error('Erro na verificação de texto:', error);
      throw error;
    }
  }
  
  /**
   * Obtém resultado detalhado de uma análise
   */
  async getDetailedResult(analysisId) {
    try {
      return await this.sendMessage('getDetailedResult', { analysisId });
    } catch (error) {
      console.error('Erro ao obter resultado detalhado:', error);
      throw error;
    }
  }
  
  /**
   * Gera relatório de uma análise
   */
  async generateReport(result, format = 'summary') {
    try {
      return await this.sendMessage('generateReport', { result, format });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }
  
  /**
   * Obtém estatísticas da extensão
   */
  async getStats() {
    try {
      return await this.sendMessage('getStats');
    } catch (error) {
      console.warn('Erro ao obter estatísticas:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Registra evento de uso
   */
  async trackEvent(eventName, eventData = {}) {
    try {
      return await this.sendMessage('trackEvent', {
        event: eventName,
        data: eventData,
        url: window.location.href,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Erro ao registrar evento:', error);
      // Não propagar erro para não afetar funcionalidade principal
    }
  }
  
  /**
   * Obtém histórico de verificações
   */
  async getHistory(limit = 10) {
    try {
      return await this.sendMessage('getHistory', { limit });
    } catch (error) {
      console.warn('Erro ao obter histórico:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Salva verificação no histórico
   */
  async saveToHistory(verificationData) {
    try {
      return await this.sendMessage('saveToHistory', verificationData);
    } catch (error) {
      console.warn('Erro ao salvar no histórico:', error);
      // Não propagar erro para não afetar funcionalidade principal
    }
  }
  
  /**
   * Obtém informações sobre a aba atual
   */
  async getTabInfo() {
    try {
      return await this.sendMessage('getTabInfo');
    } catch (error) {
      console.warn('Erro ao obter informações da aba:', error);
      return {
        success: true,
        data: {
          url: window.location.href,
          title: document.title,
          domain: window.location.hostname
        }
      };
    }
  }
  
  /**
   * Notifica mudança de página
   */
  async notifyPageChange() {
    try {
      return await this.sendMessage('pageChanged', {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Erro ao notificar mudança de página:', error);
    }
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.messageHandlers.clear();
  }
}
