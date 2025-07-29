/**
 * VeritasAI - Content Script Principal
 * Implementação completa sem ES6 modules para compatibilidade direta
 */

console.log('🚀 VeritasAI Content Script iniciando...');

// Configuração global
const VERITAS_CONFIG = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 5000,
  TOOLTIP_DELAY: 100,
  AUTO_HIDE_DELAY: 5000,
  DEBOUNCE_DELAY: 300,
  Z_INDEX_BASE: 10000,
  AUTO_VERIFY: false
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

// Classe TextDetector
class TextDetector {
  constructor(config) {
    this.config = config;
  }

  extractSelectedText(selection) {
    if (!selection || selection.rangeCount === 0) return '';
    return selection.toString().trim();
  }

  isValidSelection(text, selection) {
    if (!text || !selection || selection.rangeCount === 0) return false;
    if (text.length < this.config.MIN_TEXT_LENGTH) return false;
    if (text.length > this.config.MAX_TEXT_LENGTH) return false;
    return true;
  }

  analyzeSelection(selection, text) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    return {
      text: text,
      originalText: selection.toString(),
      range: range, // Adicionar range para compatibilidade
      rect: rect,
      position: { x: rect.left, y: rect.bottom + 10 },
      context: this.extractContext(range),
      contentType: this.detectContentType(text),
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname
    };
  }

  extractContext(range) {
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    return {
      tagName: element.tagName,
      className: element.className,
      textContent: element.textContent?.substring(0, 200)
    };
  }

  detectContentType(text) {
    if (/\d+%|\d+\s*(por\s*cento|percent)/i.test(text)) return 'statistic';
    if (/segundo|de acordo|conforme|cita/i.test(text)) return 'citation';
    if (/pesquisa|estudo|cientista|universidade/i.test(text)) return 'scientific';
    return 'general';
  }
}

// Classe UIManager
class UIManager {
  constructor(config, state) {
    this.config = config;
    this.state = state;
  }

  showVerifyButton(selectionData) {
    this.hideAllElements();

    const button = this.createVerifyButton(selectionData);
    this.positionElement(button, selectionData.position);

    document.body.appendChild(button);
    this.state.currentButton = button;

    console.log('👆 Botão de verificação mostrado para:', selectionData.text.substring(0, 50) + '...');

    // Teste do event listener após 1 segundo
    setTimeout(() => {
      console.log('🧪 Testando se botão ainda existe:', !!document.getElementById('veritas-verify-button'));
      const testButton = document.getElementById('veritas-verify-button');
      if (testButton) {
        console.log('🧪 Botão encontrado, testando click programático...');
        // Não executar o click, apenas verificar se existe
      }
    }, 1000);
  }

  createVerifyButton(selectionData) {
    const button = document.createElement('div');
    button.id = 'veritas-verify-button';
    button.className = 'veritas-ui-element';
    button.style.cssText = `
      position: absolute;
      z-index: ${this.config.Z_INDEX_BASE};
      background: #007cba;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      user-select: none;
      pointer-events: auto;
    `;

    button.innerHTML = `
      <span>🔍 Verificar</span>
    `;

    console.log('🔧 Criando botão com event listener...');

    // Múltiplos event listeners para garantir que funcione
    button.addEventListener('click', (e) => {
      console.log('👆 Click event disparado!');
      e.preventDefault();
      e.stopPropagation();
      this.onVerifyClick(selectionData);
    });

    button.addEventListener('mousedown', (e) => {
      console.log('👆 Mousedown event disparado!');
      e.preventDefault();
      e.stopPropagation();
    });

    button.addEventListener('mouseup', (e) => {
      console.log('👆 Mouseup event disparado!');
      e.preventDefault();
      e.stopPropagation();
      this.onVerifyClick(selectionData);
    });

    // Adicionar atributo para debug
    button.setAttribute('data-veritas-button', 'true');

    console.log('✅ Botão criado com listeners:', button);
    return button;
  }

