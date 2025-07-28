/**
 * VeritasAI - Integration Service
 * Coordena o fluxo end-to-end entre todos os componentes
 */

import { notify } from '../utils/user-notifications.js';

export class IntegrationService {
  constructor() {
    this.isInitialized = false;
    this.activeVerifications = new Map();
    this.stats = {
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
    
    this.init();
  }
  
  /**
   * Inicialização do serviço de integração
   */
  async init() {
    try {
      console.log('🔗 Inicializando Integration Service...');
      
      // Configurar listeners de mensagens
      this.setupMessageListeners();
      
      // Configurar listeners de eventos
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Integration Service inicializado');
      
    } catch (error) {
      console.error('❌ Erro na inicialização do Integration Service:', error);
    }
  }
  
  /**
   * Configura listeners de mensagens entre componentes
   */
  setupMessageListeners() {
    // Listener para mensagens do content script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
        return true; // Manter canal aberto para resposta assíncrona
      });
    }
    
    // Listener para mudanças de storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        this.handleStorageChange(changes, namespace);
      });
    }
  }
  
  /**
   * Configura listeners de eventos globais
   */
  setupEventListeners() {
    // Listener para eventos customizados
    document.addEventListener('veritas:verify-text', (event) => {
      this.handleVerifyTextEvent(event.detail);
    });
    
    document.addEventListener('veritas:show-result', (event) => {
      this.handleShowResultEvent(event.detail);
    });
    
    document.addEventListener('veritas:error', (event) => {
      this.handleErrorEvent(event.detail);
    });
  }
  
  /**
   * Manipula mensagens entre componentes
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      const { action, data } = request;
      
      switch (action) {
        case 'verifyText':
          const result = await this.executeVerificationFlow(data, sender);
          sendResponse(result);
          break;
          
        case 'getVerificationStatus':
          const status = this.getVerificationStatus(data.verificationId);
          sendResponse({ success: true, data: status });
          break;
          
        case 'cancelVerification':
          const cancelled = this.cancelVerification(data.verificationId);
          sendResponse({ success: true, data: { cancelled } });
          break;
          
        case 'getStats':
          sendResponse({ success: true, data: this.getStats() });
          break;
          
        default:
          sendResponse({ success: false, error: 'Ação não reconhecida' });
      }
      
    } catch (error) {
      console.error('Erro no handleMessage:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  /**
   * Executa o fluxo completo de verificação
   */
  async executeVerificationFlow(data, sender) {
    const verificationId = this.generateVerificationId();
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Iniciando verificação ${verificationId}:`, data);
      
      // Registrar verificação ativa
      this.activeVerifications.set(verificationId, {
        id: verificationId,
        text: data.text,
        contentType: data.contentType || 'general',
        startTime,
        status: 'processing',
        sender
      });
      
      // Fase 1: Validação de entrada
      const validationResult = this.validateInput(data);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }
      
      // Fase 2: Notificar início da verificação
      this.notifyVerificationStart(data, verificationId);
      
      // Fase 3: Executar verificação via background service
      const verificationResult = await this.performVerification(data, verificationId);
      
      // Fase 4: Processar resultado
      const processedResult = this.processVerificationResult(verificationResult, data);
      
      // Fase 5: Notificar sucesso
      this.notifyVerificationSuccess(processedResult, verificationId);
      
      // Atualizar estatísticas
      this.updateStats(true, Date.now() - startTime, verificationResult.source === 'cache');
      
      // Remover da lista de verificações ativas
      this.activeVerifications.delete(verificationId);
      
      return {
        success: true,
        data: processedResult,
        verificationId,
        responseTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`❌ Erro na verificação ${verificationId}:`, error);
      
      // Notificar erro
      this.notifyVerificationError(error, verificationId);
      
      // Atualizar estatísticas
      this.updateStats(false, Date.now() - startTime, false);
      
      // Remover da lista de verificações ativas
      this.activeVerifications.delete(verificationId);
      
      return {
        success: false,
        error: error.message,
        verificationId,
        responseTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Valida entrada do usuário
   */
  validateInput(data) {
    const { text, contentType } = data;
    
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Texto é obrigatório' };
    }
    
    if (text.trim().length < 10) {
      return { valid: false, error: 'Texto muito curto para verificação (mínimo 10 caracteres)' };
    }
    
    if (text.length > 5000) {
      return { valid: false, error: 'Texto muito longo para verificação (máximo 5000 caracteres)' };
    }
    
    const validContentTypes = ['general', 'news', 'claim', 'social', 'academic'];
    if (contentType && !validContentTypes.includes(contentType)) {
      return { valid: false, error: 'Tipo de conteúdo inválido' };
    }
    
    return { valid: true };
  }
  
  /**
   * Executa verificação via background service
   */
  async performVerification(data, verificationId) {
    // Enviar para background service
    const response = await chrome.runtime.sendMessage({
      action: 'verifyText',
      text: data.text,
      contentType: data.contentType || 'general',
      options: {
        includeEvidences: true,
        includeSources: true,
        verificationId
      }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Falha na verificação');
    }
    
    return response.data;
  }
  
  /**
   * Processa resultado da verificação
   */
  processVerificationResult(result, originalData) {
    return {
      ...result,
      metadata: {
        originalText: originalData.text,
        contentType: originalData.contentType || 'general',
        timestamp: Date.now(),
        url: originalData.url || window.location.href,
        domain: originalData.domain || window.location.hostname
      }
    };
  }
  
  /**
   * Notifica início da verificação
   */
  notifyVerificationStart(data, verificationId) {
    const textPreview = data.text.length > 50 
      ? data.text.substring(0, 50) + '...' 
      : data.text;
    
    notify.info(
      'Verificação iniciada',
      `Analisando: "${textPreview}"`,
      { 
        persistent: true,
        data: { verificationId }
      }
    );
  }
  
  /**
   * Notifica sucesso da verificação
   */
  notifyVerificationSuccess(result, verificationId) {
    const classification = result.classification || 'uncertain';
    const confidence = Math.round((result.confidence || 0.5) * 100);
    
    notify.success(
      'Verificação concluída',
      `Classificação: ${classification} (${confidence}% confiança)`,
      { 
        duration: 5000,
        data: { verificationId, result }
      }
    );
  }
  
  /**
   * Notifica erro na verificação
   */
  notifyVerificationError(error, verificationId) {
    let errorMessage = 'Erro desconhecido';
    let errorTitle = 'Falha na verificação';
    
    if (error.message.includes('muito curto')) {
      errorTitle = 'Texto muito curto';
      errorMessage = 'Selecione pelo menos 10 caracteres';
    } else if (error.message.includes('muito longo')) {
      errorTitle = 'Texto muito longo';
      errorMessage = 'Máximo de 5000 caracteres permitido';
    } else if (error.message.includes('conexão') || error.message.includes('network')) {
      errorTitle = 'Erro de conexão';
      errorMessage = 'Verifique sua conexão com a internet';
    } else if (error.message.includes('API')) {
      errorTitle = 'Erro da API';
      errorMessage = 'Serviço temporariamente indisponível';
    } else {
      errorMessage = error.message;
    }
    
    notify.error(
      errorTitle,
      errorMessage,
      { 
        duration: 8000,
        data: { verificationId, error: error.message }
      }
    );
  }
  
  /**
   * Manipula eventos customizados
   */
  handleVerifyTextEvent(detail) {
    this.executeVerificationFlow(detail);
  }
  
  handleShowResultEvent(detail) {
    // Disparar evento para mostrar tooltip
    document.dispatchEvent(new CustomEvent('veritas:display-tooltip', {
      detail: detail
    }));
  }
  
  handleErrorEvent(detail) {
    this.notifyVerificationError(new Error(detail.message), detail.verificationId);
  }
  
  /**
   * Manipula mudanças no storage
   */
  handleStorageChange(changes, namespace) {
    if (namespace === 'sync' && changes.settings) {
      console.log('⚙️ Configurações atualizadas:', changes.settings.newValue);
      
      // Notificar mudança de configurações
      notify.info(
        'Configurações atualizadas',
        'Suas preferências foram aplicadas',
        { duration: 3000 }
      );
    }
  }
  
  /**
   * Gera ID único para verificação
   */
  generateVerificationId() {
    return `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Obtém status de uma verificação
   */
  getVerificationStatus(verificationId) {
    const verification = this.activeVerifications.get(verificationId);
    
    if (!verification) {
      return { status: 'not_found' };
    }
    
    return {
      status: verification.status,
      startTime: verification.startTime,
      duration: Date.now() - verification.startTime
    };
  }
  
  /**
   * Cancela uma verificação
   */
  cancelVerification(verificationId) {
    const verification = this.activeVerifications.get(verificationId);
    
    if (verification) {
      verification.status = 'cancelled';
      this.activeVerifications.delete(verificationId);
      
      notify.warning(
        'Verificação cancelada',
        'A análise foi interrompida',
        { duration: 3000 }
      );
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Atualiza estatísticas
   */
  updateStats(success, responseTime, cacheHit) {
    this.stats.totalVerifications++;
    
    if (success) {
      this.stats.successfulVerifications++;
    } else {
      this.stats.failedVerifications++;
    }
    
    if (cacheHit) {
      this.stats.cacheHits++;
    }
    
    // Calcular tempo médio de resposta
    const totalTime = this.stats.averageResponseTime * (this.stats.totalVerifications - 1) + responseTime;
    this.stats.averageResponseTime = Math.round(totalTime / this.stats.totalVerifications);
  }
  
  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      activeVerifications: this.activeVerifications.size,
      successRate: this.stats.totalVerifications > 0 
        ? Math.round((this.stats.successfulVerifications / this.stats.totalVerifications) * 100)
        : 0,
      cacheHitRate: this.stats.totalVerifications > 0
        ? Math.round((this.stats.cacheHits / this.stats.totalVerifications) * 100)
        : 0
    };
  }
  
  /**
   * Cleanup
   */
  destroy() {
    // Cancelar todas as verificações ativas
    for (const verificationId of this.activeVerifications.keys()) {
      this.cancelVerification(verificationId);
    }
    
    this.isInitialized = false;
    console.log('🧹 Integration Service destruído');
  }
}

// Instância global
let integrationService = null;

/**
 * Obtém instância global do serviço de integração
 */
export function getIntegrationService() {
  if (!integrationService) {
    integrationService = new IntegrationService();
  }
  return integrationService;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.VeritasIntegration = {
    IntegrationService,
    getIntegrationService
  };
}
