/**
 * Testes de Integração - Fluxo End-to-End
 * Testa o fluxo completo de verificação do VeritasAI
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

// Importar módulos
import { IntegrationService } from '../../src/services/integration-service.js';

describe('VER-022: Fluxo End-to-End', () => {
  let integrationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    integrationService = new IntegrationService();
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
    
    test('deve validar tipo de conteúdo inválido', () => {
      const result = integrationService.validateInput({ 
        text: 'Texto válido para teste',
        contentType: 'invalid-type'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de conteúdo inválido');
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
      // Mock da resposta do background
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            classification: 'verified',
            confidence: 0.85,
            sources: ['source1', 'source2'],
            evidences: ['evidence1', 'evidence2']
          }
        });
      });
      
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
    
    test('deve tratar erro na verificação', async () => {
      // Mock de erro do background
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Erro de API'
        });
      });
      
      const testData = {
        text: 'Texto para teste de erro',
        contentType: 'general'
      };
      
      const result = await integrationService.executeVerificationFlow(testData, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro de API');
      expect(result.verificationId).toBeDefined();
    });
    
    test('deve gerenciar verificações ativas', async () => {
      // Mock de resposta lenta
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        setTimeout(() => {
          callback({
            success: true,
            data: { classification: 'verified', confidence: 0.8 }
          });
        }, 100);
      });
      
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
      expect(stats.cacheHits).toBe(0);
      expect(stats.averageResponseTime).toBe(1000);
      expect(stats.successRate).toBe(100);
      
      // Verificação com falha
      integrationService.updateStats(false, 500, false);
      
      stats = integrationService.getStats();
      expect(stats.totalVerifications).toBe(2);
      expect(stats.successfulVerifications).toBe(1);
      expect(stats.failedVerifications).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.averageResponseTime).toBe(750); // (1000 + 500) / 2
      
      // Verificação com cache hit
      integrationService.updateStats(true, 100, true);
      
      stats = integrationService.getStats();
      expect(stats.totalVerifications).toBe(3);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheHitRate).toBe(33); // 1/3 * 100
    });
  });
  
  describe('Manipulação de Mensagens', () => {
    test('deve processar mensagem verifyText', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: { classification: 'verified', confidence: 0.9 }
        });
      });
      
      const request = {
        action: 'verifyText',
        data: {
          text: 'Texto para teste de mensagem',
          contentType: 'general'
        }
      };
      
      const mockSendResponse = jest.fn();
      
      await integrationService.handleMessage(request, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            classification: 'verified',
            confidence: 0.9
          })
        })
      );
    });
    
    test('deve processar mensagem getStats', async () => {
      const request = {
        action: 'getStats',
        data: {}
      };
      
      const mockSendResponse = jest.fn();
      
      await integrationService.handleMessage(request, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalVerifications: expect.any(Number),
            successfulVerifications: expect.any(Number),
            failedVerifications: expect.any(Number)
          })
        })
      );
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

describe('Integração com Notificações', () => {
  let integrationService;
  
  beforeEach(() => {
    integrationService = new IntegrationService();
  });
  
  afterEach(() => {
    integrationService.destroy();
  });
  
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
