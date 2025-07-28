/**
 * Testes Unitários - Sistema de Notificações
 * Testa NotificationSystem e funções de conveniência
 */

// Mock do módulo de notificações
const mockNotificationSystem = {
  NotificationSystem: jest.fn(),
  getNotificationSystem: jest.fn(),
  notify: {
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    clear: jest.fn()
  }
};

// Mock do DOM
global.document = {
  createElement: jest.fn((tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      dataset: {},
      parentNode: null,
      children: [],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(function(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      }),
      removeChild: jest.fn(function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
          child.parentNode = null;
        }
        return child;
      }),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn()
      }
    };
    return element;
  }),
  getElementById: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.window = {
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
  setTimeout: jest.fn((cb, delay) => setTimeout(cb, delay)),
  clearTimeout: jest.fn(clearTimeout)
};

// Classe NotificationSystem simplificada para teste
class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.config = {
      maxNotifications: 5,
      defaultDuration: 5000,
      position: 'top-right'
    };
    this.notificationId = 0;
    this.isInitialized = false;
    this.init();
  }

  init() {
    this.createContainer();
    this.isInitialized = true;
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'veritas-notifications';
    document.body.appendChild(this.container);
  }

  show(type, title, message, options = {}) {
    if (!this.isInitialized) return null;

    const id = ++this.notificationId;
    const notification = document.createElement('div');
    notification.className = `veritas-notification veritas-notification--${type}`;
    notification.innerHTML = `<h4>${title}</h4><p>${message}</p>`;

    this.notifications.set(id, {
      element: notification,
      config: options,
      timer: null
    });

    this.container.appendChild(notification);

    if (!options.persistent && options.duration !== 0) {
      const duration = options.duration || this.config.defaultDuration;
      const timer = setTimeout(() => this.hide(id), duration);
      this.notifications.get(id).timer = timer;
    }

    return id;
  }

  hide(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;

    if (notificationData.timer) {
      clearTimeout(notificationData.timer);
    }

    if (notificationData.element.parentNode) {
      notificationData.element.parentNode.removeChild(notificationData.element);
    }

    this.notifications.delete(id);
  }

  clearAll() {
    for (const id of this.notifications.keys()) {
      this.hide(id);
    }
  }

  info(title, message, options) {
    return this.show('info', title, message, options);
  }

  success(title, message, options) {
    return this.show('success', title, message, options);
  }

  warning(title, message, options) {
    return this.show('warning', title, message, options);
  }

  error(title, message, options) {
    return this.show('error', title, message, { ...options, duration: 8000 });
  }

  getStats() {
    return {
      activeNotifications: this.notifications.size,
      maxNotifications: this.config.maxNotifications,
      isInitialized: this.isInitialized
    };
  }

  destroy() {
    this.clearAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.isInitialized = false;
  }
}

