/**
 * VeritasAI - UI Components
 * Componentes de interface avançados para tooltip de resultados
 */

/**
 * Classe para gerenciar tooltip de resultados avançado
 */
export class ResultTooltip {
  constructor(config = {}) {
    this.config = {
      maxWidth: 400,
      minWidth: 280,
      animationDuration: 200,
      autoHideDelay: 8000,
      zIndex: 10001,
      ...config
    };
    
    this.element = null;
    this.isVisible = false;
    this.autoHideTimer = null;
    this.focusableElements = [];
  }
  
  /**
   * Cria tooltip com resultado da verificação
   */
  create(result, selectionData, position) {
    this.destroy(); // Remove tooltip anterior se existir
    
    const tooltip = document.createElement('div');
    tooltip.id = 'veritas-result-tooltip';
    tooltip.className = 'veritas-tooltip-container';
    tooltip.setAttribute('role', 'dialog');
    tooltip.setAttribute('aria-labelledby', 'veritas-tooltip-title');
    tooltip.setAttribute('aria-describedby', 'veritas-tooltip-content');
    
    const classificationData = this.getClassificationData(result.classification);
    const confidence = Math.round((result.overallConfidence || result.confidence || 0) * 100);
    
    tooltip.innerHTML = this.createTooltipHTML(result, classificationData, confidence, selectionData);
    
    // Posicionamento responsivo
    this.positionTooltip(tooltip, position);
    
    // Configurar acessibilidade
    this.setupAccessibility(tooltip);
    
    // Event listeners
    this.setupEventListeners(tooltip);
    
    // Adicionar à página
    document.body.appendChild(tooltip);
    this.element = tooltip;
    
    // Animação de entrada
    requestAnimationFrame(() => {
      tooltip.classList.add('veritas-tooltip-visible');
      this.isVisible = true;
    });
    
    // Auto-hide
    this.scheduleAutoHide();
    
    return tooltip;
  }
  
  /**
   * Cria HTML do tooltip
   */
  createTooltipHTML(result, classificationData, confidence, selectionData) {
    const evidenceSection = this.createEvidenceSection(result.evidences || []);
    const actionsSection = this.createActionsSection(result);
    const metadataSection = this.createMetadataSection(result, selectionData);
    
    return `
      <div class="veritas-tooltip veritas-classification-${result.classification}" 
           data-classification="${result.classification}">
        <div class="veritas-tooltip-header">
          <div class="veritas-header-content">
            <span class="veritas-logo" aria-hidden="true">🛡️</span>
            <h3 id="veritas-tooltip-title" class="veritas-title">VeritasAI</h3>
          </div>
          <button class="veritas-close-btn" 
                  aria-label="Fechar tooltip de resultado"
                  title="Fechar (Esc)">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        
        <div id="veritas-tooltip-content" class="veritas-tooltip-content">
          <div class="veritas-result-main">
            <div class="veritas-classification-badge" 
                 style="--classification-color: ${classificationData.color}">
              <span class="veritas-classification-icon" aria-hidden="true">
                ${classificationData.icon}
              </span>
              <span class="veritas-classification-text">
                ${classificationData.label}
              </span>
            </div>
            
            <div class="veritas-confidence-section">
              <div class="veritas-confidence-bar" 
                   role="progressbar" 
                   aria-valuenow="${confidence}" 
                   aria-valuemin="0" 
                   aria-valuemax="100"
                   aria-label="Nível de confiança">
                <div class="veritas-confidence-fill" 
                     style="width: ${confidence}%; background-color: ${classificationData.color}">
                </div>
              </div>
              <span class="veritas-confidence-text">
                Confiança: ${confidence}%
              </span>
            </div>
          </div>
          
          ${evidenceSection}
          ${metadataSection}
          ${actionsSection}
        </div>
      </div>
    `;
  }
  
