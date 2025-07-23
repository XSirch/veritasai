/**
 * VeritasAI - Popup Script
 * Interface principal da extensão
 */

console.log('VeritasAI Popup carregado');

// Estado do popup
let currentSettings = {};

/**
 * Inicialização do popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando popup VeritasAI');
  
  try {
    await loadSettings();
    setupEventListeners();
    updateUI();
  } catch (error) {
    console.error('Erro na inicialização:', error);
    showError('Erro ao carregar configurações');
  }
});

/**
 * Carrega configurações
 */
async function loadSettings() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        currentSettings = response.data || {};
        resolve();
      } else {
        reject(new Error('Falha ao carregar configurações'));
      }
    });
  });
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Toggle principal da extensão
  const enabledToggle = document.getElementById('enabled-toggle');
  if (enabledToggle) {
    enabledToggle.addEventListener('change', handleEnabledToggle);
  }
  
  // Toggle de verificação automática
  const autoCheckToggle = document.getElementById('auto-check-toggle');
  if (autoCheckToggle) {
    autoCheckToggle.addEventListener('change', handleAutoCheckToggle);
  }
  
  // Toggle de tooltips
  const tooltipsToggle = document.getElementById('tooltips-toggle');
  if (tooltipsToggle) {
    tooltipsToggle.addEventListener('change', handleTooltipsToggle);
  }
  
  // Botão de configurações
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }
  
  // Botão de verificação manual
  const verifyBtn = document.getElementById('verify-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', handleManualVerify);
  }
  
  // Campo de texto para verificação
  const textInput = document.getElementById('text-input');
  if (textInput) {
    textInput.addEventListener('input', handleTextInput);
    textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleManualVerify();
      }
    });
  }
  
  // Links externos
  const helpLink = document.getElementById('help-link');
  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/XSirch/veritasai/wiki' });
    });
  }
}

/**
 * Atualiza interface
 */
function updateUI() {
  // Status da extensão
  const enabledToggle = document.getElementById('enabled-toggle');
  const statusText = document.getElementById('status-text');
  const statusIcon = document.getElementById('status-icon');
  
  if (enabledToggle) {
    enabledToggle.checked = currentSettings.enabled ?? true;
  }
  
  if (statusText && statusIcon) {
    if (currentSettings.enabled ?? true) {
      statusText.textContent = 'Ativo';
      statusIcon.textContent = '🟢';
      statusIcon.className = 'status-icon active';
    } else {
      statusText.textContent = 'Inativo';
      statusIcon.textContent = '🔴';
      statusIcon.className = 'status-icon inactive';
    }
  }
  
  // Outras configurações
  const autoCheckToggle = document.getElementById('auto-check-toggle');
  if (autoCheckToggle) {
    autoCheckToggle.checked = currentSettings.autoCheck ?? true;
  }
  
  const tooltipsToggle = document.getElementById('tooltips-toggle');
  if (tooltipsToggle) {
    tooltipsToggle.checked = currentSettings.showTooltips ?? true;
  }
  
  // Estatísticas (mock)
  updateStats();
}

/**
 * Atualiza estatísticas
 */
function updateStats() {
  const verificationsCount = document.getElementById('verifications-count');
  const accuracyRate = document.getElementById('accuracy-rate');
  
  if (verificationsCount) {
    verificationsCount.textContent = '0'; // TODO: Implementar contador real
  }
  
  if (accuracyRate) {
    accuracyRate.textContent = '87%'; // TODO: Implementar cálculo real
  }
}

/**
 * Manipula toggle principal
 */
async function handleEnabledToggle(event) {
  const enabled = event.target.checked;
  
  try {
    currentSettings.enabled = enabled;
    await saveSettings();
    updateUI();
    showSuccess(enabled ? 'Extensão ativada' : 'Extensão desativada');
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    showError('Erro ao alterar configuração');
    event.target.checked = !enabled; // Reverter
  }
}

/**
 * Manipula toggle de verificação automática
 */