describe('NotificationSystem', () => {
  let notificationSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Reset DOM mocks
    document.getElementById.mockReturnValue(null);

    notificationSystem = new NotificationSystem();
  });
  
  afterEach(() => {
    if (notificationSystem) {
      notificationSystem.destroy();
    }
    jest.useRealTimers();
  });
  
  describe('Inicialização', () => {
    test('deve inicializar corretamente', () => {
      expect(notificationSystem.isInitialized).toBe(true);
      expect(notificationSystem.container).toBeDefined();
      expect(notificationSystem.notifications).toBeInstanceOf(Map);
      expect(notificationSystem.notifications.size).toBe(0);
    });
    
    test('deve criar container com atributos corretos', () => {
      const container = notificationSystem.container;
      
      expect(container.id).toBe('veritas-notifications');
      expect(container.className).toContain('veritas-notifications');
      expect(container.className).toContain('top-right');
      expect(document.body.appendChild).toHaveBeenCalledWith(container);
    });
    
    test('deve reutilizar container existente', () => {
      const existingContainer = document.createElement('div');
      existingContainer.id = 'veritas-notifications';
      document.getElementById.mockReturnValue(existingContainer);
      
      const newSystem = new NotificationSystem();
      
      expect(newSystem.container).toBe(existingContainer);
    });
    
    test('deve configurar estilos CSS', () => {
      expect(document.head.appendChild).toHaveBeenCalled();
      
      const styleCall = document.head.appendChild.mock.calls.find(call => 
        call[0].tagName === 'STYLE'
      );
      expect(styleCall).toBeDefined();
    });
  });
  
  describe('Exibição de Notificações', () => {
    test('deve exibir notificação info', () => {
      const id = notificationSystem.info('Título', 'Mensagem de teste');
      
      expect(id).toBeDefined();
      expect(notificationSystem.notifications.has(id)).toBe(true);
      expect(notificationSystem.container.appendChild).toHaveBeenCalled();
    });
    
    test('deve exibir notificação success', () => {
      const id = notificationSystem.success('Sucesso', 'Operação concluída');
      
      expect(id).toBeDefined();
      expect(notificationSystem.notifications.has(id)).toBe(true);
    });
    
    test('deve exibir notificação warning', () => {
      const id = notificationSystem.warning('Atenção', 'Cuidado com isso');
      
      expect(id).toBeDefined();
      expect(notificationSystem.notifications.has(id)).toBe(true);
    });
    
    test('deve exibir notificação error', () => {
      const id = notificationSystem.error('Erro', 'Algo deu errado');
      
      expect(id).toBeDefined();
      expect(notificationSystem.notifications.has(id)).toBe(true);
    });
    
    test('deve criar elemento com estrutura correta', () => {
      notificationSystem.info('Título', 'Mensagem');
      
      const createElement = document.createElement;
      const notificationCall = createElement.mock.calls.find(call => 
        call[0] === 'div'
      );
      
      expect(notificationCall).toBeDefined();
    });
    
    test('deve configurar auto-hide por padrão', () => {
      const id = notificationSystem.info('Título', 'Mensagem');
      const notificationData = notificationSystem.notifications.get(id);
      
      expect(notificationData.timer).toBeDefined();
    });
    
    test('deve não configurar auto-hide para notificações persistentes', () => {
      const id = notificationSystem.info('Título', 'Mensagem', { persistent: true });
      const notificationData = notificationSystem.notifications.get(id);
      
      expect(notificationData.timer).toBeNull();
    });
  });
  
  describe('Gerenciamento de Notificações', () => {
    test('deve ocultar notificação por ID', () => {
      const id = notificationSystem.info('Título', 'Mensagem');
      
      notificationSystem.hide(id);
      
      // Verificar se timer foi limpo
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData).toBeDefined(); // Ainda existe durante animação
      
      // Simular fim da animação
      jest.advanceTimersByTime(300);
      
      expect(notificationSystem.notifications.has(id)).toBe(false);
    });
    
    test('deve limpar todas as notificações', () => {
      const id1 = notificationSystem.info('Título 1', 'Mensagem 1');
      const id2 = notificationSystem.success('Título 2', 'Mensagem 2');
      const id3 = notificationSystem.error('Título 3', 'Mensagem 3');
      
      expect(notificationSystem.notifications.size).toBe(3);
      
      notificationSystem.clearAll();
      
      // Simular fim das animações
      jest.advanceTimersByTime(300);
      
      expect(notificationSystem.notifications.size).toBe(0);
    });
    
    test('deve limitar número máximo de notificações', () => {
      notificationSystem.config.maxNotifications = 3;
      
      const id1 = notificationSystem.info('1', 'Mensagem 1');
      const id2 = notificationSystem.info('2', 'Mensagem 2');
      const id3 = notificationSystem.info('3', 'Mensagem 3');
      const id4 = notificationSystem.info('4', 'Mensagem 4'); // Deve remover a primeira
      
      expect(notificationSystem.notifications.size).toBe(3);
      expect(notificationSystem.notifications.has(id1)).toBe(false);
      expect(notificationSystem.notifications.has(id4)).toBe(true);
    });
    
    test('deve auto-hide após duração especificada', () => {
      const id = notificationSystem.info('Título', 'Mensagem', { duration: 1000 });
      
      expect(notificationSystem.notifications.has(id)).toBe(true);
      
      // Avançar tempo
      jest.advanceTimersByTime(1000);
      
      // Notificação deve estar sendo removida
      jest.advanceTimersByTime(300); // Tempo da animação
      
      expect(notificationSystem.notifications.has(id)).toBe(false);
    });
  });
  
  describe('Controle de Timers', () => {
    test('deve pausar timers no hover', () => {
      const id = notificationSystem.info('Título', 'Mensagem', { duration: 1000 });
      
      // Simular hover
      notificationSystem.pauseAllTimers();
      
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData.pausedTime).toBeGreaterThan(0);
    });
    
    test('deve resumir timers após hover', () => {
      const id = notificationSystem.info('Título', 'Mensagem', { duration: 1000 });
      
      // Simular hover e unhover
      notificationSystem.pauseAllTimers();
      notificationSystem.resumeAllTimers();
      
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData.timer).toBeDefined();
    });
  });
  
  describe('Configuração', () => {
    test('deve atualizar configuração', () => {
      const newConfig = {
        position: 'bottom-left',
        maxNotifications: 10,
        defaultDuration: 3000
      };
      
      notificationSystem.updateConfig(newConfig);
      
      expect(notificationSystem.config.position).toBe('bottom-left');
      expect(notificationSystem.config.maxNotifications).toBe(10);
      expect(notificationSystem.config.defaultDuration).toBe(3000);
    });
    
    test('deve atualizar classe do container ao mudar posição', () => {
      notificationSystem.updateConfig({ position: 'bottom-left' });
      
      expect(notificationSystem.container.className).toContain('bottom-left');
    });
  });
  
  describe('Segurança', () => {
    test('deve escapar HTML no título', () => {
      const maliciousTitle = '<script>alert("xss")</script>';
      notificationSystem.info(maliciousTitle, 'Mensagem');
      
      // Verificar se HTML foi escapado
      const escaped = notificationSystem.escapeHtml(maliciousTitle);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
    
    test('deve escapar HTML na mensagem', () => {
      const maliciousMessage = '<img src="x" onerror="alert(1)">';
      notificationSystem.info('Título', maliciousMessage);
      
      const escaped = notificationSystem.escapeHtml(maliciousMessage);
      expect(escaped).not.toContain('onerror=');
    });
  });
  
  describe('Acessibilidade', () => {
    test('deve configurar atributos ARIA corretos', () => {
      const container = notificationSystem.container;
      
      expect(container.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(container.setAttribute).toHaveBeenCalledWith('aria-label', 'Notificações do VeritasAI');
      expect(container.setAttribute).toHaveBeenCalledWith('role', 'region');
    });
    
    test('deve usar aria-live assertive para erros', () => {
      notificationSystem.error('Erro', 'Mensagem de erro');
      
      // Verificar se elemento foi criado com aria-live assertive
      const createElement = document.createElement;
      const divCall = createElement.mock.calls.find(call => call[0] === 'div');
      expect(divCall).toBeDefined();
    });
  });
  
  describe('Estatísticas', () => {
    test('deve retornar estatísticas corretas', () => {
      notificationSystem.info('1', 'Mensagem 1');
      notificationSystem.success('2', 'Mensagem 2');
      
      const stats = notificationSystem.getStats();
      
      expect(stats.activeNotifications).toBe(2);
      expect(stats.maxNotifications).toBe(notificationSystem.config.maxNotifications);
      expect(stats.isInitialized).toBe(true);
    });
  });
  
  describe('Cleanup', () => {
    test('deve limpar recursos ao destruir', () => {
      notificationSystem.info('Título', 'Mensagem');
      
      notificationSystem.destroy();
      
      expect(notificationSystem.isInitialized).toBe(false);
      expect(notificationSystem.notifications.size).toBe(0);
    });
  });
});

describe('Funções de Conveniência', () => {
  test('deve criar sistema de notificações funcional', () => {
    const system = new NotificationSystem();

    expect(system.isInitialized).toBe(true);
    expect(system.container).toBeDefined();
    expect(system.notifications.size).toBe(0);
  });

  test('deve ter métodos de conveniência funcionais', () => {
    const system = new NotificationSystem();

    expect(typeof system.info).toBe('function');
    expect(typeof system.success).toBe('function');
    expect(typeof system.warning).toBe('function');
    expect(typeof system.error).toBe('function');
    expect(typeof system.clearAll).toBe('function');
  });
});
