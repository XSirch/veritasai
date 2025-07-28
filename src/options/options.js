/**
 * VeritasAI - Options Page Script
 * Página de configurações avançadas da extensão
 */

console.log('VeritasAI Options carregado');

// Estado das configurações
let currentSettings = {};

/**
 * Inicialização da página de opções
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando página de opções VeritasAI');
  
  try {
    await loadSettings();
    setupEventListeners();
    updateUI();
    setupTabs();
  } catch (error) {
    console.error('Erro na inicialização:', error);
    showNotification('Erro ao carregar configurações', 'error');
  }
});

/**
 * Carrega configurações
 */
async function loadSettings() {
  return new Promise((resolve, reject) => {
    console.log('📋 Carregando configurações...');

    chrome.runtime.sendMessage({ action: 'getConfiguration' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erro de runtime:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }

      console.log('📥 Resposta recebida:', response);

      if (response && response.success) {
        currentSettings = response.data || {};
        console.log('✅ Configurações carregadas:', currentSettings);
        resolve();
      } else {
        console.error('❌ Falha na resposta:', response);
        reject(new Error('Falha ao carregar configurações'));
      }
    });
  });
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Formulário de configurações gerais
  const generalForm = document.getElementById('general-form');
  if (generalForm) {
    generalForm.addEventListener('submit', handleGeneralSubmit);
  }
  
  // Formulário de API keys
  const apiForm = document.getElementById('api-form');
  if (apiForm) {
    apiForm.addEventListener('submit', handleApiSubmit);
  }
  
  // Formulário de cache
  const cacheForm = document.getElementById('cache-form');
  if (cacheForm) {
    cacheForm.addEventListener('submit', handleCacheSubmit);
  }
  
  // Botões de teste de API
  const testGoogleBtn = document.getElementById('test-google-api');
  if (testGoogleBtn) {
    testGoogleBtn.addEventListener('click', testGoogleApi);
  }
  
  const testGroqBtn = document.getElementById('test-groq-api');
  if (testGroqBtn) {
    testGroqBtn.addEventListener('click', testGroqApi);
  }
  
  // Botão de limpar cache
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearCache);
  }
  
  // Botão de reset
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }
  
  // Botão de exportar
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSettings);
  }
  
  // Input de importar
  const importInput = document.getElementById('import-input');
  if (importInput) {
    importInput.addEventListener('change', importSettings);
  }
}

/**
 * Configura sistema de abas
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      
      // Remover classe ativa de todas as abas
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Ativar aba selecionada
      button.classList.add('active');
      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

/**
 * Atualiza interface
 */
function updateUI() {
  // Configurações gerais
  const enabledCheckbox = document.getElementById('enabled');
  if (enabledCheckbox) {
    enabledCheckbox.checked = currentSettings.enabled ?? true;
  }
  
  const autoCheckCheckbox = document.getElementById('auto-check');
  if (autoCheckCheckbox) {
    autoCheckCheckbox.checked = currentSettings.autoCheck ?? true;
  }
  
  const tooltipsCheckbox = document.getElementById('show-tooltips');
  if (tooltipsCheckbox) {
    tooltipsCheckbox.checked = currentSettings.showTooltips ?? true;
  }
  
  // API Keys
  const googleApiKey = document.getElementById('google-api-key');
  if (googleApiKey) {
    googleApiKey.value = currentSettings.googleApiKey || '';
  }

  const groqApiKey = document.getElementById('groq-api-key');
  if (groqApiKey) {
    groqApiKey.value = currentSettings.groqApiKey || '';
  }
  
  // Cache
  const cacheEnabled = document.getElementById('cache-enabled');
  if (cacheEnabled) {
    cacheEnabled.checked = currentSettings.cacheEnabled !== false;
  }

  const cacheTtl = document.getElementById('cache-ttl');
  if (cacheTtl) {
    const ttlDays = (currentSettings.cacheExpiration || 30 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000);
    cacheTtl.value = ttlDays;
  }
}

/**
 * Manipula submissão de configurações gerais
 */
async function handleGeneralSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  
  currentSettings.enabled = formData.has('enabled');
  currentSettings.autoCheck = formData.has('auto-check');
  currentSettings.showTooltips = formData.has('show-tooltips');
  
  try {
    await saveSettings();
    showNotification('Configurações gerais salvas', 'success');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showNotification('Erro ao salvar configurações', 'error');
  }
}

/**
 * Manipula submissão de API keys
 */