  positionElement(element, position) {
    element.style.left = position.x + 'px';
    element.style.top = position.y + 'px';
  }

  hideAllElements() {
    const existingButton = document.getElementById('veritas-verify-button');
    if (existingButton) {
      existingButton.remove();
    }

    const existingTooltip = document.getElementById('veritas-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    this.state.currentButton = null;
    this.state.currentTooltip = null;
  }

  showLoadingIndicator(selectionData, message = 'Analisando com IA...') {
    console.log('🔄 Mostrando loading indicator:', message);

    // Remover elementos existentes
    this.hideAllElements();

    // Criar loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'veritas-loading';
    loadingDiv.className = 'veritas-loading';
    loadingDiv.innerHTML = `
      <div class="veritas-loading-content">
        <div class="veritas-spinner"></div>
        <span class="veritas-loading-text">${message}</span>
      </div>
    `;

    // Posicionar próximo ao texto selecionado
    let rect;

    // Tentar obter rect do range ou usar fallback
    if (selectionData.range) {
      rect = selectionData.range.getBoundingClientRect();
    } else if (selectionData.rect) {
      rect = selectionData.rect;
    } else {
      console.warn('⚠️ Nem range nem rect disponíveis, usando posição padrão');
      rect = { left: 100, bottom: 100 };
    }

    loadingDiv.style.position = 'fixed';
    loadingDiv.style.left = `${rect.left + window.scrollX}px`;
    loadingDiv.style.top = `${rect.bottom + window.scrollY + 5}px`;
    loadingDiv.style.zIndex = '10000';

    document.body.appendChild(loadingDiv);
    this.state.currentLoading = loadingDiv;

    console.log('✅ Loading indicator mostrado');
  }

  hideLoadingIndicator() {
    console.log('🔄 Escondendo loading indicator...');

    const existingLoading = document.getElementById('veritas-loading');
    if (existingLoading) {
      existingLoading.remove();
    }

    this.state.currentLoading = null;
    console.log('✅ Loading indicator escondido');
  }

  onVerifyClick(selectionData) {
    console.log('🔍 Clique em verificar:', selectionData.text.substring(0, 50) + '...');
    console.log('🔍 veritasContentScript existe:', !!window.veritasContentScript);
    if (window.veritasContentScript) {
      console.log('🔍 Chamando verifyText...');
      window.veritasContentScript.verifyText(selectionData);
    } else {
      console.error('❌ veritasContentScript não encontrado!');
    }
  }
}

// Classe CommunicationManager
class CommunicationManager {
  trackEvent(eventName, data) {
    console.log(`📊 Evento rastreado: ${eventName}`, data);
  }

  async sendMessage(action, data = {}) {
    try {
      return await chrome.runtime.sendMessage({ action, ...data });
    } catch (error) {
      console.error('Erro na comunicação:', error);
      return { success: false, error: error.message };
    }
  }
}

// Classe EventManager
class EventManager {
  constructor(textDetector, uiManager, communicationManager, state) {
    this.textDetector = textDetector;
    this.uiManager = uiManager;
    this.communicationManager = communicationManager;
    this.state = state;
    this.debounceTimer = null;
  }

  setupAllListeners() {
    this.setupSelectionListeners();
    this.setupInteractionListeners();
    console.log('📡 Event listeners configurados');
  }

  setupSelectionListeners() {
    // Usar apenas selectionchange com debounce para evitar múltiplas chamadas
    document.addEventListener('selectionchange', this.debounceSelectionChange.bind(this));
    console.log('📡 Listener de seleção configurado (apenas selectionchange)');
  }

