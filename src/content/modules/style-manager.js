/**
 * StyleManager - Módulo para gerenciamento de estilos CSS
 */

export class StyleManager {
  constructor() {
    this.injectedStyles = null;
    this.styleId = 'veritas-ai-styles';
  }
  
  /**
   * Injeta estilos CSS na página
   */
  injectStyles() {
    if (this.injectedStyles) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = this.styleId;
    styleElement.textContent = this.getCSS();
    
    document.head.appendChild(styleElement);
    this.injectedStyles = styleElement;
  }
  
  /**
   * Remove estilos injetados
   */
  removeStyles() {
    if (this.injectedStyles) {
      this.injectedStyles.remove();
      this.injectedStyles = null;
    }
  }
  
  /**
   * Atualiza estilos
   */
  updateStyles() {
    this.removeStyles();
    this.injectStyles();
  }
  
  /**
   * Retorna CSS completo
   */
  getCSS() {
    return `
      ${this.getBaseStyles()}
      ${this.getButtonStyles()}
      ${this.getTooltipStyles()}
      ${this.getLoadingStyles()}
      ${this.getNotificationStyles()}
      ${this.getAnimationStyles()}
      ${this.getResponsiveStyles()}
    `;
  }
  
  /**
   * Estilos base
   */
  getBaseStyles() {
    return `
      /* VeritasAI - Estilos Base */
      .veritas-ui-element {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #333;
        box-sizing: border-box;
        z-index: 10000;
        position: absolute;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      .veritas-ui-element *,
      .veritas-ui-element *::before,
      .veritas-ui-element *::after {
        box-sizing: border-box;
      }
      
      .veritas-ui-element button {
        font-family: inherit;
        font-size: inherit;
        border: none;
        outline: none;
        cursor: pointer;
        background: none;
        padding: 0;
        margin: 0;
      }
    `;
  }
  
  /**
   * Estilos do botão de verificação
   */
  getButtonStyles() {
    return `
      /* Botão de Verificação */
      #veritas-verify-button {
        animation: veritasSlideIn 0.2s ease-out;
      }
      
      .veritas-button {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
        font-size: 13px;
        white-space: nowrap;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .veritas-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      }
      
      .veritas-button:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }
      
      .veritas-icon {
        font-size: 16px;
        line-height: 1;
      }
      
      .veritas-text {
        font-weight: 600;
      }
      
      .veritas-shortcut {
        font-size: 10px;
        opacity: 0.8;
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 8px;
        margin-left: 4px;
      }
      
      /* Variações por tipo de conteúdo */
      .veritas-button[data-content-type="statistic"] {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }
      
      .veritas-button[data-content-type="scientific"] {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }
      
      .veritas-button[data-content-type="news"] {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      }
      
      .veritas-button[data-content-type="quote"] {
        background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        color: #333;
      }
    `;
  }
  
  /**
   * Estilos do tooltip
   */
  getTooltipStyles() {
    return `
      /* Tooltip */
      #veritas-tooltip {
        animation: veritasSlideIn 0.3s ease-out;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      #veritas-tooltip.veritas-tooltip-visible {
        opacity: 1;
      }
      
      .veritas-tooltip {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(0, 0, 0, 0.08);
        min-width: 300px;
        max-width: 400px;
        overflow: hidden;
      }
      
      .veritas-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .veritas-title {
        font-weight: 600;
        font-size: 14px;
        margin-left: 8px;
      }
      
      .veritas-close {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        transition: background 0.2s ease;
      }
      
      .veritas-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .veritas-content {
        padding: 16px;
      }
      
      .veritas-progress {
        height: 2px;
        background: rgba(255, 255, 255, 0.3);
        margin-top: 8px;
        border-radius: 1px;
        overflow: hidden;
      }
      
      .veritas-progress-bar {
        height: 100%;
        background: white;
        width: 0%;
        animation: veritasProgress 2s ease-in-out infinite;
      }
    `;
  }
  
