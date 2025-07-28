/**
 * EventManager - Módulo para gerenciamento de eventos
 */

export class EventManager {
  constructor(textDetector, uiManager, communicationManager, state) {
    this.textDetector = textDetector;
    this.uiManager = uiManager;
    this.communicationManager = communicationManager;
    this.state = state;
    
    this.debounceTimer = null;
    this.observers = [];
    
    // Bind event handlers to UI manager
    this.bindUIHandlers();
  }
  
  /**
   * Configura todos os event listeners
   */
  setupAllListeners() {
    this.setupSelectionListeners();
    this.setupInteractionListeners();
    this.setupKeyboardListeners();
    this.setupWindowListeners();
    this.setupMutationObserver();
  }
  
  /**
   * Configura listeners para seleção de texto
   */
  setupSelectionListeners() {
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    document.addEventListener('selectionchange', this.debounceSelectionChange.bind(this));
  }
  
  /**
   * Configura listeners para interação
   */
  setupInteractionListeners() {
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
  }
  
  /**
   * Configura listeners para teclado
   */
  setupKeyboardListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  /**
   * Configura listeners para janela
   */
  setupWindowListeners() {
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    window.addEventListener('resize', this.handleResize.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  /**
   * Configura mutation observer
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.id === 'veritas-verify-button' || node.id === 'veritas-tooltip') {
                this.cleanupRemovedElement(node);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
  }
  
  /**
   * Debounce para mudanças de seleção
   */
  debounceSelectionChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      await this.handleTextSelection();
    }, 300);
  }
  
  /**
   * Manipula seleção de texto
   */
  async handleTextSelection(event) {
    if (!this.state.enabled || this.state.isProcessing) return;

    try {
      const selection = window.getSelection();
      const selectedText = this.textDetector.extractSelectedText(selection);

      if (this.textDetector.isValidSelection(selectedText, selection)) {
        const selectionData = this.textDetector.analyzeSelection(selection, selectedText);
        this.state.lastSelection = selectionData;

        // Verificar se verificação automática está habilitada
        const autoVerifyEnabled = this.state.settings?.autoVerify ||
                                 (typeof window !== 'undefined' &&
                                  window.VeritasAI?.VERITAS_CONFIG?.AUTO_VERIFY);

        console.log('🔍 Texto selecionado:', {
          text: selectedText.substring(0, 50) + '...',
          length: selectedText.length,
          autoVerify: autoVerifyEnabled
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
  
  /**
   * Tratamento de eventos de teclado
   */
  async handleKeyDown(event) {
    // Esc para fechar tooltip
    if (event.key === 'Escape') {
      this.uiManager.hideAllElements();
      return;
    }
    
    // Ctrl+V para verificar seleção atual
    if (event.ctrlKey && event.key === 'v' && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      await this.handleTextSelection();
      return;
    }
    
    // Ctrl+Shift+V para verificar com análise profunda
    if (event.ctrlKey && event.shiftKey && event.key === 'V') {
      event.preventDefault();
      if (this.state.lastSelection) {
        this.verifyText(this.state.lastSelection, { strategy: 'deep' });
      }
      return;
    }
  }
  
  handleKeyUp(event) {
    // Detectar seleção por teclado (Shift + setas)
    if (event.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      this.debounceSelectionChange();
    }
  }
  
  /**
   * Tratamento de cliques no documento
   */
  handleDocumentClick(event) {
    // Verificar se clique foi em elemento do VeritasAI
    if (event.target.closest('.veritas-ui-element')) {
      return;
    }
    
    // Fechar elementos se clique foi fora
    if (this.state.currentTooltip && !this.state.currentTooltip.contains(event.target)) {
      this.uiManager.hideAllElements();
    }
  }
  
  /**
   * Tratamento de menu de contexto
   */
  handleContextMenu(event) {
    const selection = window.getSelection();
    const selectedText = this.textDetector.extractSelectedText(selection);
    
    if (this.textDetector.isValidSelection(selectedText, selection)) {
      this.state.lastSelection = this.textDetector.analyzeSelection(selection, selectedText);
    }
  }
  
  /**
   * Tratamento de scroll
   */
  handleScroll() {
    if (this.state.currentTooltip || this.state.currentButton) {
      this.uiManager.scheduleAutoHide();
    }
  }
  
  /**
   * Tratamento de resize
   */
  handleResize() {
    this.uiManager.hideAllElements();
  }
  
  /**
   * Tratamento de mudança de visibilidade
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.uiManager.hideAllElements();
      this.state.isProcessing = false;
    }
  }
  
  /**
   * Limpa elemento removido
   */
  cleanupRemovedElement(element) {
    if (element === this.state.currentTooltip) {
      this.state.currentTooltip = null;
    }
    if (element === this.state.currentButton) {
      this.state.currentButton = null;
    }
  }
  
  /**
   * Bind handlers para UI Manager
   */
  bindUIHandlers() {
    this.uiManager.onVerifyClick = this.handleVerifyClick.bind(this);
    this.uiManager.onCancelVerification = this.handleCancelVerification.bind(this);
    this.uiManager.onRetryVerification = this.handleRetryVerification.bind(this);
    this.uiManager.onReportError = this.handleReportError.bind(this);
    this.uiManager.onShowDetails = this.handleShowDetails.bind(this);
    this.uiManager.onGenerateReport = this.handleGenerateReport.bind(this);
    this.uiManager.onShareResult = this.handleShareResult.bind(this);
  }
  
  /**
   * Handler para clique em verificar
   */
  async handleVerifyClick(selectionData) {
    await this.verifyText(selectionData);
  }
  
  /**
   * Handler para cancelar verificação
   */
  handleCancelVerification() {
    this.communicationManager.trackEvent('verification_cancelled');
  }
  
  /**
   * Handler para tentar novamente
   */
  async handleRetryVerification(selectionData) {
    await this.verifyText(selectionData);
  }
  
  /**
   * Handler para reportar erro
   */
  async handleReportError(error, selectionData) {
    try {
      await this.communicationManager.reportError(new Error(error), {
        selectionData: selectionData,
        action: 'verification_error'
      });
      
      this.showNotification('Erro reportado com sucesso', 'success');
    } catch (reportError) {
      console.error('Erro ao reportar erro:', reportError);
      this.showNotification('Falha ao reportar erro', 'error');
    }
  }
  
  /**
   * Handler para mostrar detalhes
   */
  async handleShowDetails(result, selectionData) {
    try {
      const detailedResult = await this.communicationManager.getDetailedResult(result.analysisId);
      
      if (detailedResult.success) {
        // Implementar modal de detalhes
        console.log('Mostrar detalhes:', detailedResult.data);
      }
    } catch (error) {
      console.error('Erro ao obter resultado detalhado:', error);
      this.showNotification('Erro ao carregar detalhes', 'error');
    }
  }
  
  /**
   * Handler para gerar relatório
   */
  async handleGenerateReport(result, selectionData) {
    try {
      const report = await this.communicationManager.generateReport(result, 'summary');
      
      if (report.success) {
        this.downloadReport(report.data);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      this.showNotification('Erro ao gerar relatório', 'error');
    }
  }
  
  /**
   * Handler para compartilhar resultado
   */
  handleShareResult(result, selectionData) {
    const shareData = {
      title: 'VeritasAI - Verificação de Fato',
      text: `"${selectionData.text}" - ${result.classification} (${Math.round(result.overallConfidence * 100)}% confiança)`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
        .then(() => this.showNotification('Copiado para área de transferência', 'success'))
        .catch(() => this.showNotification('Erro ao copiar', 'error'));
    }
  }
  
  /**
   * Verifica texto (delegado para o script principal)
   */
  async verifyText(selectionData, options = {}) {
    // Este método será implementado pelo script principal
    if (window.VeritasContentScript && window.VeritasContentScript.verifyText) {
      return await window.VeritasContentScript.verifyText(selectionData, options);
    }
  }
  
  /**
   * Mostra notificação
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `veritas-notification veritas-notification-${type}`;
    notification.textContent = message;
    
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10100';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  /**
   * Download de relatório
   */
  downloadReport(reportData) {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    // Limpar timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Limpar observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}
