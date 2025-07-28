/**
 * VeritasAI - Content Script Principal
 * Arquivo principal que coordena todos os módulos do content script
 */

console.log('🔄 Iniciando content-main.js');

// Importar módulos (será bundled pelo webpack)
import { TextDetector } from './modules/text-detector.js';
import { UIManager } from './modules/ui-manager.js';
import { CommunicationManager } from './modules/communication-manager.js';
import { EventManager } from './modules/event-manager.js';
import { StyleManager } from './modules/style-manager.js';
import { getIntegrationService } from '../services/integration-service.js';
import { notify, getNotificationSystem } from '../utils/user-notifications.js';
import { ResultTooltip } from './ui-components.js';

console.log('✅ Todas as importações concluídas');

// Configuração global
const VERITAS_CONFIG = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 5000,
  TOOLTIP_DELAY: 100,
  AUTO_HIDE_DELAY: 5000,
  DEBOUNCE_DELAY: 300,
  Z_INDEX_BASE: 10000,
  AUTO_VERIFY: false // Configuração de verificação automática
};

// Estado global da extensão
let extensionState = {
  enabled: true,
  currentTooltip: null,
  currentButton: null,
  lastSelection: null,
  settings: {},
  isProcessing: false
};

// Expor classes globalmente para testes E2E
console.log('🔧 Definindo window.VeritasAI...');
if (typeof window !== 'undefined') {
  window.ResultTooltip = ResultTooltip;
  window.VeritasAI = {
    ResultTooltip,
    extensionState,
    VERITAS_CONFIG
  };
  console.log('✅ window.VeritasAI definido:', window.VeritasAI);
} else {
  console.log('❌ window não está disponível');
}

/**
 * Classe principal do Content Script
 */
class VeritasContentScript {
  constructor() {
    this.textDetector = null;
    this.uiManager = null;
    this.communicationManager = null;
    this.eventManager = null;
    this.styleManager = null;
    this.integrationService = null;
    this.notificationSystem = null;

    this.init();
  }
  
  /**
   * Inicialização do content script
   */
  async init() {
    console.log('🚀 Inicializando VeritasAI Content Script v2.0');

    try {
      // Carregar configurações
      await this.loadSettings();

      if (!extensionState.enabled) {
        console.log('ℹ️ VeritasAI está desabilitado');
        return;
      }

      // Inicializar serviços de integração
      this.integrationService = getIntegrationService();
      this.notificationSystem = getNotificationSystem();

      // Inicializar módulos
      this.initializeModules();

      // Configurar comunicação
      this.setupCommunication();

      // Configurar eventos
      this.setupEvents();

      // Configurar integração end-to-end
      this.setupEndToEndIntegration();

      // Injetar estilos
      this.styleManager.injectStyles();

      console.log('✅ VeritasAI Content Script inicializado com sucesso');

      // Notificar inicialização
      notify.info(
        'VeritasAI ativo',
        'Selecione texto para verificar informações',
        { duration: 3000 }
      );

    } catch (error) {
      console.error('❌ Erro na inicialização do VeritasAI:', error);

      // Notificar erro de inicialização
      notify.error(
        'Erro de inicialização',
        'VeritasAI não pôde ser carregado',
        { duration: 5000 }
      );
    }
  }
  
  /**
   * Inicializa todos os módulos
   */
  initializeModules() {
    // Gerenciador de comunicação
    this.communicationManager = new CommunicationManager();
    
    // Detector de texto
    this.textDetector = new TextDetector(VERITAS_CONFIG);
    
    // Gerenciador de UI
    this.uiManager = new UIManager(VERITAS_CONFIG, extensionState);
    
    // Gerenciador de eventos
    this.eventManager = new EventManager(
      this.textDetector,
      this.uiManager,
      this.communicationManager,
      extensionState
    );
    
    // Gerenciador de estilos
    this.styleManager = new StyleManager();
  }
  
  /**
   * Configura comunicação com background
   */
  setupCommunication() {
    this.communicationManager.onMessage('verifySelectedText', () => {
      if (extensionState.lastSelection) {
        this.verifyText(extensionState.lastSelection);
      }
    });
    
    this.communicationManager.onMessage('verifySelection', () => {
      this.eventManager.handleTextSelection();
    });
    
    this.communicationManager.onMessage('extensionToggled', (data) => {
      extensionState.enabled = data.enabled;
      if (!extensionState.enabled) {
        this.uiManager.hideAllElements();
      }
    });
    
    this.communicationManager.onMessage('settingsUpdated', () => {
      this.loadSettings();
    });
  }
  
