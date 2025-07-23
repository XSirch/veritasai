/**
 * VeritasAI - Background Script
 * Service Worker para Manifest V3
 */

console.log('VeritasAI Background Script iniciado');

// Configuração da extensão
const CONFIG = {
  version: process.env.VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development'
};

/**
 * Inicialização da extensão
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('VeritasAI instalado:', details);
  
  if (details.reason === 'install') {
    // Primeira instalação
    console.log('Primeira instalação da extensão');
    initializeExtension();
  } else if (details.reason === 'update') {
    // Atualização
    console.log('Extensão atualizada para versão:', CONFIG.version);
  }
});

/**
 * Inicializa configurações da extensão
 */
function initializeExtension() {
  // Configurações padrão
  const defaultSettings = {
    enabled: true,
    autoCheck: true,
    showTooltips: true,
    apiKeys: {
      googleFactCheck: '',
      groq: ''
    },
    cache: {
      enabled: true,
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 dias
    }
  };
  
  // Salvar configurações padrão
  chrome.storage.sync.set({ settings: defaultSettings }, () => {
    console.log('Configurações padrão salvas');
  });
}

/**
 * Comunicação com content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Mensagem recebida:', request);
  
  switch (request.action) {
    case 'verifyText':
      handleTextVerification(request.data, sendResponse);
      return true; // Indica resposta assíncrona
      
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true;
      
    case 'updateSettings':
      handleUpdateSettings(request.data, sendResponse);
      return true;
      
    default:
      console.warn('Ação não reconhecida:', request.action);
      sendResponse({ error: 'Ação não reconhecida' });
  }
});

/**
 * Manipula verificação de texto
 */
async function handleTextVerification(data, sendResponse) {
  try {
    console.log('Verificando texto:', data.text);
    
    // TODO: Implementar lógica de verificação
    // Por enquanto, retorna resposta mock
    const result = {
      text: data.text,
      classification: 'INCONCLUSIVA',
      confidence: 0.5,
      sources: [],
      timestamp: Date.now()
    };
    
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Erro na verificação:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Obtém configurações
 */
function handleGetSettings(sendResponse) {
  chrome.storage.sync.get(['settings'], (result) => {
    sendResponse({ success: true, data: result.settings });
  });
}

/**
 * Atualiza configurações
 */
function handleUpdateSettings(settings, sendResponse) {
  chrome.storage.sync.set({ settings }, () => {
    console.log('Configurações atualizadas');
    sendResponse({ success: true });
  });
}

/**
 * Context menu (menu de contexto)
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'veritas-verify',
    title: 'Verificar com VeritasAI',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'veritas-verify' && info.selectionText) {
    // Enviar texto selecionado para content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'verifySelectedText',
      text: info.selectionText
    });
  }
});

/**
 * Atalhos de teclado
 */
chrome.commands.onCommand.addListener((command) => {
  console.log('Comando executado:', command);
  
  switch (command) {
    case 'verify-selection':
      // Verificar texto selecionado
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'verifySelection'
        });
      });
      break;
      
    case 'toggle-extension':
      // Ativar/desativar extensão
      toggleExtension();
      break;
  }
});

/**
 * Ativa/desativa a extensão
 */
async function toggleExtension() {
  const result = await chrome.storage.sync.get(['settings']);
  const settings = result.settings || {};
  
  settings.enabled = !settings.enabled;
  
  chrome.storage.sync.set({ settings }, () => {
    console.log('Extensão', settings.enabled ? 'ativada' : 'desativada');
    
    // Notificar todos os content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'extensionToggled',
          enabled: settings.enabled
        }).catch(() => {
          // Ignorar erros de tabs sem content script
        });
      });
    });
  });
}

/**
 * Cleanup ao descarregar
 */
chrome.runtime.onSuspend.addListener(() => {
  console.log('Background script sendo suspenso');
});

// Log de inicialização
console.log('VeritasAI Background Script carregado - Versão:', CONFIG.version);