async function handleAutoCheckToggle(event) {
  try {
    currentSettings.autoCheck = event.target.checked;
    await saveSettings();
    showSuccess('Configuração salva');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showError('Erro ao salvar configuração');
  }
}

/**
 * Manipula toggle de tooltips
 */
async function handleTooltipsToggle(event) {
  try {
    currentSettings.showTooltips = event.target.checked;
    await saveSettings();
    showSuccess('Configuração salva');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showError('Erro ao salvar configuração');
  }
}

/**
 * Salva configurações
 */
async function saveSettings() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      data: currentSettings
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        resolve();
      } else {
        reject(new Error('Falha ao salvar configurações'));
      }
    });
  });
}

/**
 * Abre página de configurações
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Manipula verificação manual
 */
async function handleManualVerify() {
  const textInput = document.getElementById('text-input');
  const verifyBtn = document.getElementById('verify-btn');
  const resultDiv = document.getElementById('verify-result');
  
  if (!textInput || !verifyBtn || !resultDiv) return;
  
  const text = textInput.value.trim();
  
  if (text.length < 10) {
    showError('Texto muito curto (mínimo 10 caracteres)');
    return;
  }
  
  if (text.length > 2000) {
    showError('Texto muito longo (máximo 2000 caracteres)');
    return;
  }
  
  // Mostrar loading
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verificando...';
  resultDiv.innerHTML = '<div class="loading">🔄 Analisando texto...</div>';
  
  try {
    // Enviar para background
    chrome.runtime.sendMessage({
      action: 'verifyText',
      data: { text }
    }, (response) => {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verificar';
      
      if (response && response.success) {
        showVerificationResult(response.data, resultDiv);
      } else {
        resultDiv.innerHTML = `<div class="error">❌ ${response?.error || 'Erro na verificação'}</div>`;
      }
    });
  } catch (error) {
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verificar';
    resultDiv.innerHTML = '<div class="error">❌ Erro de comunicação</div>';
  }
}

/**
 * Mostra resultado da verificação
 */
function showVerificationResult(result, container) {
  const classificationColors = {
    'CONFIÁVEL': '#4CAF50',
    'INCONCLUSIVA': '#FF9800',
    'SEM FUNDAMENTO': '#FF5722',
    'FAKE': '#F44336'
  };
  
  const classificationIcons = {
    'CONFIÁVEL': '✅',
    'INCONCLUSIVA': '⚠️',
    'SEM FUNDAMENTO': '❌',
    'FAKE': '🚫'
  };
  
  const color = classificationColors[result.classification] || '#757575';
  const icon = classificationIcons[result.classification] || '❓';
  const confidence = Math.round(result.confidence * 100);
  
  container.innerHTML = `
    <div class="verification-result">
      <div class="result-header">
        <span class="result-icon">${icon}</span>
        <span class="result-classification" style="color: ${color}">
          ${result.classification}
        </span>
      </div>
      <div class="result-confidence">
        Confiança: ${confidence}%
      </div>
      <div class="result-timestamp">
        ${new Date(result.timestamp).toLocaleString()}
      </div>
    </div>
  `;
}

/**
 * Manipula input de texto
 */
function handleTextInput(event) {
  const text = event.target.value;
  const charCount = document.getElementById('char-count');
  const verifyBtn = document.getElementById('verify-btn');
  
  if (charCount) {
    charCount.textContent = `${text.length}/2000`;
    
    if (text.length > 2000) {
      charCount.style.color = '#F44336';
    } else if (text.length < 10) {
      charCount.style.color = '#FF9800';
    } else {
      charCount.style.color = '#4CAF50';
    }
  }
  
  if (verifyBtn) {
    verifyBtn.disabled = text.length < 10 || text.length > 2000;
  }
}

/**
 * Mostra mensagem de sucesso
 */
function showSuccess(message) {
  showNotification(message, 'success');
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
  showNotification(message, 'error');
}

/**
 * Mostra notificação
 */
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