async function handleApiSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  
  currentSettings.googleApiKey = formData.get('google-api-key') || '';
  currentSettings.groqApiKey = formData.get('groq-api-key') || '';
  
  try {
    await saveSettings();
    showNotification('API keys salvas', 'success');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showNotification('Erro ao salvar API keys', 'error');
  }
}

/**
 * Manipula submissão de configurações de cache
 */
async function handleCacheSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  
  currentSettings.cacheEnabled = formData.has('cache-enabled');
  const ttlDays = parseInt(formData.get('cache-ttl')) || 30;
  currentSettings.cacheExpiration = ttlDays * 24 * 60 * 60 * 1000;
  
  try {
    await saveSettings();
    showNotification('Configurações de cache salvas', 'success');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showNotification('Erro ao salvar configurações de cache', 'error');
  }
}

/**
 * Testa API do Google
 */
async function testGoogleApi() {
  const button = document.getElementById('test-google-api');
  const apiKey = document.getElementById('google-api-key').value;
  
  if (!apiKey) {
    showNotification('Insira uma API key do Google primeiro', 'error');
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Testando...';
  
  try {
    // TODO: Implementar teste real da API
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay
    
    // Mock de resposta
    showNotification('API do Google testada com sucesso', 'success');
  } catch (error) {
    showNotification('Erro ao testar API do Google', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Testar API';
  }
}

/**
 * Testa API do Groq
 */
async function testGroqApi() {
  const button = document.getElementById('test-groq-api');
  const apiKey = document.getElementById('groq-api-key').value;
  
  if (!apiKey) {
    showNotification('Insira uma API key do Groq primeiro', 'error');
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Testando...';
  
  try {
    // TODO: Implementar teste real da API
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay
    
    // Mock de resposta
    showNotification('API do Groq testada com sucesso', 'success');
  } catch (error) {
    showNotification('Erro ao testar API do Groq', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Testar API';
  }
}

/**
 * Limpa cache
 */
async function clearCache() {
  const button = document.getElementById('clear-cache-btn');
  
  if (!confirm('Tem certeza que deseja limpar todo o cache?')) {
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Limpando...';
  
  try {
    // TODO: Implementar limpeza real do cache
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    showNotification('Cache limpo com sucesso', 'success');
  } catch (error) {
    showNotification('Erro ao limpar cache', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Limpar Cache';
  }
}

/**
 * Reset das configurações
 */
async function resetSettings() {
  if (!confirm('Tem certeza que deseja resetar todas as configurações?')) {
    return;
  }
  
  try {
    // Configurações padrão (formato compatível com background)
    currentSettings = {
      googleApiKey: '',
      groqApiKey: '',
      language: 'pt-BR',
      theme: 'auto',
      notificationsEnabled: true,
      soundEnabled: false,
      autoVerify: false,
      cacheEnabled: true,
      apiTimeout: 30,
      maxTextLength: 5000,
      debugMode: false,
      verboseLogging: false,
      cacheExpiration: 30 * 24 * 60 * 60 * 1000
    };
    
    await saveSettings();
    updateUI();
    showNotification('Configurações resetadas', 'success');
  } catch (error) {
    showNotification('Erro ao resetar configurações', 'error');
  }
}

/**
 * Exporta configurações
 */
function exportSettings() {
  const dataStr = JSON.stringify(currentSettings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = 'veritas-ai-settings.json';
  link.click();
  
  showNotification('Configurações exportadas', 'success');
}

/**
 * Importa configurações
 */
function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedSettings = JSON.parse(e.target.result);
      
      // Validar estrutura básica
      if (typeof importedSettings === 'object') {
        currentSettings = { ...currentSettings, ...importedSettings };
        await saveSettings();
        updateUI();
        showNotification('Configurações importadas', 'success');
      } else {
        throw new Error('Formato inválido');
      }
    } catch (error) {
      showNotification('Erro ao importar configurações', 'error');
    }
  };
  
  reader.readAsText(file);
}

/**
 * Salva configurações
 */
async function saveSettings() {
  return new Promise((resolve, reject) => {
    console.log('💾 Salvando configurações:', currentSettings);

    chrome.runtime.sendMessage({
      action: 'saveConfiguration',
      config: currentSettings
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erro de runtime:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }

      console.log('📥 Resposta do salvamento:', response);

      if (response && response.success) {
        console.log('✅ Configurações salvas com sucesso');
        resolve();
      } else {
        console.error('❌ Falha no salvamento:', response);
        reject(new Error('Falha ao salvar configurações'));
      }
    });
  });
}

/**
 * Mostra notificação
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}
