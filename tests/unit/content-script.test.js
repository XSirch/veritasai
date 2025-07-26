/**
 * Testes unitários para Content Script
 * Testa detecção de texto, UI e comunicação
 */

// Mock do Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    getURL: jest.fn((path) => `chrome-extension://test/${path}`),
    lastError: null
  }
};

// Mock do DOM
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn()
});

// Importar módulos para teste
const { TextDetector } = require('../../src/content/modules/text-detector');
const { UIManager } = require('../../src/content/modules/ui-manager');
const { CommunicationManager } = require('../../src/content/modules/communication-manager');
const { EventManager } = require('../../src/content/modules/event-manager');
const { StyleManager } = require('../../src/content/modules/style-manager');

describe('Content Script Modules', () => {
  let mockConfig;
  let mockState;
  
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Mock config
    mockConfig = {
      MIN_TEXT_LENGTH: 10,
      MAX_TEXT_LENGTH: 5000,
      TOOLTIP_DELAY: 100,
      AUTO_HIDE_DELAY: 5000,
      DEBOUNCE_DELAY: 300,
      Z_INDEX_BASE: 10000
    };
    
    // Mock state
    mockState = {
      enabled: true,
      currentTooltip: null,
      currentButton: null,
      lastSelection: null,
      settings: {},
      isProcessing: false
    };
    
    // Reset Chrome API mocks
    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.onMessage.addListener.mockClear();
  });
  
  describe('TextDetector', () => {
    let textDetector;
    
    beforeEach(() => {
      textDetector = new TextDetector(mockConfig);
    });
    
    test('deve extrair texto selecionado corretamente', () => {
      const mockSelection = {
        toString: () => '  Texto de teste com espaços  \n\t',
        rangeCount: 1
      };
      
      const result = textDetector.extractSelectedText(mockSelection);
      
      expect(result).toBe('Texto de teste com espaços');
    });
    
    test('deve validar seleção corretamente', () => {
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: () => ({
          commonAncestorContainer: {
            nodeType: Node.TEXT_NODE,
            parentElement: document.createElement('p')
          }
        })
      };
      
      // Texto válido
      expect(textDetector.isValidSelection('Texto válido para teste', mockSelection)).toBe(true);
      
      // Texto muito curto
      expect(textDetector.isValidSelection('abc', mockSelection)).toBe(false);
      
      // Texto muito longo
      const longText = 'a'.repeat(6000);
      expect(textDetector.isValidSelection(longText, mockSelection)).toBe(false);
      
      // Apenas números
      expect(textDetector.isValidSelection('123456789', mockSelection)).toBe(false);
    });
    
    test('deve detectar elementos excluídos', () => {
      const scriptElement = document.createElement('script');
      const formElement = document.createElement('form');
      const editableElement = document.createElement('div');
      editableElement.contentEditable = true;
      
      expect(textDetector.isExcludedElement(scriptElement)).toBe(true);
      expect(textDetector.isExcludedElement(formElement)).toBe(true);
      expect(textDetector.isExcludedElement(editableElement)).toBe(true);
      
      const normalElement = document.createElement('p');
      expect(textDetector.isExcludedElement(normalElement)).toBe(false);
    });
    
    test('deve detectar tipos de conteúdo', () => {
      const context = { element: 'p', fullText: 'Contexto normal' };
      
      expect(textDetector.detectContentType('95% dos casos', context)).toBe('statistic');
      expect(textDetector.detectContentType('"Uma citação famosa"', context)).toBe('quote');
      expect(textDetector.detectContentType('Estudo da universidade mostra', context)).toBe('scientific');
      expect(textDetector.detectContentType('Acredito que isso é verdade', context)).toBe('opinion');
      expect(textDetector.detectContentType('Texto normal', context)).toBe('general');
    });
    
    test('deve calcular posição otimizada', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      
      const rect = {
        left: 100,
        bottom: 200,
        top: 180
      };
      
      const position = textDetector.calculateOptimalPosition(rect);
      
      expect(position.x).toBe(100);
      expect(position.y).toBe(205); // bottom + 5
    });
  });
  
  describe('UIManager', () => {
    let uiManager;
    
    beforeEach(() => {
      uiManager = new UIManager(mockConfig, mockState);
    });
    
    afterEach(() => {
      uiManager.cleanup();
    });
    
    test('deve criar botão de verificação', () => {
      const selectionData = {
        text: 'Texto de teste',
        contentType: 'general',
        position: { x: 100, y: 200 }
      };
      
      const button = uiManager.createVerifyButton(selectionData);
      
      expect(button.id).toBe('veritas-verify-button');
      expect(button.className).toBe('veritas-ui-element');
      expect(button.innerHTML).toContain('Verificar');
      expect(button.innerHTML).toContain('🛡️');
    });
    
    test('deve mostrar botão de verificação na página', () => {
      const selectionData = {
        text: 'Texto de teste',
        contentType: 'general',
        position: { x: 100, y: 200 }
      };
      
      uiManager.showVerifyButton(selectionData);
      
      const button = document.getElementById('veritas-verify-button');
      expect(button).toBeTruthy();
      expect(button.style.left).toBe('100px');
      expect(button.style.top).toBe('200px');
      expect(mockState.currentButton).toBe(button);
    });
    
    test('deve criar tooltip de loading', () => {
      const selectionData = {
        text: 'Texto de teste',
        position: { x: 100, y: 200 }
      };
      
      const tooltip = uiManager.createLoadingTooltip(selectionData);
      
      expect(tooltip.id).toBe('veritas-tooltip');
      expect(tooltip.innerHTML).toContain('Verificando informação');
      expect(tooltip.innerHTML).toContain('veritas-spinner');
    });
    
    test('deve criar tooltip de resultado', () => {
      const result = {
        classification: 'verified',
        overallConfidence: 0.85,
        evidences: [
          { source: 'google_api', score: 80 },
          { source: 'llm_analysis', score: 90 }
        ]
      };
      
      const selectionData = {
        text: 'Texto de teste',
        position: { x: 100, y: 200 }
      };
      
      const tooltip = uiManager.createResultTooltip(result, selectionData);
      
      expect(tooltip.id).toBe('veritas-tooltip');
      expect(tooltip.innerHTML).toContain('Verificado');
      expect(tooltip.innerHTML).toContain('85%');
      expect(tooltip.innerHTML).toContain('google_api');
    });
    
    test('deve esconder todos os elementos', () => {
      // Criar elementos
      const button = document.createElement('div');
      button.id = 'veritas-verify-button';
      document.body.appendChild(button);
      mockState.currentButton = button;
      
      const tooltip = document.createElement('div');
      tooltip.id = 'veritas-tooltip';
      document.body.appendChild(tooltip);
      mockState.currentTooltip = tooltip;
      
      uiManager.hideAllElements();
      
      expect(document.getElementById('veritas-verify-button')).toBeFalsy();
      expect(document.getElementById('veritas-tooltip')).toBeFalsy();
      expect(mockState.currentButton).toBeNull();
      expect(mockState.currentTooltip).toBeNull();
    });
    
    test('deve obter dados de classificação corretos', () => {
      const verifiedData = uiManager.getClassificationData('verified');
      expect(verifiedData.color).toBe('#4CAF50');
      expect(verifiedData.icon).toBe('✅');
      expect(verifiedData.label).toBe('Verificado');
      
      const disputedData = uiManager.getClassificationData('disputed');
      expect(disputedData.color).toBe('#F44336');
      expect(disputedData.icon).toBe('🚫');
      expect(disputedData.label).toBe('Contestado');
    });
  });
  
  describe('CommunicationManager', () => {
    let communicationManager;
    
    beforeEach(() => {
      communicationManager = new CommunicationManager();
    });
    
    afterEach(() => {
      communicationManager.cleanup();
    });
    
    test('deve enviar mensagem para background', async () => {
      const mockResponse = { success: true, data: 'test' };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });
      
      const result = await communicationManager.sendMessage('testAction', { test: 'data' });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'testAction',
          data: { test: 'data' }
        }),
        expect.any(Function)
      );
      expect(result).toEqual(mockResponse);
    });
    
    test('deve lidar com timeout na comunicação', async () => {
      chrome.runtime.sendMessage.mockImplementation(() => {
        // Não chamar callback para simular timeout
      });
      
      await expect(communicationManager.sendMessage('testAction'))
        .rejects.toThrow('Timeout na comunicação');
    });
    
    test('deve registrar e executar handlers de mensagem', () => {
      const mockHandler = jest.fn(() => 'result');
      communicationManager.onMessage('testAction', mockHandler);
      
      // Simular recebimento de mensagem
      const mockRequest = { action: 'testAction', data: { test: 'data' } };
      const mockSendResponse = jest.fn();
      
      // Obter o listener registrado
      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      listener(mockRequest, {}, mockSendResponse);
      
      expect(mockHandler).toHaveBeenCalledWith({ test: 'data' }, mockRequest);
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true, data: 'result' });
    });
    
    test('deve verificar se está conectado', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true });
      });
      
      const isConnected = await communicationManager.isConnected();
      expect(isConnected).toBe(true);
    });
    
    test('deve reportar erro', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true });
      });
      
      const error = new Error('Test error');
      await communicationManager.reportError(error, { context: 'test' });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'reportError',
          data: expect.objectContaining({
            error: 'Error: Test error',
            context: { context: 'test' }
          })
        }),
        expect.any(Function)
      );
    });
  });
  
  describe('StyleManager', () => {
    let styleManager;
    
    beforeEach(() => {
      styleManager = new StyleManager();
    });
    
    afterEach(() => {
      styleManager.cleanup();
    });
    
    test('deve injetar estilos na página', () => {
      styleManager.injectStyles();
      
      const styleElement = document.getElementById('veritas-ai-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement.tagName).toBe('STYLE');
      expect(styleElement.textContent).toContain('veritas-ui-element');
    });
    
    test('deve remover estilos injetados', () => {
      styleManager.injectStyles();
      expect(document.getElementById('veritas-ai-styles')).toBeTruthy();
      
      styleManager.removeStyles();
      expect(document.getElementById('veritas-ai-styles')).toBeFalsy();
    });
    
    test('deve atualizar estilos', () => {
      styleManager.injectStyles();
      const firstElement = document.getElementById('veritas-ai-styles');
      
      styleManager.updateStyles();
      const secondElement = document.getElementById('veritas-ai-styles');
      
      expect(secondElement).toBeTruthy();
      expect(secondElement).not.toBe(firstElement);
    });
    
    test('deve gerar CSS completo', () => {
      const css = styleManager.getCSS();
      
      expect(css).toContain('veritas-ui-element');
      expect(css).toContain('veritas-button');
      expect(css).toContain('veritas-tooltip');
      expect(css).toContain('@keyframes');
      expect(css).toContain('@media');
    });
  });
  
  describe('Integração dos Módulos', () => {
    let textDetector, uiManager, communicationManager, eventManager;
    
    beforeEach(() => {
      textDetector = new TextDetector(mockConfig);
      uiManager = new UIManager(mockConfig, mockState);
      communicationManager = new CommunicationManager();
      eventManager = new EventManager(textDetector, uiManager, communicationManager, mockState);
    });
    
    afterEach(() => {
      eventManager.cleanup();
      uiManager.cleanup();
      communicationManager.cleanup();
    });
    
    test('deve integrar detecção de texto com UI', () => {
      const mockSelection = {
        toString: () => 'Texto de teste válido',
        rangeCount: 1,
        getRangeAt: () => ({
          commonAncestorContainer: {
            nodeType: Node.TEXT_NODE,
            parentElement: document.createElement('p')
          },
          getBoundingClientRect: () => ({
            left: 100,
            bottom: 200,
            top: 180
          })
        })
      };
      
      window.getSelection.mockReturnValue(mockSelection);
      
      eventManager.handleTextSelection();
      
      expect(document.getElementById('veritas-verify-button')).toBeTruthy();
      expect(mockState.lastSelection).toBeTruthy();
      expect(mockState.lastSelection.text).toBe('Texto de teste válido');
    });
    
    test('deve limpar elementos quando seleção for inválida', () => {
      const mockSelection = {
        toString: () => 'abc', // Muito curto
        rangeCount: 1
      };
      
      window.getSelection.mockReturnValue(mockSelection);
      
      eventManager.handleTextSelection();
      
      expect(document.getElementById('veritas-verify-button')).toBeFalsy();
    });
  });
});
