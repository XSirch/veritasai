/**
 * Testes unitários para o Background Script
 * Testa funcionalidades do service worker da extensão
 */

describe('Background Script', () => {
  let backgroundScript;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    if (global.resetChromeMocks) {
      global.resetChromeMocks();
    }
    
    // Mock console para capturar logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Simular carregamento do background script
    // Como é um service worker, vamos testar as funções individualmente
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Inicialização', () => {
    test('deve configurar listeners na instalação', () => {
      // Simular evento de instalação
      const mockDetails = { reason: 'install' };
      
      // Verificar se os listeners foram configurados
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(chrome.contextMenus.create).toHaveBeenCalled();
      expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
    });
    
    test('deve criar configurações padrão na primeira instalação', async () => {
      const mockDetails = { reason: 'install' };
      
      // Mock do storage
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      // Simular primeira instalação
      const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      await installListener(mockDetails);
      
      // Verificar se as configurações padrão foram salvas
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            enabled: true,
            autoCheck: true,
            showTooltips: true,
            apiKeys: expect.any(Object),
            cache: expect.any(Object)
          })
        }),
        expect.any(Function)
      );
    });
    
    test('deve logar atualização quando extensão for atualizada', async () => {
      const mockDetails = { reason: 'update' };
      
      const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
      await installListener(mockDetails);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Extensão atualizada')
      );
    });
  });
  
  describe('Comunicação com Content Scripts', () => {
    test('deve responder a solicitação de verificação de texto', async () => {
      const mockRequest = {
        action: 'verifyText',
        data: { text: 'Texto para verificar' }
      };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      // Simular listener de mensagem
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(mockRequest, mockSender, mockSendResponse);
      
      // Deve retornar true para resposta assíncrona
      expect(result).toBe(true);
      
      // Aguardar processamento assíncrono
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verificar resposta
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          text: 'Texto para verificar',
          classification: expect.any(String),
          confidence: expect.any(Number),
          timestamp: expect.any(Number)
        })
      });
    });
    
    test('deve responder a solicitação de configurações', async () => {
      const mockRequest = { action: 'getSettings' };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      // Mock do storage
      const mockSettings = { enabled: true, autoCheck: true };
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({ settings: mockSettings });
      });
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(mockRequest, mockSender, mockSendResponse);
      
      expect(result).toBe(true);
      
      // Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: mockSettings
      });
    });
    
    test('deve atualizar configurações', async () => {
      const mockRequest = {
        action: 'updateSettings',
        data: { enabled: false, autoCheck: false }
      };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(mockRequest, mockSender, mockSendResponse);
      
      expect(result).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        mockRequest.data,
        expect.any(Function)
      );
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });
    
    test('deve responder com erro para ação não reconhecida', async () => {
      const mockRequest = { action: 'unknown-action' };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(mockRequest, mockSender, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        error: 'Ação não reconhecida'
      });
    });
  });
  
  describe('Context Menu', () => {
    test('deve criar item do context menu na instalação', () => {
      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'veritas-verify',
        title: 'Verificar com VeritasAI',
        contexts: ['selection']
      });
    });
    
    test('deve processar clique no context menu', async () => {
      const mockInfo = {
        menuItemId: 'veritas-verify',
        selectionText: 'Texto selecionado'
      };
      const mockTab = { id: 1 };
      
      chrome.tabs.sendMessage.mockImplementation(() => Promise.resolve());
      
      const clickListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      await clickListener(mockInfo, mockTab);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        mockTab.id,
        {
          action: 'verifySelectedText',
          text: 'Texto selecionado'
        }
      );
    });
    
    test('não deve processar clique sem texto selecionado', async () => {
      const mockInfo = {
        menuItemId: 'veritas-verify',
        selectionText: ''
      };
      const mockTab = { id: 1 };
      
      const clickListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      await clickListener(mockInfo, mockTab);
      
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });
  
  describe('Comandos de Teclado', () => {
    test('deve processar comando de verificação de seleção', async () => {
      const mockCommand = 'verify-selection';
      
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });
      chrome.tabs.sendMessage.mockImplementation(() => Promise.resolve());
      
      const commandListener = chrome.commands.onCommand.addListener.mock.calls[0][0];
      await commandListener(mockCommand);
      
      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'verifySelection' }
      );
    });
    
    test('deve processar comando de toggle da extensão', async () => {
      const mockCommand = 'toggle-extension';
      
      // Mock configurações atuais
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({ settings: { enabled: true } });
      });
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 1 }, { id: 2 }]);
      });
      chrome.tabs.sendMessage.mockImplementation(() => Promise.resolve());
      
      const commandListener = chrome.commands.onCommand.addListener.mock.calls[0][0];
      await commandListener(mockCommand);
      
      // Aguardar processamento assíncrono
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            enabled: false // Deve inverter o estado
          })
        }),
        expect.any(Function)
      );
    });
  });
  
  describe('Tratamento de Erros', () => {
    test('deve tratar erro na verificação de texto', async () => {
      const mockRequest = {
        action: 'verifyText',
        data: { text: null } // Dados inválidos
      };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(mockRequest, mockSender, mockSendResponse);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String)
      });
    });
    
    test('deve logar erros no console', async () => {
      const mockRequest = {
        action: 'verifyText',
        data: { text: null }
      };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(mockRequest, mockSender, mockSendResponse);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(console.error).toHaveBeenCalledWith(
        'Erro na verificação:',
        expect.any(Error)
      );
    });
  });
});
