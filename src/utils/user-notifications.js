/**
 * VeritasAI - Sistema de Notificações
 * Sistema toast para exibir notificações de erro, status e feedback
 */

export class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.config = {
      maxNotifications: 5,
      defaultDuration: 5000,
      position: 'top-right',
      animationDuration: 300,
      stackSpacing: 10
    };
    this.notificationId = 0;
    this.isInitialized = false;
    
    this.init();
  }
  
  /**
   * Inicializa o sistema de notificações
   */
  init() {
    try {
      this.createContainer();
      this.setupStyles();
      this.setupEventListeners();
      this.isInitialized = true;
      
      console.log('✅ Sistema de notificações inicializado');
    } catch (error) {
      console.error('❌ Erro na inicialização das notificações:', error);
    }
  }
  
  /**
   * Cria o container principal das notificações
   */
  createContainer() {
    // Verificar se já existe
    this.container = document.getElementById('veritas-notifications');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'veritas-notifications';
      this.container.className = `veritas-notifications veritas-notifications--${this.config.position}`;
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-label', 'Notificações do VeritasAI');
      this.container.setAttribute('role', 'region');
      
      // Adicionar ao body
      document.body.appendChild(this.container);
    }
  }
  
  /**
   * Configura estilos CSS inline se necessário
   */
  setupStyles() {
    const styleId = 'veritas-notifications-styles';
    
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = this.getBaseStyles();
      document.head.appendChild(style);
    }
  }
  
  /**
   * Retorna estilos CSS base
   */
  getBaseStyles() {
    return `
      .veritas-notifications {
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .veritas-notifications--top-right {
        top: 20px;
        right: 20px;
      }
      
      .veritas-notifications--top-left {
        top: 20px;
        left: 20px;
      }
      
      .veritas-notifications--bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .veritas-notifications--bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .veritas-notification {
        pointer-events: auto;
        margin-bottom: ${this.config.stackSpacing}px;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        max-width: 100%;
        word-wrap: break-word;
        transition: all ${this.config.animationDuration}ms ease;
        transform: translateX(100%);
        opacity: 0;
      }
      
      .veritas-notification.show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .veritas-notification--info {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
      }
      
      .veritas-notification--success {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
      }
      
      .veritas-notification--warning {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
      }
      
      .veritas-notification--error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
      }
      
      .veritas-notification__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .veritas-notification__title {
        font-weight: 600;
        font-size: 14px;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .veritas-notification__icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      
      .veritas-notification__close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.8;
        transition: opacity 0.2s;
        font-size: 18px;
        line-height: 1;
      }
      
      .veritas-notification__close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }
      
      .veritas-notification__message {
        font-size: 13px;
        line-height: 1.4;
        margin: 0;
        opacity: 0.95;
      }
      
      .veritas-notification__progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 8px 8px;
        transition: width linear;
      }
      
      @media (max-width: 480px) {
        .veritas-notifications {
          left: 10px !important;
          right: 10px !important;
          max-width: none;
        }
        
        .veritas-notification {
          margin-bottom: 8px;
        }
      }
    `;
  }
  
  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Listener para fechar notificações com Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.clearAll();
      }
    });
    
    // Listener para pausar auto-hide no hover
    this.container.addEventListener('mouseenter', () => {
      this.pauseAllTimers();
    });
    
    this.container.addEventListener('mouseleave', () => {
      this.resumeAllTimers();
    });
  }
  
  /**
   * Exibe uma notificação
   */
  show(type, title, message, options = {}) {
    if (!this.isInitialized) {
      console.warn('Sistema de notificações não inicializado');
      return null;
    }
    
    const config = {
      duration: options.duration ?? this.config.defaultDuration,
      persistent: options.persistent ?? false,
      actions: options.actions ?? [],
      data: options.data ?? null,
      ...options
    };
    
    const notification = this.createNotification(type, title, message, config);
    const id = this.addNotification(notification, config);
    
    // Animar entrada
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Configurar auto-hide se não for persistente
    if (!config.persistent && config.duration > 0) {
      this.setAutoHide(id, config.duration);
    }
    
    // Limitar número de notificações
    this.enforceMaxNotifications();
    
    return id;
  }
  
  /**
   * Cria elemento de notificação
   */
  createNotification(type, title, message, config) {
    const notification = document.createElement('div');
    notification.className = `veritas-notification veritas-notification--${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    
    const icon = this.getIcon(type);
    
    notification.innerHTML = `
      <div class="veritas-notification__header">
        <h4 class="veritas-notification__title">
          ${icon}
          ${this.escapeHtml(title)}
        </h4>
        <button class="veritas-notification__close" aria-label="Fechar notificação" type="button">
          ×
        </button>
      </div>
      <p class="veritas-notification__message">${this.escapeHtml(message)}</p>
      ${config.duration > 0 && !config.persistent ? '<div class="veritas-notification__progress"></div>' : ''}
    `;
    
    // Event listener para fechar
    const closeBtn = notification.querySelector('.veritas-notification__close');
    closeBtn.addEventListener('click', () => {
      const id = notification.dataset.notificationId;
      this.hide(id);
    });
    
    return notification;
  }
  
  /**
   * Retorna ícone SVG para o tipo
   */
  getIcon(type) {
    const icons = {
      info: `<svg class="veritas-notification__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>`,
      success: `<svg class="veritas-notification__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>`,
      warning: `<svg class="veritas-notification__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>`,
      error: `<svg class="veritas-notification__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>`
    };
    
    return icons[type] || icons.info;
  }
  
  /**
   * Adiciona notificação ao container
   */
  addNotification(notification, config) {
    const id = ++this.notificationId;
    notification.dataset.notificationId = id;
    
    this.notifications.set(id, {
      element: notification,
      config,
      timer: null,
      startTime: Date.now(),
      pausedTime: 0
    });
    
    this.container.appendChild(notification);
    
    return id;
  }
  
  /**
   * Configura auto-hide
   */
  setAutoHide(id, duration) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;
    
    const progressBar = notificationData.element.querySelector('.veritas-notification__progress');
    
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.transitionDuration = `${duration}ms`;
      
      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }
    
    notificationData.timer = setTimeout(() => {
      this.hide(id);
    }, duration);
  }
  
  /**
   * Oculta uma notificação
   */
  hide(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;
    
    const { element, timer } = notificationData;
    
    // Limpar timer
    if (timer) {
      clearTimeout(timer);
    }
    
    // Animar saída
    element.classList.remove('show');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
    }, this.config.animationDuration);
  }
  
  /**
   * Limpa todas as notificações
   */
  clearAll() {
    for (const id of this.notifications.keys()) {
      this.hide(id);
    }
  }
  
  /**
   * Pausa todos os timers
   */
  pauseAllTimers() {
    for (const [id, data] of this.notifications.entries()) {
      if (data.timer) {
        clearTimeout(data.timer);
        data.pausedTime = Date.now() - data.startTime;
        
        const progressBar = data.element.querySelector('.veritas-notification__progress');
        if (progressBar) {
          progressBar.style.animationPlayState = 'paused';
        }
      }
    }
  }
  
  /**
   * Resume todos os timers
   */
  resumeAllTimers() {
    for (const [id, data] of this.notifications.entries()) {
      if (data.pausedTime > 0) {
        const remainingTime = data.config.duration - data.pausedTime;
        
        if (remainingTime > 0) {
          this.setAutoHide(id, remainingTime);
        }
        
        data.pausedTime = 0;
        data.startTime = Date.now();
        
        const progressBar = data.element.querySelector('.veritas-notification__progress');
        if (progressBar) {
          progressBar.style.animationPlayState = 'running';
        }
      }
    }
  }
  
  /**
   * Limita número máximo de notificações
   */
  enforceMaxNotifications() {
    const notificationIds = Array.from(this.notifications.keys());
    
    if (notificationIds.length > this.config.maxNotifications) {
      const oldestId = notificationIds[0];
      this.hide(oldestId);
    }
  }
  
  /**
   * Escape HTML para segurança
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Métodos de conveniência
   */
  info(title, message, options = {}) {
    return this.show('info', title, message, options);
  }
  
  success(title, message, options = {}) {
    return this.show('success', title, message, options);
  }
  
  warning(title, message, options = {}) {
    return this.show('warning', title, message, options);
  }
  
  error(title, message, options = {}) {
    return this.show('error', title, message, { ...options, duration: 8000 });
  }
  
  /**
   * Atualiza configuração
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.container) {
      this.container.className = `veritas-notifications veritas-notifications--${this.config.position}`;
    }
  }
  
  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      activeNotifications: this.notifications.size,
      maxNotifications: this.config.maxNotifications,
      isInitialized: this.isInitialized
    };
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.clearAll();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    const style = document.getElementById('veritas-notifications-styles');
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    
    this.isInitialized = false;
  }
}

// Instância global
let notificationSystem = null;

/**
 * Obtém instância global do sistema de notificações
 */
export function getNotificationSystem() {
  if (!notificationSystem) {
    notificationSystem = new NotificationSystem();
  }
  return notificationSystem;
}

/**
 * Funções de conveniência globais
 */
export const notify = {
  info: (title, message, options) => getNotificationSystem().info(title, message, options),
  success: (title, message, options) => getNotificationSystem().success(title, message, options),
  warning: (title, message, options) => getNotificationSystem().warning(title, message, options),
  error: (title, message, options) => getNotificationSystem().error(title, message, options),
  clear: () => getNotificationSystem().clearAll()
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.VeritasNotifications = {
    NotificationSystem,
    getNotificationSystem,
    notify
  };
}
