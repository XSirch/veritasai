/**
 * UIManager - Módulo para gerenciamento de interface do usuário
 */

import { ResultTooltip } from '../ui-components.js';

export class UIManager {
  constructor(config, state) {
    this.config = config;
    this.state = state;
    this.autoHideTimer = null;
    this.observers = [];
    this.resultTooltip = null;

    this.setupIntersectionObserver();
    this.loadTooltipStyles();
  }
  
  /**
   * Carrega estilos do tooltip
   */
  loadTooltipStyles() {
    if (document.getElementById('veritas-tooltip-styles')) return;

    const link = document.createElement('link');
    link.id = 'veritas-tooltip-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('assets/styles/tooltip.css');
    document.head.appendChild(link);
  }

  /**
   * Configura intersection observer para otimizar performance
   */
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && (
          entry.target.id === 'veritas-tooltip' ||
          entry.target.id === 'veritas-result-tooltip'
        )) {
          this.scheduleAutoHide();
        }
      });
    });

    this.observers.push(observer);
  }
  
  /**
   * Mostra botão de verificação
   */
  showVerifyButton(selectionData) {
    this.hideAllElements();
    
    const button = this.createVerifyButton(selectionData);
    this.positionElement(button, selectionData.position);
    
    document.body.appendChild(button);
    this.state.currentButton = button;
    
    this.scheduleAutoHide();
    
    if (this.observers[0]) {
      this.observers[0].observe(button);
    }
  }
  
  /**
   * Cria botão de verificação
   */
  createVerifyButton(selectionData) {
    const button = document.createElement('div');
    button.id = 'veritas-verify-button';
    button.className = 'veritas-ui-element';
    
    const icon = this.getContentTypeIcon(selectionData.contentType);
    const label = this.getContentTypeLabel(selectionData.contentType);
    
    button.innerHTML = `
      <div class="veritas-button" data-content-type="${selectionData.contentType}">
        <span class="veritas-icon">${icon}</span>
        <span class="veritas-text">${label}</span>
        <span class="veritas-shortcut">Ctrl+V</span>
      </div>
    `;
    
    // Event listeners
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onVerifyClick(selectionData);
    });
    
    button.addEventListener('mouseenter', () => {
      this.cancelAutoHide();
    });
    
    button.addEventListener('mouseleave', () => {
      this.scheduleAutoHide();
    });
    
    return button;
  }
  
  /**
   * Mostra tooltip de loading
   */
  showLoadingTooltip(selectionData) {
    const tooltip = this.createLoadingTooltip(selectionData);
    this.positionElement(tooltip, selectionData.position);
    
    document.body.appendChild(tooltip);
    this.state.currentTooltip = tooltip;
  }
  
  /**
   * Cria tooltip de loading
   */
  createLoadingTooltip(selectionData) {
    const tooltip = document.createElement('div');
    tooltip.id = 'veritas-tooltip';
    tooltip.className = 'veritas-ui-element';
    
    tooltip.innerHTML = `
      <div class="veritas-tooltip loading">
        <div class="veritas-header">
          <span class="veritas-icon">🛡️</span>
          <span class="veritas-title">VeritasAI</span>
          <div class="veritas-progress">
            <div class="veritas-progress-bar"></div>
          </div>
        </div>
        <div class="veritas-content">
          <div class="veritas-loading">
            <div class="veritas-spinner"></div>
            <div class="veritas-loading-text">
              <span class="veritas-loading-main">Verificando informação...</span>
              <span class="veritas-loading-sub">Analisando com IA</span>
            </div>
          </div>
          <div class="veritas-cancel">
            <button class="veritas-cancel-btn">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    
    // Event listener para cancelar
    const cancelBtn = tooltip.querySelector('.veritas-cancel-btn');
    cancelBtn.addEventListener('click', () => {
      this.hideAllElements();
      this.state.isProcessing = false;
      this.onCancelVerification();
    });
    
    return tooltip;
  }
  
  /**
   * Mostra tooltip de resultado avançado
   */
  showResultTooltip(result, selectionData) {
    this.hideAllElements();

    // Criar novo tooltip avançado
    this.resultTooltip = new ResultTooltip({
      maxWidth: 400,
      minWidth: 280,
      animationDuration: this.config.TOOLTIP_DELAY || 200,
      autoHideDelay: this.config.AUTO_HIDE_DELAY || 8000,
      zIndex: this.config.Z_INDEX_BASE + 1
    });

    const tooltip = this.resultTooltip.create(result, selectionData, selectionData.position);
    this.state.currentTooltip = tooltip;

    // Configurar event listener para ações do tooltip
    document.addEventListener('veritasTooltipAction', this.handleTooltipAction.bind(this));

    if (this.observers[0]) {
      this.observers[0].observe(tooltip);
    }
  }
  
  /**
   * Cria tooltip de resultado
   */
  createResultTooltip(result, selectionData) {
    const tooltip = document.createElement('div');
    tooltip.id = 'veritas-tooltip';
    tooltip.className = 'veritas-ui-element';
    
    const classificationData = this.getClassificationData(result.classification);
    const confidence = Math.round((result.overallConfidence || result.confidence || 0) * 100);
    
    tooltip.innerHTML = `
      <div class="veritas-tooltip result" data-classification="${result.classification}">
        <div class="veritas-header">
          <span class="veritas-icon">🛡️</span>
          <span class="veritas-title">VeritasAI</span>
          <button class="veritas-close" aria-label="Fechar">×</button>
        </div>
        <div class="veritas-content">
          <div class="veritas-result">
            <div class="veritas-classification" style="color: ${classificationData.color}">
              <span class="veritas-result-icon">${classificationData.icon}</span>
              <span class="veritas-result-text">${classificationData.label}</span>
            </div>
            <div class="veritas-confidence">
              <div class="veritas-confidence-bar">
                <div class="veritas-confidence-fill" style="width: ${confidence}%; background-color: ${classificationData.color}"></div>
              </div>
              <span class="veritas-confidence-text">Confiança: ${confidence}%</span>
            </div>
            ${this.createEvidenceSection(result)}
            ${this.createActionsSection(result, selectionData)}
          </div>
        </div>
      </div>
    `;
    
    // Event listeners
    const closeBtn = tooltip.querySelector('.veritas-close');
    closeBtn.addEventListener('click', () => this.hideAllElements());
    
    this.setupResultActions(tooltip, result, selectionData);
    
    return tooltip;
  }
  
  /**
   * Mostra tooltip de erro
   */
  showErrorTooltip(error, selectionData) {
    const tooltip = document.createElement('div');
    tooltip.id = 'veritas-tooltip';
    tooltip.className = 'veritas-ui-element';
    
    tooltip.innerHTML = `
      <div class="veritas-tooltip error">
        <div class="veritas-header">
          <span class="veritas-icon">🛡️</span>
          <span class="veritas-title">VeritasAI</span>
          <button class="veritas-close" aria-label="Fechar">×</button>
        </div>
        <div class="veritas-content">
          <div class="veritas-error">
            <span class="veritas-error-icon">⚠️</span>
            <div class="veritas-error-content">
              <span class="veritas-error-title">Erro na Verificação</span>
              <span class="veritas-error-text">${error}</span>
            </div>
          </div>
          <div class="veritas-error-actions">
            <button class="veritas-retry-btn">Tentar Novamente</button>
            <button class="veritas-report-error-btn">Reportar Erro</button>
          </div>
        </div>
      </div>
    `;
    
    // Event listeners
    const closeBtn = tooltip.querySelector('.veritas-close');
    closeBtn.addEventListener('click', () => this.hideAllElements());
    
    const retryBtn = tooltip.querySelector('.veritas-retry-btn');
    retryBtn.addEventListener('click', () => {
      this.hideAllElements();
      this.onRetryVerification(selectionData);
    });
    
    const reportBtn = tooltip.querySelector('.veritas-report-error-btn');
    reportBtn.addEventListener('click', () => {
      this.onReportError(error, selectionData);
    });
    
    this.positionElement(tooltip, selectionData.position);
    document.body.appendChild(tooltip);
    this.state.currentTooltip = tooltip;
  }
  
  /**
   * Posiciona elemento na página
   */
  positionElement(element, position) {
    element.style.position = 'absolute';
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.zIndex = this.config.Z_INDEX_BASE.toString();
  }
  
  /**
   * Esconde todos os elementos
   */
  hideAllElements() {
    this.hideTooltip();
    this.hideButton();
    this.cancelAutoHide();
  }
  
  /**
   * Manipula ações do tooltip
   */
  handleTooltipAction(event) {
    const { action } = event.detail;

    switch (action) {
      case 'details':
        this.onShowDetails();
        break;
      case 'report':
        this.onGenerateReport();
        break;
      case 'share':
        this.onShareResult();
        break;
      case 'feedback':
        this.onSendFeedback();
        break;
    }
  }

  /**
   * Esconde tooltip
   */
  hideTooltip() {
    if (this.resultTooltip) {
      this.resultTooltip.destroy();
      this.resultTooltip = null;
    }

    if (this.state.currentTooltip) {
      this.state.currentTooltip.remove();
      this.state.currentTooltip = null;
    }

    // Remover event listener
    document.removeEventListener('veritasTooltipAction', this.handleTooltipAction.bind(this));
  }
  
  /**
   * Esconde botão
   */
  hideButton() {
    if (this.state.currentButton) {
      this.state.currentButton.remove();
      this.state.currentButton = null;
    }
  }
  
  /**
   * Agenda auto-hide
   */
  scheduleAutoHide() {
    this.cancelAutoHide();
    this.autoHideTimer = setTimeout(() => {
      this.hideAllElements();
    }, this.config.AUTO_HIDE_DELAY);
  }
  
  /**
   * Cancela auto-hide
   */
  cancelAutoHide() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.hideAllElements();
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Remover estilos injetados
    const styles = document.getElementById('veritas-tooltip-styles');
    if (styles) {
      styles.remove();
    }

    // Remover event listeners
    document.removeEventListener('veritasTooltipAction', this.handleTooltipAction.bind(this));
  }
  
  // Métodos auxiliares que serão implementados pelos handlers
  getContentTypeIcon(contentType) {
    const icons = {
      'statistic': '📊',
      'quote': '💬',
      'scientific': '🔬',
      'news': '📰',
      'opinion': '💭',
      'general': '🛡️'
    };
    return icons[contentType] || icons.general;
  }
  
  getContentTypeLabel(contentType) {
    const labels = {
      'statistic': 'Verificar Dado',
      'quote': 'Verificar Citação',
      'scientific': 'Verificar Estudo',
      'news': 'Verificar Notícia',
      'opinion': 'Analisar Opinião',
      'general': 'Verificar'
    };
    return labels[contentType] || labels.general;
  }
  
  getClassificationData(classification) {
    const data = {
      'verified': { color: '#4CAF50', icon: '✅', label: 'Verificado' },
      'likely_true': { color: '#8BC34A', icon: '✅', label: 'Provavelmente Verdadeiro' },
      'uncertain': { color: '#FF9800', icon: '⚠️', label: 'Incerto' },
      'likely_false': { color: '#FF5722', icon: '❌', label: 'Provavelmente Falso' },
      'disputed': { color: '#F44336', icon: '🚫', label: 'Contestado' },
      'no_data': { color: '#757575', icon: '❓', label: 'Sem Dados' }
    };
    return data[classification] || data.uncertain;
  }
  
  createEvidenceSection(result) {
    if (!result.evidences || result.evidences.length === 0) {
      return '<div class="veritas-no-evidence">Nenhuma evidência específica encontrada</div>';
    }
    
    const evidenceHtml = result.evidences.slice(0, 3).map(evidence => `
      <div class="veritas-evidence-item">
        <span class="veritas-evidence-source">${evidence.source}</span>
        <span class="veritas-evidence-score">${evidence.score}/100</span>
      </div>
    `).join('');
    
    return `
      <div class="veritas-evidence">
        <div class="veritas-evidence-title">Evidências:</div>
        ${evidenceHtml}
      </div>
    `;
  }
  
  createActionsSection(result, selectionData) {
    return `
      <div class="veritas-actions">
        <button class="veritas-action-btn veritas-details-btn" data-action="details">
          Ver Detalhes
        </button>
        <button class="veritas-action-btn veritas-report-btn" data-action="report">
          Relatório
        </button>
        <button class="veritas-action-btn veritas-share-btn" data-action="share">
          Compartilhar
        </button>
      </div>
    `;
  }
  
  setupResultActions(tooltip, result, selectionData) {
    const detailsBtn = tooltip.querySelector('[data-action="details"]');
    const reportBtn = tooltip.querySelector('[data-action="report"]');
    const shareBtn = tooltip.querySelector('[data-action="share"]');
    
    if (detailsBtn) {
      detailsBtn.addEventListener('click', () => {
        this.onShowDetails(result, selectionData);
      });
    }
    
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.onGenerateReport(result, selectionData);
      });
    }
    
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.onShareResult(result, selectionData);
      });
    }
  }
  
  // Event handlers (serão definidos pelo EventManager)
  onVerifyClick(selectionData) {}
  onCancelVerification() {}
  onRetryVerification(selectionData) {}
  onReportError(error, selectionData) {}
  onShowDetails(result, selectionData) {}
  onGenerateReport(result, selectionData) {}
  onShareResult(result, selectionData) {}
  onSendFeedback(result, selectionData) {}
}