  setupInteractionListeners() {
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  debounceSelectionChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      console.log('🔄 Debounce executado - processando seleção...');
      await this.handleTextSelection();
    }, 300);
  }

  async handleTextSelection(event) {
    if (!this.state.enabled || this.state.isProcessing) return;

    try {
      const selection = window.getSelection();
      const selectedText = this.textDetector.extractSelectedText(selection);

      if (this.textDetector.isValidSelection(selectedText, selection)) {
        const selectionData = this.textDetector.analyzeSelection(selection, selectedText);

        // Verificar se é a mesma seleção para evitar processamento duplicado
        if (this.state.lastSelection &&
            this.state.lastSelection.text === selectionData.text &&
            this.state.lastSelection.timestamp &&
            (Date.now() - this.state.lastSelection.timestamp) < 1000) {
          console.log('🔄 Seleção duplicada ignorada');
          return;
        }

        this.state.lastSelection = selectionData;

        // Verificar se verificação automática está habilitada
        // Usar configuração do usuário se disponível, senão usar padrão
        let autoVerifyEnabled = false;

        console.log('🔍 Estado atual do extensionState:', {
          'extensionState existe': !!extensionState,
          'extensionState.settings existe': !!extensionState.settings,
          'extensionState.settings': extensionState.settings
        });

        if (extensionState.settings && typeof extensionState.settings.autoVerify === 'boolean') {
          // Usar configuração explícita do usuário
          autoVerifyEnabled = extensionState.settings.autoVerify;
          console.log('✅ Usando configuração do usuário:', autoVerifyEnabled);
        } else {
          // Fallback para configuração padrão
          autoVerifyEnabled = VERITAS_CONFIG.AUTO_VERIFY;
          console.log('⚠️ Usando configuração padrão:', autoVerifyEnabled);
        }

        console.log('🔍 Texto selecionado:', {
          text: selectedText.substring(0, 50) + '...',
          length: selectedText.length,
          autoVerify: autoVerifyEnabled
        });

        console.log('🔧 Debug autoVerify:', {
          'extensionState.settings?.autoVerify': extensionState.settings?.autoVerify,
          'typeof autoVerify': typeof extensionState.settings?.autoVerify,
          'VERITAS_CONFIG.AUTO_VERIFY': VERITAS_CONFIG.AUTO_VERIFY,
          'autoVerifyEnabled (final)': autoVerifyEnabled,
          'extensionState.settings completo': extensionState.settings
        });

        if (autoVerifyEnabled) {
          // Verificação automática habilitada - executar imediatamente
          console.log('⚡ Executando verificação automática...');
          await this.verifyText(selectionData);
        } else {
          // Verificação manual - mostrar botão
          console.log('👆 Mostrando botão de verificação manual...');
          this.uiManager.showVerifyButton(selectionData);
        }

        // Track selection event
        this.communicationManager.trackEvent('text_selected', {
          textLength: selectedText.length,
          contentType: selectionData.contentType,
          autoVerify: autoVerifyEnabled
        });
      } else {
        this.uiManager.hideAllElements();
      }
    } catch (error) {
      console.error('Erro na detecção de seleção:', error);
    }
  }

  handleDocumentClick(event) {
    // Esconder elementos se clicar fora
    if (!event.target.closest('#veritas-verify-button') && !event.target.closest('#veritas-tooltip')) {
      this.uiManager.hideAllElements();
    }
  }

  async verifyText(selectionData) {
    if (window.veritasContentScript) {
      return await window.veritasContentScript.verifyText(selectionData);
    }
  }
}

// Classe principal do Content Script
class VeritasContentScript {
  constructor() {
    this.textDetector = null;
    this.uiManager = null;
    this.communicationManager = null;
    this.eventManager = null;
    this.init();
  }

  async init() {
    console.log('🚀 Inicializando VeritasAI Content Script');

    try {
      // Inicializar módulos primeiro
      this.initializeModules();

      // Carregar configurações
      await this.loadSettings();

      if (!extensionState.enabled) {
        console.log('ℹ️ VeritasAI está desabilitado');
        return;
      }

      // Configurar comunicação
      this.setupCommunication();

      // Configurar eventos
      this.setupEvents();

      console.log('✅ VeritasAI Content Script inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro na inicialização do VeritasAI:', error);
    }
  }