  /**
   * Estilos de loading
   */
  getLoadingStyles() {
    return `
      /* Loading */
      .veritas-loading {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .veritas-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #667eea;
        border-radius: 50%;
        animation: veritasSpin 1s linear infinite;
      }
      
      .veritas-loading-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .veritas-loading-main {
        font-weight: 600;
        color: #333;
      }
      
      .veritas-loading-sub {
        font-size: 12px;
        color: #666;
      }
      
      .veritas-cancel {
        text-align: center;
      }
      
      .veritas-cancel-btn {
        background: #f5f5f5;
        color: #666;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .veritas-cancel-btn:hover {
        background: #e0e0e0;
        color: #333;
      }
    `;
  }
  
  /**
   * Estilos de resultado
   */
  getResultStyles() {
    return `
      /* Resultado */
      .veritas-result {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .veritas-classification {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
      }
      
      .veritas-result-icon {
        font-size: 20px;
      }
      
      .veritas-confidence {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .veritas-confidence-bar {
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .veritas-confidence-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease;
      }
      
      .veritas-confidence-text {
        font-size: 12px;
        color: #666;
        text-align: center;
      }
      
      .veritas-evidence {
        border-top: 1px solid #eee;
        padding-top: 12px;
      }
      
      .veritas-evidence-title {
        font-weight: 600;
        margin-bottom: 8px;
        font-size: 13px;
        color: #333;
      }
      
      .veritas-evidence-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 12px;
      }
      
      .veritas-evidence-source {
        color: #666;
      }
      
      .veritas-evidence-score {
        font-weight: 600;
        color: #333;
      }
      
      .veritas-actions {
        display: flex;
        gap: 8px;
        border-top: 1px solid #eee;
        padding-top: 12px;
      }
      
      .veritas-action-btn {
        flex: 1;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }
      
      .veritas-details-btn {
        background: #f8f9fa;
        color: #495057;
      }
      
      .veritas-details-btn:hover {
        background: #e9ecef;
      }
      
      .veritas-report-btn {
        background: #e3f2fd;
        color: #1976d2;
      }
      
      .veritas-report-btn:hover {
        background: #bbdefb;
      }
      
      .veritas-share-btn {
        background: #f3e5f5;
        color: #7b1fa2;
      }
      
      .veritas-share-btn:hover {
        background: #e1bee7;
      }
    `;
  }
  
  /**
   * Estilos de notificação
   */
  getNotificationStyles() {
    return `
      /* Notificações */
      .veritas-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: veritasSlideInRight 0.3s ease-out;
        z-index: 10100;
        max-width: 300px;
      }
      
      .veritas-notification-success {
        background: #4caf50;
      }
      
      .veritas-notification-error {
        background: #f44336;
      }
      
      .veritas-notification-info {
        background: #2196f3;
      }
      
      .veritas-notification-warning {
        background: #ff9800;
      }
    `;
  }
  
  /**
   * Animações
   */
  getAnimationStyles() {
    return `
      /* Animações */
      @keyframes veritasSlideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes veritasSlideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes veritasSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes veritasProgress {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
      
      @keyframes veritasPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
  }
  
  /**
   * Estilos responsivos
   */
  getResponsiveStyles() {
    return `
      /* Responsivo */
      @media (max-width: 480px) {
        .veritas-tooltip {
          min-width: 280px;
          max-width: 90vw;
        }
        
        .veritas-button {
          font-size: 12px;
          padding: 6px 10px;
        }
        
        .veritas-shortcut {
          display: none;
        }
        
        .veritas-actions {
          flex-direction: column;
        }
        
        .veritas-notification {
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
      
      @media (prefers-reduced-motion: reduce) {
        .veritas-ui-element,
        .veritas-ui-element * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      @media (prefers-color-scheme: dark) {
        .veritas-tooltip {
          background: #2d2d2d;
          color: #e0e0e0;
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .veritas-evidence {
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .veritas-actions {
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .veritas-details-btn {
          background: #404040;
          color: #e0e0e0;
        }
        
        .veritas-details-btn:hover {
          background: #505050;
        }
      }
    `;
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.removeStyles();
  }
}
