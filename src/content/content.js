/**
 * VeritasAI - Content Script Principal
 * Arquivo principal limpo e modular (< 300 linhas)
 */

console.log('🚀 VeritasAI Content Script v2.0 carregando...');

// Configuração
const CONFIG = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 5000,
  AUTO_HIDE_DELAY: 5000,
  Z_INDEX_BASE: 10000
};

// Estado da extensão
const state = {
  enabled: true,
  currentTooltip: null,
  currentButton: null,
  lastSelection: null,
  isProcessing: false
};

/**
 * Classe principal do Content Script
 */
class VeritasContentScript {
  constructor() {
    this.init();
  }

  /**
   * Inicialização
   */
  async init() {
    try {
      await this.loadSettings();

      if (!state.enabled) {
        console.log('ℹ️ VeritasAI desabilitado');
        return;
      }

      this.setupEvents();
      this.injectStyles();

      console.log('✅ VeritasAI inicializado');
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
    }
  }

  /**
   * Carrega configurações
   */
  async loadSettings() {
    try {
      const response = await this.sendMessage('getSettings');
      if (response?.success) {
        state.enabled = response.data?.enabled ?? true;
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }

  /**
   * Configura eventos
   */
  setupEvents() {
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideTooltip();
      }
      if (e.ctrlKey && e.key === 'v' && !e.shiftKey) {
        e.preventDefault();
        this.handleTextSelection();
      }
    });
  }

  /**
   * Manipula seleção de texto
   */
  handleTextSelection() {
    if (!state.enabled || state.isProcessing) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (this.isValidSelection(text, selection)) {
        const selectionData = this.analyzeSelection(selection, text);
        this.showVerifyButton(selectionData);
        state.lastSelection = selectionData;
      } else {
        this.hideTooltip();
      }
    }, 100);
  }

  /**
   * Valida seleção
   */
  isValidSelection(text, selection) {
    return text && text.length >= CONFIG.MIN_TEXT_LENGTH &&
           text.length <= CONFIG.MAX_TEXT_LENGTH &&
           selection && selection.rangeCount > 0;
  }

  /**
   * Analisa seleção
   */
  analyzeSelection(selection, text) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return {
      text: text,
      position: {
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 5
      },
      contentType: 'general',
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname
    };
  }

  /**
   * Mostra botão de verificação
   */
  showVerifyButton(selectionData) {
    this.hideTooltip();

    const button = document.createElement('div');
    button.id = 'veritas-verify-button';
    button.innerHTML = `
      <div class="veritas-button">
        <span class="veritas-icon">🛡️</span>
        <span class="veritas-text">Verificar</span>
      </div>
    `;

    button.style.cssText = `
      position: absolute;
      left: ${selectionData.position.x}px;
      top: ${selectionData.position.y}px;
      z-index: ${CONFIG.Z_INDEX_BASE};
      cursor: pointer;
    `;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.verifyText(selectionData);
    });

    document.body.appendChild(button);
    state.currentButton = button;

    // Auto-hide
    setTimeout(() => this.hideTooltip(), CONFIG.AUTO_HIDE_DELAY);
  }

  /**
   * Verifica texto
   */
  async verifyText(selectionData) {
    if (state.isProcessing) return;

    state.isProcessing = true;
    this.hideTooltip();
    this.showLoading(selectionData);

    try {
      const response = await this.sendMessage('verifyText', {
        text: selectionData.text,
        url: selectionData.url
      });

      this.hideTooltip();

      if (response?.success) {
        this.showResult(response.data, selectionData);
      } else {
        this.showError(response?.error || 'Erro na verificação', selectionData);
      }
    } catch (error) {
      this.hideTooltip();
      this.showError('Erro de comunicação', selectionData);
    } finally {
      state.isProcessing = false;
    }
  }

  /**
   * Mostra loading
   */
  showLoading(selectionData) {
    const tooltip = this.createTooltip(selectionData, `
      <div class="veritas-loading">
        <div class="veritas-spinner"></div>
        <span>Verificando...</span>
      </div>
    `);

    document.body.appendChild(tooltip);
    state.currentTooltip = tooltip;
  }

  /**
   * Mostra resultado
   */
  showResult(result, selectionData) {
    const classification = result.classification || 'uncertain';
    const confidence = Math.round((result.overallConfidence || 0.5) * 100);

    const tooltip = this.createTooltip(selectionData, `
      <div class="veritas-result">
        <div class="veritas-classification">${classification}</div>
        <div class="veritas-confidence">Confiança: ${confidence}%</div>
      </div>
    `);

    document.body.appendChild(tooltip);
    state.currentTooltip = tooltip;
  }

  /**
   * Mostra erro
   */
  showError(error, selectionData) {
    const tooltip = this.createTooltip(selectionData, `
      <div class="veritas-error">
        <span>⚠️ ${error}</span>
      </div>
    `);

    document.body.appendChild(tooltip);
    state.currentTooltip = tooltip;
  }

  /**
   * Cria tooltip base
   */
  createTooltip(selectionData, content) {
    const tooltip = document.createElement('div');
    tooltip.id = 'veritas-tooltip';
    tooltip.innerHTML = `
      <div class="veritas-tooltip">
        <div class="veritas-header">
          <span>🛡️ VeritasAI</span>
          <button class="veritas-close">×</button>
        </div>
        <div class="veritas-content">${content}</div>
      </div>
    `;

    tooltip.style.cssText = `
      position: absolute;
      left: ${selectionData.position.x}px;
      top: ${selectionData.position.y}px;
      z-index: ${CONFIG.Z_INDEX_BASE};
    `;

    const closeBtn = tooltip.querySelector('.veritas-close');
    closeBtn.addEventListener('click', () => this.hideTooltip());

    return tooltip;
  }

  /**
   * Esconde tooltip
   */
  hideTooltip() {
    if (state.currentTooltip) {
      state.currentTooltip.remove();
      state.currentTooltip = null;
    }
    if (state.currentButton) {
      state.currentButton.remove();
      state.currentButton = null;
    }
  }

  /**
   * Manipula cliques no documento
   */
  handleDocumentClick(event) {
    if (state.currentTooltip && !state.currentTooltip.contains(event.target)) {
      this.hideTooltip();
    }
  }

  /**
   * Envia mensagem para background
   */
  sendMessage(action, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, resolve);
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    this.hideTooltip();
    const style = document.getElementById('veritas-styles');
    if (style) style.remove();
  }

  /**
   * Injeta estilos básicos
   */
  injectStyles() {
    if (document.getElementById('veritas-styles')) return;

    const style = document.createElement('style');
    style.id = 'veritas-styles';
    style.textContent = `
      .veritas-button{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:6px 12px;border-radius:16px;box-shadow:0 2px 8px rgba(102,126,234,0.3);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;font-weight:500}
      .veritas-tooltip{background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.1);border:1px solid #e0e0e0;min-width:200px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px}
      .veritas-header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f5f5f5;border-bottom:1px solid #e0e0e0;font-weight:600}
      .veritas-close{background:none;border:none;font-size:16px;cursor:pointer;color:#666}
      .veritas-content{padding:12px}
      .veritas-loading{display:flex;align-items:center;gap:8px}
      .veritas-spinner{width:16px;height:16px;border:2px solid #f3f3f3;border-top:2px solid #667eea;border-radius:50%;animation:spin 1s linear infinite}
      @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      .veritas-result{text-align:center}
      .veritas-classification{font-weight:600;margin-bottom:4px;text-transform:capitalize}
      .veritas-confidence{font-size:11px;color:#666}
      .veritas-error{color:#d32f2f;text-align:center}
    `;

    document.head.appendChild(style);
  }
}

// Inicialização
let veritasContentScript = null;

function initialize() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      veritasContentScript = new VeritasContentScript();
    });
  } else {
    veritasContentScript = new VeritasContentScript();
  }
}

// Cleanup
window.addEventListener('beforeunload', () => {
  if (veritasContentScript) {
    veritasContentScript.destroy();
  }
});

// Inicializar
initialize();

// Exportar globalmente
window.VeritasContentScript = veritasContentScript;

console.log('📦 VeritasAI Content Script v2.0 carregado');
