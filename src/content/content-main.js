/**
 * VeritasAI - Content Script Principal
 * Arquivo principal que coordena todos os módulos do content script
 */

// Importar módulos (será bundled pelo webpack)
import { TextDetector } from './modules/text-detector.js';
import { UIManager } from './modules/ui-manager.js';
import { CommunicationManager } from './modules/communication-manager.js';
import { EventManager } from './modules/event-manager.js';
import { StyleManager } from './modules/style-manager.js';

// Configuração global
const VERITAS_CONFIG = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 5000,
  TOOLTIP_DELAY: 100,
  AUTO_HIDE_DELAY: 5000,
  DEBOUNCE_DELAY: 300,
  Z_INDEX_BASE: 10000
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
      
      // Inicializar módulos
      this.initializeModules();
      
      // Configurar comunicação
      this.setupCommunication();
      
      // Configurar eventos
      this.setupEvents();
      
      // Injetar estilos
      this.styleManager.injectStyles();
      
      console.log('✅ VeritasAI Content Script inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro na inicialização do VeritasAI:', error);
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
  }
  
  /**
   * Verifica texto selecionado
   */
  async verifyText(selectionData, options = {}) {
    if (extensionState.isProcessing) return;
    
    extensionState.isProcessing = true;
    
    try {
      // Esconder elementos anteriores
      this.uiManager.hideAllElements();
      
      // Mostrar loading
      this.uiManager.showLoadingTooltip(selectionData);
      
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
      
      // Enviar para background script
      const response = await this.communicationManager.sendMessage('verifyText', requestData);
      
      // Esconder loading
      this.uiManager.hideAllElements();
      extensionState.isProcessing = false;
      
      if (response && response.success) {
        this.uiManager.showResultTooltip(response.data, selectionData);
      } else {
        this.uiManager.showErrorTooltip(
          response?.error || 'Erro na verificação', 
          selectionData
        );
      }
      
    } catch (error) {
      console.error('Erro na verificação:', error);
      this.uiManager.hideAllElements();
      extensionState.isProcessing = false;
      this.uiManager.showErrorTooltip('Erro de comunicação', selectionData);
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
   * Cleanup ao destruir
   */
  destroy() {
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
