#!/usr/bin/env node

/**
 * Script para testar a funcionalidade de verificação automática
 * Simula o comportamento da extensão e verifica se a lógica está correta
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testando funcionalidade de verificação automática...\n');

// Simular ambiente do browser
global.window = {
  getSelection: () => ({
    toString: () => 'Texto de teste para verificação automática',
    rangeCount: 1,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({ left: 100, top: 200, width: 300, height: 20 })
    })
  }),
  location: {
    href: 'https://example.com/test',
    hostname: 'example.com'
  },
  VeritasAI: {
    VERITAS_CONFIG: {
      AUTO_VERIFY: false,
      MIN_TEXT_LENGTH: 10,
      MAX_TEXT_LENGTH: 5000
    }
  }
};

global.document = {
  addEventListener: () => {},
  body: {
    appendChild: () => {}
  }
};

global.console = console;

// Mock das classes necessárias
class MockTextDetector {
  extractSelectedText(selection) {
    return selection.toString();
  }
  
  isValidSelection(text, selection) {
    return text && text.length >= 10 && text.length <= 5000;
  }
  
  analyzeSelection(selection, text) {
    return {
      text: text,
      originalText: text,
      contentType: 'general',
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname,
      position: { x: 100, y: 200 }
    };
  }
}

class MockUIManager {
  showVerifyButton(selectionData) {
    console.log('👆 Botão de verificação mostrado para:', selectionData.text.substring(0, 50) + '...');
  }
  
  hideAllElements() {
    console.log('🙈 Elementos UI escondidos');
  }
}

class MockCommunicationManager {
  trackEvent(eventName, data) {
    console.log(`📊 Evento rastreado: ${eventName}`, data);
  }
}

// Mock do EventManager com a nova lógica
class EventManager {
  constructor(textDetector, uiManager, communicationManager, state) {
    this.textDetector = textDetector;
    this.uiManager = uiManager;
    this.communicationManager = communicationManager;
    this.state = state;
  }
  
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
  
  async verifyText(selectionData) {
    console.log('🔍 Verificando texto:', selectionData.text.substring(0, 50) + '...');
    // Simular verificação
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Verificação concluída!');
  }
}

// Função de teste
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 TESTE 1: Verificação Manual (autoVerify = false)');
  console.log('='.repeat(60));
  
  // Configurar estado para verificação manual
  const state1 = {
    enabled: true,
    isProcessing: false,
    settings: { autoVerify: false },
    lastSelection: null
  };
  
  const eventManager1 = new EventManager(
    new MockTextDetector(),
    new MockUIManager(),
    new MockCommunicationManager(),
    state1
  );
  
  await eventManager1.handleTextSelection();
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE 2: Verificação Automática (autoVerify = true)');
  console.log('='.repeat(60));
  
  // Configurar estado para verificação automática
  const state2 = {
    enabled: true,
    isProcessing: false,
    settings: { autoVerify: true },
    lastSelection: null
  };
  
  const eventManager2 = new EventManager(
    new MockTextDetector(),
    new MockUIManager(),
    new MockCommunicationManager(),
    state2
  );
  
  await eventManager2.handleTextSelection();
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE 3: Verificação via Configuração Global');
  console.log('='.repeat(60));
  
  // Configurar via window.VeritasAI
  window.VeritasAI.VERITAS_CONFIG.AUTO_VERIFY = true;
  
  const state3 = {
    enabled: true,
    isProcessing: false,
    settings: {}, // Sem configuração local
    lastSelection: null
  };
  
  const eventManager3 = new EventManager(
    new MockTextDetector(),
    new MockUIManager(),
    new MockCommunicationManager(),
    state3
  );
  
  await eventManager3.handleTextSelection();
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE 4: Texto Muito Curto (deve ser ignorado)');
  console.log('='.repeat(60));
  
  // Mock para texto curto
  global.window.getSelection = () => ({
    toString: () => 'Hi',
    rangeCount: 1,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({ left: 100, top: 200, width: 300, height: 20 })
    })
  });
  
  await eventManager3.handleTextSelection();
  
  console.log('\n✅ Todos os testes concluídos!');
  console.log('\n📋 Resumo dos Resultados:');
  console.log('- Teste 1: Deve mostrar botão de verificação');
  console.log('- Teste 2: Deve executar verificação automática');
  console.log('- Teste 3: Deve executar verificação automática (via config global)');
  console.log('- Teste 4: Deve ignorar texto muito curto');
}

// Executar testes
runTests().catch(console.error);
