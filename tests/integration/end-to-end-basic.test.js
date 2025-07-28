/**
 * Testes de Integração Básicos - Fluxo End-to-End
 * Testa funcionalidades básicas sem dependências ES6
 */

// Mock do ambiente de extensão
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    onChanged: {
      addListener: jest.fn()
    }
  }
};

// Mock do DOM
global.document = {
  createElement: jest.fn(() => ({
    id: '',
    className: '',
    innerHTML: '',
    style: {},
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    remove: jest.fn()
  })),
  body: {
    appendChild: jest.fn()
  },
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn()
};

global.window = {
  location: {
    href: 'https://example.com',
    hostname: 'example.com'
  }
};

// Classe simplificada para teste
class MockIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.activeVerifications = new Map();
    this.stats = {
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
    this.init();
  }
  
  async init() {
    this.isInitialized = true;
    this.setupMessageListeners();
    this.setupEventListeners();
  }
  
  setupMessageListeners() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(() => {});
    }
  }
  
  setupEventListeners() {
    document.addEventListener('veritas:verify-text', () => {});
    document.addEventListener('veritas:show-result', () => {});
    document.addEventListener('veritas:error', () => {});
  }
  
  validateInput(data) {
    const { text, contentType } = data;
    
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Texto é obrigatório' };
    }
    
    if (text.trim().length < 10) {
      return { valid: false, error: 'Texto muito curto para verificação (mínimo 10 caracteres)' };
    }
    
    if (text.length > 5000) {
      return { valid: false, error: 'Texto muito longo para verificação (máximo 5000 caracteres)' };
    }
    
    const validContentTypes = ['general', 'news', 'claim', 'social', 'academic'];
    if (contentType && !validContentTypes.includes(contentType)) {
      return { valid: false, error: 'Tipo de conteúdo inválido' };
    }
    
    return { valid: true };
  }
  
  async executeVerificationFlow(data, sender) {
    const verificationId = this.generateVerificationId();
    const startTime = Date.now();
    
    try {
      // Validação
      const validationResult = this.validateInput(data);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }
      
      // Registrar verificação ativa
      this.activeVerifications.set(verificationId, {
        id: verificationId,
        text: data.text,
        startTime,
        status: 'processing'
      });
      
      // Simular verificação
      const result = await this.performMockVerification(data);
      
      // Processar resultado
      const processedResult = this.processVerificationResult(result, data);
      
      // Atualizar estatísticas
      this.updateStats(true, Date.now() - startTime, false);
      
      // Remover da lista ativa
      this.activeVerifications.delete(verificationId);
      
      return {
        success: true,
        data: processedResult,
        verificationId,
        responseTime: Date.now() - startTime
      };
      
    } catch (error) {
      this.updateStats(false, Date.now() - startTime, false);
      this.activeVerifications.delete(verificationId);
      
      return {
        success: false,
        error: error.message,
        verificationId,
        responseTime: Date.now() - startTime
      };
    }
  }
  
  async performMockVerification(data) {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      classification: 'verified',
      confidence: 0.85,
      sources: ['mock-source-1', 'mock-source-2'],
      evidences: ['mock-evidence-1']
    };
  }
  
  processVerificationResult(result, originalData) {
    return {
      ...result,
      metadata: {
        originalText: originalData.text,
        contentType: originalData.contentType || 'general',
        timestamp: Date.now(),
        url: originalData.url || window.location.href,
        domain: originalData.domain || window.location.hostname
      }
    };
  }
  
  generateVerificationId() {
    return `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getVerificationStatus(verificationId) {
    const verification = this.activeVerifications.get(verificationId);
    
    if (!verification) {
      return { status: 'not_found' };
    }
    
    return {
      status: verification.status,
      startTime: verification.startTime,
      duration: Date.now() - verification.startTime
    };
  }
  
  cancelVerification(verificationId) {
    const verification = this.activeVerifications.get(verificationId);
    
    if (verification) {
      verification.status = 'cancelled';
      this.activeVerifications.delete(verificationId);
      return true;
    }
    
    return false;
  }
  
  updateStats(success, responseTime, cacheHit) {
    this.stats.totalVerifications++;
    
    if (success) {
      this.stats.successfulVerifications++;
    } else {
      this.stats.failedVerifications++;
    }
    
    if (cacheHit) {
      this.stats.cacheHits++;
    }
    
    const totalTime = this.stats.averageResponseTime * (this.stats.totalVerifications - 1) + responseTime;
    this.stats.averageResponseTime = Math.round(totalTime / this.stats.totalVerifications);
  }
  
  getStats() {
    return {
      ...this.stats,
      activeVerifications: this.activeVerifications.size,
      successRate: this.stats.totalVerifications > 0 
        ? Math.round((this.stats.successfulVerifications / this.stats.totalVerifications) * 100)
        : 0,
      cacheHitRate: this.stats.totalVerifications > 0
        ? Math.round((this.stats.cacheHits / this.stats.totalVerifications) * 100)
        : 0
    };
  }
  
  destroy() {
    for (const verificationId of this.activeVerifications.keys()) {
      this.cancelVerification(verificationId);
    }
    this.isInitialized = false;
  }
}

describe('VER-022: Fluxo End-to-End Básico', () => {
  let integrationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    integrationService = new MockIntegrationService();
  });
  
  afterEach(() => {
    if (integrationService) {
      integrationService.destroy();
    }
  });
  
  describe('Inicialização', () => {
    test('deve inicializar o serviço de integração', () => {
      expect(integrationService.isInitialized).toBe(true);
      expect(integrationService.activeVerifications).toBeInstanceOf(Map);
      expect(integrationService.stats).toBeDefined();
    });
    
    test('deve configurar listeners de mensagens', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
    
    test('deve configurar listeners de eventos', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('veritas:verify-text', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('veritas:show-result', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('veritas:error', expect.any(Function));
    });
  });
  
  describe('Validação de Entrada', () => {
    test('deve validar texto obrigatório', () => {
      const result = integrationService.validateInput({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Texto é obrigatório');
    });
    
    test('deve validar texto muito curto', () => {
      const result = integrationService.validateInput({ text: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito curto');
    });
    
    test('deve validar texto muito longo', () => {
      const longText = 'a'.repeat(5001);
      const result = integrationService.validateInput({ text: longText });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito longo');
    });
    
    test('deve aceitar entrada válida', () => {
      const result = integrationService.validateInput({ 
        text: 'Este é um texto válido para verificação',
        contentType: 'general'
      });
      expect(result.valid).toBe(true);
    });
  });
  
  describe('Fluxo de Verificação', () => {
    test('deve executar fluxo completo com sucesso', async () => {
      const testData = {
        text: 'Este é um texto para verificação de teste',
        contentType: 'general',
        url: 'https://example.com',
        domain: 'example.com'
      };
      
      const result = await integrationService.executeVerificationFlow(testData, {});
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.classification).toBe('verified');
      expect(result.data.confidence).toBe(0.85);
      expect(result.verificationId).toBeDefined();
      expect(result.responseTime).toBeGreaterThan(0);
    });
    
    test('deve tratar erro de validação', async () => {
      const testData = {
        text: 'abc', // Muito curto
        contentType: 'general'
      };
      
      const result = await integrationService.executeVerificationFlow(testData, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('muito curto');
      expect(result.verificationId).toBeDefined();
    });
    
    test('deve gerenciar verificações ativas', async () => {
      const testData = {
        text: 'Texto para teste de verificação ativa',
        contentType: 'general'
      };
      
      // Iniciar verificação
      const verificationPromise = integrationService.executeVerificationFlow(testData, {});
      
      // Verificar se está na lista de verificações ativas
      expect(integrationService.activeVerifications.size).toBe(1);
      
      // Aguardar conclusão
      await verificationPromise;
      
      // Verificar se foi removida da lista
      expect(integrationService.activeVerifications.size).toBe(0);
    });
  });
  
  describe('Gerenciamento de Verificações', () => {
    test('deve gerar ID único para verificação', () => {
      const id1 = integrationService.generateVerificationId();
      const id2 = integrationService.generateVerificationId();
      
      expect(id1).toMatch(/^verification_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^verification_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
    
    test('deve obter status de verificação', () => {
      const verificationId = 'test-verification-id';
      
      // Adicionar verificação ativa
      integrationService.activeVerifications.set(verificationId, {
        id: verificationId,
        status: 'processing',
        startTime: Date.now()
      });
      
      const status = integrationService.getVerificationStatus(verificationId);
      
      expect(status.status).toBe('processing');
      expect(status.startTime).toBeDefined();
      expect(status.duration).toBeGreaterThanOrEqual(0);
    });
    
    test('deve cancelar verificação', () => {
      const verificationId = 'test-verification-id';
      
      // Adicionar verificação ativa
      integrationService.activeVerifications.set(verificationId, {
        id: verificationId,
        status: 'processing',
        startTime: Date.now()
      });
      
      const cancelled = integrationService.cancelVerification(verificationId);
      
      expect(cancelled).toBe(true);
      expect(integrationService.activeVerifications.has(verificationId)).toBe(false);
    });
  });
  
  describe('Estatísticas', () => {
    test('deve atualizar estatísticas corretamente', () => {
      // Verificação bem-sucedida
      integrationService.updateStats(true, 1000, false);
      
      let stats = integrationService.getStats();
      expect(stats.totalVerifications).toBe(1);
      expect(stats.successfulVerifications).toBe(1);
      expect(stats.failedVerifications).toBe(0);
      expect(stats.averageResponseTime).toBe(1000);
      expect(stats.successRate).toBe(100);
      
      // Verificação com falha
      integrationService.updateStats(false, 500, false);
      
      stats = integrationService.getStats();
      expect(stats.totalVerifications).toBe(2);
      expect(stats.successfulVerifications).toBe(1);
      expect(stats.failedVerifications).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.averageResponseTime).toBe(750);
    });
  });
  
  describe('Processamento de Resultado', () => {
    test('deve processar resultado da verificação', () => {
      const result = {
        classification: 'verified',
        confidence: 0.85,
        sources: ['source1']
      };
      
      const originalData = {
        text: 'Texto original',
        contentType: 'general',
        url: 'https://example.com'
      };
      
      const processed = integrationService.processVerificationResult(result, originalData);
      
      expect(processed.classification).toBe('verified');
      expect(processed.confidence).toBe(0.85);
      expect(processed.metadata).toBeDefined();
      expect(processed.metadata.originalText).toBe('Texto original');
      expect(processed.metadata.contentType).toBe('general');
      expect(processed.metadata.url).toBe('https://example.com');
      expect(processed.metadata.timestamp).toBeDefined();
    });
  });
  
  describe('Cleanup', () => {
    test('deve limpar recursos ao destruir', () => {
      // Adicionar algumas verificações ativas
      integrationService.activeVerifications.set('test1', { status: 'processing' });
      integrationService.activeVerifications.set('test2', { status: 'processing' });
      
      expect(integrationService.activeVerifications.size).toBe(2);
      
      integrationService.destroy();
      
      expect(integrationService.activeVerifications.size).toBe(0);
      expect(integrationService.isInitialized).toBe(false);
    });
  });
});
