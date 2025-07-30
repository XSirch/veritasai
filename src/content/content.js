/**
 * VeritasAI - Content Script Principal
 * Implementação completa sem ES6 modules para compatibilidade direta
 */

console.log('🚀 VeritasAI Content Script iniciando...');

// Função para carregar CSS
function loadCSS() {
  // Verificar se o CSS já foi carregado
  if (document.getElementById('veritas-tooltip-css')) {
    return;
  }

  const cssLink = document.createElement('link');
  cssLink.id = 'veritas-tooltip-css';
  cssLink.rel = 'stylesheet';
  cssLink.type = 'text/css';
  cssLink.href = chrome.runtime.getURL('assets/styles/tooltip.css');
  document.head.appendChild(cssLink);

  const contentCssLink = document.createElement('link');
  contentCssLink.id = 'veritas-content-css';
  contentCssLink.rel = 'stylesheet';
  contentCssLink.type = 'text/css';
  contentCssLink.href = chrome.runtime.getURL('assets/styles/content.css');
  document.head.appendChild(contentCssLink);

  console.log('📄 CSS carregado:', cssLink.href, contentCssLink.href);
}

// Configuração global
const VERITAS_CONFIG = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 5000,
  TOOLTIP_DELAY: 100,
  AUTO_HIDE_DELAY: 12000, // 12 segundos para dar tempo de ler
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

    // Store both range and rect for smart positioning
    return {
      text: text,
      originalText: selection.toString(),
      range: range, // Current range for positioning
      rect: rect, // Current rect for positioning
      position: { x: rect.left, y: rect.bottom + 10 }, // Legacy position (will be overridden by smart positioning)
      context: this.extractContext(range),
      contentType: this.detectContentType(text),
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname,
      // Additional data for smart positioning
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }
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

    // Calculate smart position for button (small element)
    const buttonPosition = this.calculateSmartPosition(selectionData, 120, 40, {
      preferredPosition: 'below',
      offset: 8,
      margin: 10
    });

    this.positionElement(button, buttonPosition);

    document.body.appendChild(button);
    this.state.currentButton = button;

    console.log('👆 Botão de verificação mostrado para:', selectionData.text.substring(0, 50) + '...');
    console.log('📍 Posição do botão:', buttonPosition);

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

  /**
   * Smart positioning utility that handles viewport boundaries
   * @param {HTMLElement} element - Element to position
   * @param {Object} selectionData - Selection data with rect/range info
   * @param {Object} options - Positioning options
   */
  calculateSmartPosition(selectionData, elementWidth = 300, elementHeight = 200, options = {}) {
    const {
      preferredPosition = 'below', // 'below', 'above', 'right', 'left'
      offset = 10,
      margin = 20 // Minimum margin from viewport edges
    } = options;

    // Get selection rectangle
    let rect;
    if (selectionData.range) {
      rect = selectionData.range.getBoundingClientRect();
    } else if (selectionData.rect) {
      rect = selectionData.rect;
    } else {
      console.warn('⚠️ No rect available, using fallback position');
      return { x: 100, y: 100, position: 'fallback' };
    }

    // Get viewport dimensions
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    // Calculate absolute position of selection
    const selectionAbsolute = {
      left: rect.left + viewport.scrollX,
      right: rect.right + viewport.scrollX,
      top: rect.top + viewport.scrollY,
      bottom: rect.bottom + viewport.scrollY,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + viewport.scrollX + (rect.width / 2),
      centerY: rect.top + viewport.scrollY + (rect.height / 2)
    };

    // Try different positions in order of preference
    const positions = this.getPositionPriority(preferredPosition);

    for (const pos of positions) {
      const calculated = this.calculatePosition(pos, selectionAbsolute, elementWidth, elementHeight, offset);

      // Check if position fits in viewport
      if (this.isPositionValid(calculated, elementWidth, elementHeight, viewport, margin)) {
        console.log(`✅ Posição escolhida: ${pos}`, calculated);
        return { ...calculated, position: pos };
      }
    }

    // Fallback: center on selection with adjustments to fit viewport
    const fallback = this.calculateFallbackPosition(selectionAbsolute, elementWidth, elementHeight, viewport, margin);
    console.log('⚠️ Usando posição fallback:', fallback);
    return { ...fallback, position: 'fallback' };
  }

  getPositionPriority(preferred) {
    const all = ['below', 'above', 'right', 'left'];
    const priority = [preferred];

    // Add remaining positions
    all.forEach(pos => {
      if (pos !== preferred) priority.push(pos);
    });

    return priority;
  }

  calculatePosition(position, selection, width, height, offset) {
    switch (position) {
      case 'below':
        return {
          x: selection.centerX - (width / 2),
          y: selection.bottom + offset
        };
      case 'above':
        return {
          x: selection.centerX - (width / 2),
          y: selection.top - height - offset
        };
      case 'right':
        return {
          x: selection.right + offset,
          y: selection.centerY - (height / 2)
        };
      case 'left':
        return {
          x: selection.left - width - offset,
          y: selection.centerY - (height / 2)
        };
      default:
        return {
          x: selection.centerX - (width / 2),
          y: selection.bottom + offset
        };
    }
  }

  isPositionValid(pos, width, height, viewport, margin) {
    const elementBounds = {
      left: pos.x,
      right: pos.x + width,
      top: pos.y,
      bottom: pos.y + height
    };

    // Check if element fits within viewport with margin
    return (
      elementBounds.left >= viewport.scrollX + margin &&
      elementBounds.right <= viewport.scrollX + viewport.width - margin &&
      elementBounds.top >= viewport.scrollY + margin &&
      elementBounds.bottom <= viewport.scrollY + viewport.height - margin
    );
  }

  calculateFallbackPosition(selection, width, height, viewport, margin) {
    let x = selection.centerX - (width / 2);
    let y = selection.bottom + 10;

    // Adjust X to fit viewport
    if (x < viewport.scrollX + margin) {
      x = viewport.scrollX + margin;
    } else if (x + width > viewport.scrollX + viewport.width - margin) {
      x = viewport.scrollX + viewport.width - width - margin;
    }

    // Adjust Y to fit viewport
    if (y + height > viewport.scrollY + viewport.height - margin) {
      // Try above selection
      y = selection.top - height - 10;
      if (y < viewport.scrollY + margin) {
        // If still doesn't fit, position at top of viewport
        y = viewport.scrollY + margin;
      }
    }

    return { x, y };
  }

  positionElement(element, position) {
    element.style.position = 'absolute';
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

    // Calculate smart position for loading indicator
    const loadingPosition = this.calculateSmartPosition(selectionData, 200, 60, {
      preferredPosition: 'below',
      offset: 5,
      margin: 15
    });

    loadingDiv.style.position = 'absolute';
    loadingDiv.style.left = `${loadingPosition.x}px`;
    loadingDiv.style.top = `${loadingPosition.y}px`;
    loadingDiv.style.zIndex = '10000';

    console.log('📍 Posição do loading:', loadingPosition);

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
      // Verificar se o contexto da extensão ainda é válido
      if (!chrome.runtime?.id) {
        console.error('❌ Contexto da extensão invalidado - recarregue a página');
        return {
          success: false,
          error: 'Extension context invalidated. Please reload the page.',
          needsReload: true
        };
      }

      return await chrome.runtime.sendMessage({ action, ...data });
    } catch (error) {
      console.error('Erro na comunicação:', error);

      // Tratamento específico para contexto invalidado
      if (error.message.includes('Extension context invalidated') ||
          error.message.includes('message port closed') ||
          error.message.includes('receiving end does not exist')) {
        console.error('🔄 Extensão foi recarregada - recarregue a página');
        return {
          success: false,
          error: 'Extension was reloaded. Please refresh the page to continue.',
          needsReload: true
        };
      }

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
      // Carregar CSS primeiro
      loadCSS();

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
    console.log('🔍 Debug resultado completo:', {
      classification: result.classification,
      confidence: result.confidence,
      summary: result.summary,
      sources: result.sources,
      details: result.details
    });

    // Criar container da tooltip com classes CSS adequadas
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'veritas-tooltip';
    tooltipContainer.className = 'veritas-tooltip-container veritas-ui-element';

    // Calculate smart position for tooltip (larger element)
    const tooltipPosition = this.uiManager.calculateSmartPosition(selectionData, 320, 400, {
      preferredPosition: 'below',
      offset: 15,
      margin: 20
    });

    // Posicionar tooltip
    tooltipContainer.style.position = 'absolute';
    tooltipContainer.style.left = tooltipPosition.x + 'px';
    tooltipContainer.style.top = tooltipPosition.y + 'px';
    tooltipContainer.style.maxWidth = '320px';
    tooltipContainer.style.maxHeight = '400px';
    tooltipContainer.style.overflow = 'auto';

    // Add positioning class for styling
    tooltipContainer.classList.add(`veritas-positioned-${tooltipPosition.position}`);

    console.log('📍 Posição da tooltip:', tooltipPosition);

    // Mapear classificações para classes CSS
    const classificationMap = {
      'confiável': 'verified',
      'provável': 'likely_true',
      'inconclusiva': 'uncertain',
      'duvidosa': 'likely_false',
      'sem fundamento': 'disputed',
      'fake': 'disputed',
      'erro': 'no_data'
    };

    const classificationClass = classificationMap[result.classification] || 'no_data';

    // Mapear ícones para classificações
    const classificationIcons = {
      'verified': '✅',
      'likely_true': '✔️',
      'uncertain': '❓',
      'likely_false': '⚠️',
      'disputed': '❌',
      'no_data': '🔍'
    };

    const icon = classificationIcons[classificationClass] || '🔍';
    const confidence = Math.round((result.confidence || 0) * 100);

    tooltipContainer.innerHTML = `
      <div class="veritas-tooltip veritas-classification-${classificationClass}">
        <div class="veritas-tooltip-header">
          <div class="veritas-header-content">
            <span class="veritas-logo">🛡️</span>
            <h3 class="veritas-title">VeritasAI</h3>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="veritas-close-btn" onclick="this.closest('.veritas-tooltip-container').setAttribute('data-keep-open', 'true')" aria-label="Manter aberto" title="Manter aberto">📌</button>
            <button class="veritas-close-btn" onclick="this.closest('.veritas-tooltip-container').remove()" aria-label="Fechar">×</button>
          </div>
        </div>

        <div class="veritas-tooltip-content">
          <div class="veritas-result-main">
            <div class="veritas-classification-badge" style="--classification-color: var(--veritas-${classificationClass.replace('_', '-')})">
              <span class="veritas-classification-icon">${icon}</span>
              <span class="veritas-classification-text">${result.classification}</span>
            </div>

            <div class="veritas-confidence-section">
              <div class="veritas-confidence-bar">
                <div class="veritas-confidence-fill" style="width: ${confidence}%; background: var(--veritas-${classificationClass.replace('_', '-')})"></div>
              </div>
              <div class="veritas-confidence-text">Score de Veracidade: ${confidence}%</div>
              ${result.details?.originalScore ? `<div style="font-size: 11px; color: var(--veritas-text-secondary); text-align: center; margin-top: 2px;">Score original: ${Math.round(result.details.originalScore * 100)}%</div>` : ''}
            </div>
          </div>

          <div class="veritas-evidence-section">
            <h4 class="veritas-section-title">Análise</h4>
            <div style="font-size: 14px; line-height: 1.4; color: var(--veritas-text-primary);">
              ${result.summary || 'Verificação concluída.'}
            </div>
          </div>

          <div class="veritas-metadata-section">
            <h4 class="veritas-section-title">Fontes</h4>
            <div class="veritas-evidence-list">
              ${(result.sources || ['VeritasAI']).map(source => `
                <div class="veritas-evidence-item">
                  <div class="veritas-evidence-source">
                    <span class="veritas-evidence-icon">🔗</span>
                    <span class="veritas-evidence-name">${source}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          ${result.details?.reasoning ? `
          <div class="veritas-metadata-section">
            <h4 class="veritas-section-title">Detalhes da Análise</h4>
            <div style="font-size: 12px; line-height: 1.3; color: var(--veritas-text-secondary); background: var(--veritas-bg-secondary); padding: 8px; border-radius: 4px;">
              ${result.details.reasoning}
            </div>
          </div>
          ` : ''}

          ${result.details?.processingTime ? `
          <div style="text-align: center; margin-top: 8px; font-size: 10px; color: var(--veritas-text-secondary);">
            Processado em ${result.details.processingTime}ms
          </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(tooltipContainer);
    extensionState.currentTooltip = tooltipContainer;

    // Adicionar eventos para pausar auto-hide durante interação
    let autoHideTimeout;
    let isHovering = false;

    const startAutoHide = () => {
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
      autoHideTimeout = setTimeout(() => {
        if (!isHovering && tooltipContainer.parentNode && !tooltipContainer.getAttribute('data-keep-open')) {
          tooltipContainer.classList.add('veritas-tooltip-hiding');
          setTimeout(() => {
            if (tooltipContainer.parentNode && !tooltipContainer.getAttribute('data-keep-open')) {
              tooltipContainer.remove();
              console.log('🗑️ Tooltip removida automaticamente');
            }
          }, 200);
        }
        if (!tooltipContainer.getAttribute('data-keep-open')) {
          extensionState.currentTooltip = null;
        }
      }, VERITAS_CONFIG.AUTO_HIDE_DELAY);
    };

    tooltipContainer.addEventListener('mouseenter', () => {
      isHovering = true;
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
    });

    tooltipContainer.addEventListener('mouseleave', () => {
      isHovering = false;
      startAutoHide();
    });

    // Adicionar classe para animação de entrada
    setTimeout(() => {
      tooltipContainer.classList.add('veritas-tooltip-visible');
    }, 10);

    // Iniciar auto-hide
    startAutoHide();

    console.log('✅ Tooltip estilizada adicionada ao DOM');

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