  /**
   * Cria seção de evidências
   */
  createEvidenceSection(evidences) {
    if (!evidences || evidences.length === 0) {
      return `
        <div class="veritas-evidence-section">
          <h4 class="veritas-section-title">Evidências</h4>
          <p class="veritas-no-evidence">Nenhuma evidência específica encontrada</p>
        </div>
      `;
    }
    
    const evidenceItems = evidences.slice(0, 3).map((evidence, index) => `
      <div class="veritas-evidence-item" tabindex="0" role="listitem">
        <div class="veritas-evidence-source">
          <span class="veritas-evidence-icon" aria-hidden="true">📄</span>
          <span class="veritas-evidence-name">${evidence.source || `Fonte ${index + 1}`}</span>
        </div>
        <div class="veritas-evidence-score" 
             aria-label="Pontuação de confiabilidade: ${evidence.score || 0} de 100">
          ${evidence.score || 0}/100
        </div>
      </div>
    `).join('');
    
    return `
      <div class="veritas-evidence-section">
        <h4 class="veritas-section-title">Evidências</h4>
        <div class="veritas-evidence-list" role="list" aria-label="Lista de evidências">
          ${evidenceItems}
        </div>
      </div>
    `;
  }
  
  /**
   * Cria seção de metadados
   */
  createMetadataSection(result, selectionData) {
    const analysisTime = result.analysisTime ? `${result.analysisTime}ms` : 'N/A';
    const textLength = selectionData.text ? selectionData.text.length : 0;
    const contentType = selectionData.contentType || 'general';
    
    return `
      <div class="veritas-metadata-section">
        <h4 class="veritas-section-title">Detalhes da Análise</h4>
        <div class="veritas-metadata-grid">
          <div class="veritas-metadata-item">
            <span class="veritas-metadata-label">Tipo:</span>
            <span class="veritas-metadata-value">${this.getContentTypeLabel(contentType)}</span>
          </div>
          <div class="veritas-metadata-item">
            <span class="veritas-metadata-label">Caracteres:</span>
            <span class="veritas-metadata-value">${textLength}</span>
          </div>
          <div class="veritas-metadata-item">
            <span class="veritas-metadata-label">Tempo:</span>
            <span class="veritas-metadata-value">${analysisTime}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Cria seção de ações
   */
  createActionsSection(result) {
    return `
      <div class="veritas-actions-section">
        <div class="veritas-actions-grid">
          <button class="veritas-action-btn veritas-details-btn" 
                  data-action="details"
                  aria-label="Ver análise detalhada">
            <span class="veritas-action-icon" aria-hidden="true">🔍</span>
            <span class="veritas-action-text">Detalhes</span>
          </button>
          
          <button class="veritas-action-btn veritas-report-btn" 
                  data-action="report"
                  aria-label="Gerar relatório da verificação">
            <span class="veritas-action-icon" aria-hidden="true">📄</span>
            <span class="veritas-action-text">Relatório</span>
          </button>
          
          <button class="veritas-action-btn veritas-share-btn" 
                  data-action="share"
                  aria-label="Compartilhar resultado">
            <span class="veritas-action-icon" aria-hidden="true">📤</span>
            <span class="veritas-action-text">Compartilhar</span>
          </button>
          
          <button class="veritas-action-btn veritas-feedback-btn" 
                  data-action="feedback"
                  aria-label="Enviar feedback sobre o resultado">
            <span class="veritas-action-icon" aria-hidden="true">💬</span>
            <span class="veritas-action-text">Feedback</span>
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Posiciona tooltip de forma responsiva
   */
  positionTooltip(tooltip, position) {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    
    // Posição inicial
    let x = position.x;
    let y = position.y;
    
    // Ajustar para não sair da viewport
    const tooltipRect = { width: this.config.maxWidth, height: 300 }; // Estimativa
    
    // Ajuste horizontal
    if (x + tooltipRect.width > viewport.width - 20) {
      x = viewport.width - tooltipRect.width - 20;
    }
    if (x < 20) {
      x = 20;
    }
    
    // Ajuste vertical
    if (y + tooltipRect.height > viewport.height - 20) {
      y = position.y - tooltipRect.height - 10; // Mostrar acima
    }
    if (y < 20) {
      y = 20;
    }
    
    tooltip.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      z-index: ${this.config.zIndex};
      max-width: ${this.config.maxWidth}px;
      min-width: ${this.config.minWidth}px;
    `;
  }
  
  /**
   * Configura acessibilidade
   */
  setupAccessibility(tooltip) {
    // Encontrar elementos focáveis
    this.focusableElements = tooltip.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    // Focar no primeiro elemento
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
    
    // Trap focus dentro do tooltip
    tooltip.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Configura event listeners
   */
  setupEventListeners(tooltip) {
    // Botão fechar
    const closeBtn = tooltip.querySelector('.veritas-close-btn');
    closeBtn.addEventListener('click', () => this.destroy());
    
    // Botões de ação
    const actionBtns = tooltip.querySelectorAll('.veritas-action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleAction(action);
      });
    });
    
    // Cancelar auto-hide ao interagir
    tooltip.addEventListener('mouseenter', () => this.cancelAutoHide());
    tooltip.addEventListener('mouseleave', () => this.scheduleAutoHide());
    tooltip.addEventListener('focusin', () => this.cancelAutoHide());
    tooltip.addEventListener('focusout', (e) => {
      if (!tooltip.contains(e.relatedTarget)) {
        this.scheduleAutoHide();
      }
    });
  }
  
  /**
   * Manipula teclas pressionadas
   */
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.destroy();
      return;
    }
    
    if (e.key === 'Tab') {
      this.handleTabNavigation(e);
    }
  }
  
  /**
   * Gerencia navegação por Tab
   */
  handleTabNavigation(e) {
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  /**
   * Manipula ações dos botões
   */
  handleAction(action) {
    // Emitir evento customizado para ser capturado pelo content script
    const event = new CustomEvent('veritasTooltipAction', {
      detail: { action }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Agenda auto-hide
   */
  scheduleAutoHide() {
    this.cancelAutoHide();
    this.autoHideTimer = setTimeout(() => {
      this.destroy();
    }, this.config.autoHideDelay);
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
   * Remove tooltip
   */
  destroy() {
    if (this.element) {
      this.element.classList.add('veritas-tooltip-hiding');
      
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.isVisible = false;
        this.focusableElements = [];
      }, this.config.animationDuration);
    }
    
    this.cancelAutoHide();
  }
  
  /**
   * Obtém dados de classificação
   */
  getClassificationData(classification) {
    const data = {
      'verified': { 
        color: '#4CAF50', 
        icon: '✅', 
        label: 'Verificado',
        description: 'Informação confirmada por fontes confiáveis'
      },
      'likely_true': { 
        color: '#8BC34A', 
        icon: '✅', 
        label: 'Provavelmente Verdadeiro',
        description: 'Evidências suportam a veracidade'
      },
      'uncertain': { 
        color: '#FF9800', 
        icon: '⚠️', 
        label: 'Incerto',
        description: 'Evidências insuficientes ou conflitantes'
      },
      'likely_false': { 
        color: '#FF5722', 
        icon: '❌', 
        label: 'Provavelmente Falso',
        description: 'Evidências contradizem a afirmação'
      },
      'disputed': { 
        color: '#F44336', 
        icon: '🚫', 
        label: 'Contestado',
        description: 'Informação amplamente contestada'
      },
      'no_data': { 
        color: '#757575', 
        icon: '❓', 
        label: 'Sem Dados',
        description: 'Não foi possível encontrar informações'
      }
    };
    return data[classification] || data.uncertain;
  }
  
  /**
   * Obtém label do tipo de conteúdo
   */
  getContentTypeLabel(contentType) {
    const labels = {
      'statistic': 'Estatística',
      'quote': 'Citação',
      'scientific': 'Científico',
      'news': 'Notícia',
      'opinion': 'Opinião',
      'general': 'Geral'
    };
    return labels[contentType] || labels.general;
  }
}