  /**
   * Configura eventos principais
   */
  setupEvents() {
    this.eventManager.setupAllListeners();
  }

  /**
   * Configura integração end-to-end entre todos os componentes
   */
  setupEndToEndIntegration() {
    console.log('🔗 Configurando integração end-to-end...');

    // Configurar listeners para eventos de verificação
    document.addEventListener('veritas:text-selected', (event) => {
      this.handleTextSelectionEvent(event.detail);
    });

    document.addEventListener('veritas:verify-request', (event) => {
      this.handleVerifyRequestEvent(event.detail);
    });

    document.addEventListener('veritas:display-tooltip', (event) => {
      this.handleDisplayTooltipEvent(event.detail);
    });

    // Configurar listeners para notificações
    document.addEventListener('veritas:notification-action', (event) => {
      this.handleNotificationActionEvent(event.detail);
    });

    // Configurar listeners para mudanças de estado
    document.addEventListener('veritas:state-change', (event) => {
      this.handleStateChangeEvent(event.detail);
    });

    console.log('✅ Integração end-to-end configurada');
  }
  
  /**
   * Carrega configurações da extensão
   */
  async loadSettings() {
    try {
      const response = await this.communicationManager.sendMessage('getSettings');
      
      if (response && response.success) {
        extensionState.enabled = response.data?.enabled ?? true;
        extensionState.settings = response.data || {};
        
        // Aplicar configurações específicas
        this.applySettings(extensionState.settings);
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }
  
  /**
   * Aplica configurações carregadas
   */
  applySettings(settings) {
    if (settings.minTextLength) {
      VERITAS_CONFIG.MIN_TEXT_LENGTH = settings.minTextLength;
    }
    if (settings.maxTextLength) {
      VERITAS_CONFIG.MAX_TEXT_LENGTH = settings.maxTextLength;
    }
    if (settings.autoHideDelay) {
      VERITAS_CONFIG.AUTO_HIDE_DELAY = settings.autoHideDelay;
    }

    // Aplicar configuração de verificação automática
    if (typeof settings.autoVerify !== 'undefined') {
      VERITAS_CONFIG.AUTO_VERIFY = settings.autoVerify;
    }

    console.log('⚙️ Configurações aplicadas:', {
      autoVerify: VERITAS_CONFIG.AUTO_VERIFY,
      minTextLength: VERITAS_CONFIG.MIN_TEXT_LENGTH,
      maxTextLength: VERITAS_CONFIG.MAX_TEXT_LENGTH
    });
  }
  
  /**
   * Verifica texto selecionado (método integrado end-to-end)
   */
  async verifyText(selectionData, options = {}) {
    if (extensionState.isProcessing) {
      console.log('⏸️ Verificação já em andamento');
      notify.warning(
        'Verificação em andamento',
        'Aguarde a conclusão da análise atual',
        { duration: 3000 }
      );
      return;
    }

    extensionState.isProcessing = true;

    try {
      // Esconder elementos anteriores
      this.uiManager.hideAllElements();

      // Preparar dados para envio
      const requestData = {
        text: selectionData.text,
        context: selectionData.context,
        contentType: selectionData.contentType,
        url: selectionData.url,
        domain: selectionData.domain,
        timestamp: selectionData.timestamp,
        strategy: options.strategy || 'comprehensive'
      };

      // Usar o serviço de integração para coordenar o fluxo
      const result = await this.integrationService.executeVerificationFlow(
        requestData,
        { tab: { id: 'content-script' } }
      );

      // Esconder loading (será gerenciado pelo integration service)
      this.uiManager.hideAllElements();
      extensionState.isProcessing = false;

      if (result.success) {
        // Mostrar resultado via tooltip avançado
        this.uiManager.showResultTooltip(result.data, selectionData);

        // Disparar evento de sucesso
        document.dispatchEvent(new CustomEvent('veritas:verification-success', {
          detail: { result: result.data, selectionData, verificationId: result.verificationId }
        }));
      } else {
        // Mostrar erro via tooltip
        this.uiManager.showErrorTooltip(result.error || 'Erro na verificação', selectionData);

        // Disparar evento de erro
        document.dispatchEvent(new CustomEvent('veritas:verification-error', {
          detail: { error: result.error, selectionData, verificationId: result.verificationId }
        }));
      }

    } catch (error) {
      console.error('Erro na verificação:', error);
      this.uiManager.hideAllElements();
      extensionState.isProcessing = false;
      this.uiManager.showErrorTooltip('Erro de comunicação', selectionData);

      // Disparar evento de erro
      document.dispatchEvent(new CustomEvent('veritas:verification-error', {
        detail: { error: error.message, selectionData }
      }));
    }
  }
  
  /**
   * Obtém instância do detector de texto
   */
  getTextDetector() {
    return this.textDetector;
  }
  
  /**
   * Obtém instância do gerenciador de UI
   */
  getUIManager() {
    return this.uiManager;
  }
  
  /**
   * Obtém instância do gerenciador de comunicação
   */
  getCommunicationManager() {
    return this.communicationManager;
  }

  /**
   * Manipula evento de seleção de texto
   */
  handleTextSelectionEvent(detail) {
    console.log('📝 Texto selecionado:', detail);

    // Atualizar estado
    extensionState.lastSelection = detail;

    // Mostrar botão de verificação
    this.uiManager.showVerifyButton(detail);

    // Notificar seleção
    notify.info(
      'Texto selecionado',
      `${detail.text.length} caracteres prontos para verificação`,
      { duration: 2000 }
    );
  }

  /**
   * Manipula evento de solicitação de verificação
   */
  async handleVerifyRequestEvent(detail) {
    console.log('🔍 Solicitação de verificação:', detail);

    // Executar verificação
    await this.verifyText(detail.selectionData);
  }

  /**
   * Manipula evento de exibição de tooltip
   */
  handleDisplayTooltipEvent(detail) {
    console.log('💬 Exibindo tooltip:', detail);

    // Usar UIManager para mostrar tooltip
    this.uiManager.showResultTooltip(detail.result, detail.selectionData);
  }

  /**
   * Manipula evento de ação de notificação
   */
  handleNotificationActionEvent(detail) {
    console.log('🔔 Ação de notificação:', detail);

    const { action, data } = detail;

    switch (action) {
      case 'retry-verification':
        if (data.selectionData) {
          this.verifyText(data.selectionData);
        }
        break;

      case 'show-details':
        if (data.result) {
          this.uiManager.showResultTooltip(data.result, data.selectionData);
        }
        break;

      case 'cancel-verification':
        if (data.verificationId) {
          this.integrationService.cancelVerification(data.verificationId);
        }
        break;
    }
  }

  /**
   * Manipula evento de mudança de estado
   */
  handleStateChangeEvent(detail) {
    console.log('⚡ Mudança de estado:', detail);

    const { type, data } = detail;

    switch (type) {
      case 'extension-toggled':
        extensionState.enabled = data.enabled;
        if (!data.enabled) {
          this.uiManager.hideAllElements();
          notify.info('VeritasAI desativado', 'Extensão pausada', { duration: 2000 });
        } else {
          notify.info('VeritasAI ativado', 'Extensão reativada', { duration: 2000 });
        }
        break;

      case 'settings-updated':
        this.loadSettings();
        notify.info('Configurações atualizadas', 'Preferências aplicadas', { duration: 2000 });
        break;

      case 'api-status-changed':
        if (data.status === 'connected') {
          notify.success('APIs conectadas', 'Serviços funcionando', { duration: 3000 });
        } else if (data.status === 'error') {
          notify.error('Erro nas APIs', 'Verifique suas configurações', { duration: 5000 });
        }
        break;
    }
  }

  /**
   * Cleanup ao destruir
   */
  destroy() {
    console.log('Destruindo VeritasAI Content Script...');

    // Limpar estado
    extensionState.currentTooltip = null;
    extensionState.currentButton = null;
    extensionState.lastSelection = null;
    extensionState.isProcessing = false;

    // Destruir serviços de integração
    if (this.integrationService) {
      this.integrationService.destroy();
    }

    // Destruir módulos
    if (this.eventManager) {
      this.eventManager.cleanup();
    }

    if (this.uiManager) {
      this.uiManager.cleanup();
    }

    if (this.communicationManager) {
      this.communicationManager.cleanup();
    }

    if (this.styleManager) {
      this.styleManager.cleanup();
    }

    console.log('VeritasAI Content Script destruído');
  }
}

// Instância global
let veritasContentScript = null;

/**
 * Inicialização quando DOM estiver pronto
 */
function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      veritasContentScript = new VeritasContentScript();
    });
  } else {
    veritasContentScript = new VeritasContentScript();
  }
}

// Cleanup quando página for descarregada
window.addEventListener('beforeunload', () => {
  if (veritasContentScript) {
    veritasContentScript.destroy();
  }
});

// Inicializar
initializeWhenReady();

// Exportar para uso global se necessário
window.VeritasContentScript = veritasContentScript;

console.log('📦 VeritasAI Content Script v2.0 carregado');