  initializeModules() {
    this.communicationManager = new CommunicationManager();
    this.textDetector = new TextDetector(VERITAS_CONFIG);
    this.uiManager = new UIManager(VERITAS_CONFIG, extensionState);
    this.eventManager = new EventManager(
      this.textDetector,
      this.uiManager,
      this.communicationManager,
      extensionState
    );
  }

  setupCommunication() {
    // Configurar listeners de mensagens do background
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === 'verifySelectedText') {
        if (extensionState.lastSelection) {
          this.verifyText(extensionState.lastSelection);
        }
      } else if (request.action === 'settingsUpdated') {
        // Recarregar configurações quando atualizadas
        console.log('🔄 Configurações atualizadas, recarregando...');
        await this.loadSettings();
      }
      return true;
    });
  }

  setupEvents() {
    this.eventManager.setupAllListeners();
  }

  async loadSettings() {
    try {
      console.log('🔄 Iniciando carregamento de configurações...');

      // Verificar se communicationManager existe
      if (!this.communicationManager) {
        console.warn('CommunicationManager não inicializado, usando configurações padrão');
        return;
      }

      const response = await this.communicationManager.sendMessage('getSettings');

      console.log('📥 Resposta do background para getSettings:', response);

      if (response && response.success) {
        extensionState.enabled = response.data?.enabled ?? true;
        extensionState.settings = response.data || {};

        console.log('⚙️ Settings carregadas:', extensionState.settings);
        console.log('🔧 autoVerify na configuração:', extensionState.settings.autoVerify);
        console.log('🔧 Tipo de autoVerify:', typeof extensionState.settings.autoVerify);

        // Aplicar configurações específicas
        this.applySettings(extensionState.settings);

        console.log('✅ Configurações carregadas e aplicadas com sucesso');
      } else {
        console.warn('❌ Falha ao carregar configurações:', response);
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }

  // Função para recarregar configurações manualmente (para debug)
  async reloadSettings() {
    console.log('🔄 Recarregamento manual de configurações solicitado');
    await this.loadSettings();
  }

  applySettings(settings) {
    console.log('🔧 applySettings chamada com:', settings);

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
      console.log('✅ Aplicando autoVerify:', settings.autoVerify);
      VERITAS_CONFIG.AUTO_VERIFY = settings.autoVerify;
    } else {
      console.log('⚠️ autoVerify não definido nas configurações');
    }

    console.log('⚙️ Configurações aplicadas:', {
      autoVerify: VERITAS_CONFIG.AUTO_VERIFY,
      minTextLength: VERITAS_CONFIG.MIN_TEXT_LENGTH,
      maxTextLength: VERITAS_CONFIG.MAX_TEXT_LENGTH
    });
  }

  async verifyText(selectionData, options = {}) {
    console.log('🚀 verifyText chamado com:', selectionData.text.substring(0, 50) + '...');

    if (extensionState.isProcessing) {
      console.log('⏸️ Verificação já em andamento');
      return;
    }

    extensionState.isProcessing = true;
    console.log('🔄 Iniciando processo de verificação...');

    try {
      // Esconder elementos anteriores
      this.uiManager.hideAllElements();
      console.log('🙈 Elementos UI escondidos');

      // Mostrar loading indicator
      console.log('🔄 Mostrando loading indicator...');
      this.uiManager.showLoadingIndicator(selectionData, 'Analisando com IA...');

      console.log('🔍 Iniciando verificação de texto:', selectionData.text.substring(0, 50) + '...');

      // Enviar para background script para verificação real
      console.log('📡 Enviando para background script...');
      const response = await this.communicationManager.sendMessage('verifyText', {
        text: selectionData.text,
        options: {
          strategy: 'hybrid',
          maxResults: 5,
          languageCode: 'pt-BR',
          confidenceThreshold: 0.6
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Falha na verificação');
      }

      console.log('📊 Resultado recebido do background:', response.data.classification);

      // Mostrar resultado real
      this.showResult(selectionData, {
        classification: response.data.classification,
        confidence: response.data.confidence,
        sources: response.data.sources || ['VeritasAI'],
        summary: response.data.summary || 'Verificação concluída.'
      });

      console.log('✅ Verificação concluída');

    } catch (error) {
      console.error('❌ Erro na verificação:', error);
    } finally {
      // Esconder loading indicator
      this.uiManager.hideLoadingIndicator();
      extensionState.isProcessing = false;
      console.log('🔓 Processo de verificação finalizado');
    }
  }

  showResult(selectionData, result) {
    console.log('🎯 showResult chamado:', result);
    console.log('📍 Posição:', selectionData.position);

    // Criar tooltip de resultado
    const tooltip = document.createElement('div');
    tooltip.id = 'veritas-tooltip';
    console.log('📝 Tooltip criado:', tooltip);
    tooltip.style.cssText = `
      position: absolute;
      z-index: ${VERITAS_CONFIG.Z_INDEX_BASE + 1};
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    const classificationColor = {
      'confiável': '#28a745',
      'inconclusiva': '#ffc107',
      'sem fundamento': '#dc3545',
      'fake': '#dc3545'
    }[result.classification] || '#6c757d';

    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <div style="width: 12px; height: 12px; background: ${classificationColor}; border-radius: 50%; margin-right: 8px;"></div>
        <strong style="text-transform: capitalize;">${result.classification}</strong>
        <span style="margin-left: auto; font-size: 12px; color: #666;">${Math.round(result.confidence * 100)}%</span>
      </div>
      <div style="color: #333; margin-bottom: 8px;">${result.summary}</div>
      <div style="font-size: 12px; color: #666;">
        Fontes: ${result.sources.join(', ')}
      </div>
    `;

    // Posicionar tooltip
    tooltip.style.left = selectionData.position.x + 'px';
    tooltip.style.top = selectionData.position.y + 'px';
    console.log('📍 Tooltip posicionado em:', selectionData.position.x, selectionData.position.y);

    document.body.appendChild(tooltip);
    extensionState.currentTooltip = tooltip;
    console.log('✅ Tooltip adicionado ao DOM');

    // Auto-hide após delay
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
        console.log('🗑️ Tooltip removido automaticamente');
      }
      extensionState.currentTooltip = null;
    }, VERITAS_CONFIG.AUTO_HIDE_DELAY);

    console.log('📊 Resultado mostrado:', result.classification);
  }
}

