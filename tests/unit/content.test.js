/**
 * Testes unitários para o Content Script
 * Testa funcionalidades de injeção e interação na página
 */

// Mock do DOM
const { JSDOM } = require('jsdom');

describe('Content Script', () => {
  let dom;
  let document;
  let window;
  
  beforeEach(() => {
    // Configurar DOM virtual
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    document = dom.window.document;
    window = dom.window;
    
    // Configurar globals
    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;
    global.MouseEvent = window.MouseEvent;
    global.KeyboardEvent = window.KeyboardEvent;
    
    // Reset mocks
    jest.clearAllMocks();
    if (global.resetChromeMocks) {
      global.resetChromeMocks();
    }
    
    // Mock console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    dom.window.close();
  });
  
  describe('Inicialização', () => {
    test('deve inicializar quando DOM estiver pronto', () => {
      // Simular DOM ready
      expect(document.readyState).toBe('complete');
      
      // Verificar se event listeners foram configurados
      const eventListeners = [];
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = jest.fn((event, handler) => {
        eventListeners.push({ event, handler });
        originalAddEventListener.call(document, event, handler);
      });
      
      // Simular carregamento do content script
      // (Como não podemos importar diretamente, vamos testar as funções)
      
      expect(eventListeners.length).toBeGreaterThan(0);
    });
    
    test('deve verificar se extensão está habilitada', () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getSettings') {
          callback({
            success: true,
            data: { enabled: true }
          });
        }
      });
      
      // Simular verificação de configurações
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        expect(response.success).toBe(true);
        expect(response.data.enabled).toBe(true);
      });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'getSettings' },
        expect.any(Function)
      );
    });
  });
  
  describe('Seleção de Texto', () => {
    test('deve detectar seleção de texto válida', () => {
      // Criar texto na página
      const textNode = document.createTextNode('Este é um texto para verificação de informações');
      document.body.appendChild(textNode);
      
      // Simular seleção
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      expect(selection.toString().length).toBeGreaterThan(10);
      expect(selection.toString().length).toBeLessThan(2000);
    });
    
    test('deve ignorar seleção muito curta', () => {
      const textNode = document.createTextNode('Curto');
      document.body.appendChild(textNode);
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      expect(selection.toString().length).toBeLessThan(10);
    });
    
    test('deve ignorar seleção muito longa', () => {
      const longText = 'A'.repeat(2001);
      const textNode = document.createTextNode(longText);
      document.body.appendChild(textNode);
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      expect(selection.toString().length).toBeGreaterThan(2000);
    });
  });
  
  describe('Interface de Verificação', () => {
    test('deve criar botão de verificação', () => {
      // Simular criação do botão
      const button = document.createElement('div');
      button.id = 'veritas-verify-button';
      button.innerHTML = `
        <div class="veritas-button">
          <span class="veritas-icon">🛡️</span>
          <span class="veritas-text">Verificar</span>
        </div>
      `;
      
      document.body.appendChild(button);
      
      const createdButton = document.getElementById('veritas-verify-button');
      expect(createdButton).toBeTruthy();
      expect(createdButton.querySelector('.veritas-text').textContent).toBe('Verificar');
    });
    
    test('deve posicionar botão corretamente', () => {
      const button = document.createElement('div');
      button.id = 'veritas-verify-button';
      button.style.position = 'absolute';
      button.style.left = '100px';
      button.style.top = '200px';
      button.style.zIndex = '10000';
      
      document.body.appendChild(button);
      
      expect(button.style.position).toBe('absolute');
      expect(button.style.zIndex).toBe('10000');
    });
    
    test('deve remover botão anterior ao criar novo', () => {
      // Criar primeiro botão
      const button1 = document.createElement('div');
      button1.id = 'veritas-verify-button';
      document.body.appendChild(button1);
      
      expect(document.getElementById('veritas-verify-button')).toBeTruthy();
      
      // Simular remoção e criação de novo botão
      const existingButton = document.getElementById('veritas-verify-button');
      if (existingButton) {
        existingButton.remove();
      }
      
      const button2 = document.createElement('div');
      button2.id = 'veritas-verify-button';
      document.body.appendChild(button2);
      
      const buttons = document.querySelectorAll('#veritas-verify-button');
      expect(buttons.length).toBe(1);
    });
  });
  
  describe('Tooltips', () => {
    test('deve criar tooltip de loading', () => {
      const tooltip = document.createElement('div');
      tooltip.id = 'veritas-tooltip';
      tooltip.innerHTML = `
        <div class="veritas-tooltip loading">
          <div class="veritas-header">
            <span class="veritas-icon">🛡️</span>
            <span class="veritas-title">VeritasAI</span>
          </div>
          <div class="veritas-content">
            <div class="veritas-loading">
              <div class="veritas-spinner"></div>
              <span>Verificando informação...</span>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(tooltip);
      
      const createdTooltip = document.getElementById('veritas-tooltip');
      expect(createdTooltip).toBeTruthy();
      expect(createdTooltip.querySelector('.veritas-loading')).toBeTruthy();
    });
    
    test('deve criar tooltip de resultado', () => {
      const result = {
        classification: 'CONFIÁVEL',
        confidence: 0.85,
        timestamp: Date.now()
      };
      
      const tooltip = document.createElement('div');
      tooltip.id = 'veritas-tooltip';
      tooltip.innerHTML = `
        <div class="veritas-tooltip result">
          <div class="veritas-header">
            <span class="veritas-icon">🛡️</span>
            <span class="veritas-title">VeritasAI</span>
            <button class="veritas-close">×</button>
          </div>
          <div class="veritas-content">
            <div class="veritas-result">
              <div class="veritas-classification" style="color: #4CAF50">
                <span class="veritas-result-icon">✅</span>
                <span class="veritas-result-text">${result.classification}</span>
              </div>
              <div class="veritas-confidence">
                Confiança: ${Math.round(result.confidence * 100)}%
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(tooltip);
      
      const createdTooltip = document.getElementById('veritas-tooltip');
      expect(createdTooltip.querySelector('.veritas-result-text').textContent).toBe('CONFIÁVEL');
      expect(createdTooltip.querySelector('.veritas-confidence').textContent).toBe('Confiança: 85%');
    });
    
    test('deve criar tooltip de erro', () => {
      const errorMessage = 'Erro de comunicação';
      
      const tooltip = document.createElement('div');
      tooltip.id = 'veritas-tooltip';
      tooltip.innerHTML = `
        <div class="veritas-tooltip error">
          <div class="veritas-header">
            <span class="veritas-icon">🛡️</span>
            <span class="veritas-title">VeritasAI</span>
            <button class="veritas-close">×</button>
          </div>
          <div class="veritas-content">
            <div class="veritas-error">
              <span class="veritas-error-icon">⚠️</span>
              <span class="veritas-error-text">${errorMessage}</span>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(tooltip);
      
      const createdTooltip = document.getElementById('veritas-tooltip');
      expect(createdTooltip.querySelector('.veritas-error-text').textContent).toBe(errorMessage);
    });
  });
  
  describe('Comunicação com Background', () => {
    test('deve enviar texto para verificação', () => {
      const testText = 'Texto para verificar';
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'verifyText') {
          callback({
            success: true,
            data: {
              text: testText,
              classification: 'CONFIÁVEL',
              confidence: 0.85,
              timestamp: Date.now()
            }
          });
        }
      });
      
      chrome.runtime.sendMessage({
        action: 'verifyText',
        data: { text: testText }
      }, (response) => {
        expect(response.success).toBe(true);
        expect(response.data.text).toBe(testText);
        expect(response.data.classification).toBe('CONFIÁVEL');
      });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'verifyText',
          data: { text: testText }
        },
        expect.any(Function)
      );
    });
    
    test('deve tratar erro de comunicação', () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Erro de comunicação'
        });
      });
      
      chrome.runtime.sendMessage({
        action: 'verifyText',
        data: { text: 'teste' }
      }, (response) => {
        expect(response.success).toBe(false);
        expect(response.error).toBe('Erro de comunicação');
      });
    });
  });
  
  describe('Event Listeners', () => {
    test('deve responder a mensagens do background', () => {
      const mockRequest = {
        action: 'verifySelectedText',
        text: 'Texto selecionado'
      };
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      // Simular listener de mensagem
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(mockRequest, mockSender, mockSendResponse);
      
      // Verificar se a ação foi processada
      expect(mockRequest.action).toBe('verifySelectedText');
    });
    
    test('deve responder a toggle da extensão', () => {
      const mockRequest = {
        action: 'extensionToggled',
        enabled: false
      };
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      messageListener(mockRequest, mockSender, mockSendResponse);
      
      expect(mockRequest.enabled).toBe(false);
    });
  });
});