// Inicialização
let veritasContentScript = null;

function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      veritasContentScript = new VeritasContentScript();
      window.veritasContentScript = veritasContentScript;
    });
  } else {
    veritasContentScript = new VeritasContentScript();
    window.veritasContentScript = veritasContentScript;
  }
}

// Cleanup quando página for descarregada
window.addEventListener('beforeunload', () => {
  if (veritasContentScript) {
    console.log('🧹 Limpando VeritasAI');
  }
});

// Definir window.VeritasAI globalmente
window.VeritasAI = {
  loaded: true,
  version: '1.0.21',
  VERITAS_CONFIG: VERITAS_CONFIG,
  extensionState: extensionState,
  ResultTooltip: null
};

// Inicializar
initializeWhenReady();

// Atualizar referências após inicialização
setTimeout(() => {
  window.VeritasAI.VERITAS_CONFIG = VERITAS_CONFIG;
  window.VeritasAI.extensionState = extensionState;
  window.veritasContentScript = veritasContentScript;

  // Adicionar função de debug global para recarregar configurações
  window.veritasReloadSettings = async () => {
    if (window.veritasContentScript) {
      console.log('🔄 Recarregando configurações via comando global...');
      await window.veritasContentScript.reloadSettings();
    } else {
      console.warn('❌ VeritasAI não inicializado');
    }
  };

  console.log('🌐 window.VeritasAI atualizado:', window.VeritasAI);
}, 100);

console.log('📦 VeritasAI Content Script v2.0 carregado');
