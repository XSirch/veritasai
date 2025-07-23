/**
 * VeritasAI - Content Script
 * Injeta funcionalidade de verificação nas páginas web
 */

console.log('VeritasAI Content Script carregado');

// Estado da extensão
let extensionEnabled = true;
let currentTooltip = null;

/**
 * Inicialização do content script
 */
function initializeContentScript() {
  console.log('Inicializando VeritasAI Content Script');
  
  // Verificar se extensão está habilitada
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response && response.success) {
      extensionEnabled = response.data?.enabled ?? true;
      if (extensionEnabled) {
        setupEventListeners();
        injectStyles();
      }
    }
  });
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Listener para seleção de texto
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  
  // Listener para cliques (fechar tooltip)
  document.addEventListener('click', handleDocumentClick);
  
  // Listener para escape (fechar tooltip)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentTooltip) {
      hideTooltip();
    }
  });
}

/**
 * Manipula seleção de texto
 */
function handleTextSelection(event) {
  if (!extensionEnabled) return;
  
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length >= 10 && selectedText.length <= 2000) {
      showVerifyButton(selection, selectedText);
    } else if (currentTooltip) {
      hideTooltip();
    }
  }, 100);
}

/**
 * Mostra botão de verificação
 */
function showVerifyButton(selection, text) {
  hideTooltip(); // Remove tooltip anterior
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Criar botão de verificação
  const button = document.createElement('div');
  button.id = 'veritas-verify-button';
  button.innerHTML = `
    <div class="veritas-button">
      <span class="veritas-icon">🛡️</span>
      <span class="veritas-text">Verificar</span>
    </div>
  `;
  
  // Posicionar botão
  button.style.position = 'absolute';
  button.style.left = `${rect.left + window.scrollX}px`;
  button.style.top = `${rect.bottom + window.scrollY + 5}px`;
  button.style.zIndex = '10000';
  
  // Event listener do botão
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    verifyText(text, rect);
  });
  
  document.body.appendChild(button);
  currentTooltip = button;
}

/**
 * Verifica texto selecionado
 */
async function verifyText(text, rect) {
  hideTooltip();
  
  // Mostrar loading
  showLoadingTooltip(rect);
  
  try {
    // Enviar para background script
    chrome.runtime.sendMessage({
      action: 'verifyText',
      data: { text }
    }, (response) => {
      hideTooltip();
      
      if (response && response.success) {
        showResultTooltip(response.data, rect);
      } else {
        showErrorTooltip(response?.error || 'Erro na verificação', rect);
      }
    });
  } catch (error) {
    hideTooltip();
    showErrorTooltip('Erro de comunicação', rect);
  }
}

/**
 * Mostra tooltip de loading
 */
function showLoadingTooltip(rect) {
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
  
  positionTooltip(tooltip, rect);
  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

/**
 * Mostra tooltip com resultado
 */
function showResultTooltip(result, rect) {
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
  
  const tooltip = document.createElement('div');
  tooltip.id = 'veritas-tooltip';
  tooltip.innerHTML = `
    <div class="veritas-tooltip result">
      <div class="veritas-header">
        <span class="veritas-icon">🛡️</span>
        <span class="veritas-title">VeritasAI</span>
        <button class="veritas-close" onclick="this.closest('#veritas-tooltip').remove()">×</button>
      </div>
      <div class="veritas-content">
        <div class="veritas-result">
          <div class="veritas-classification" style="color: ${color}">
            <span class="veritas-result-icon">${icon}</span>
            <span class="veritas-result-text">${result.classification}</span>
          </div>
          <div class="veritas-confidence">
            Confiança: ${confidence}%
          </div>
          <div class="veritas-timestamp">
            Verificado em ${new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  `;
  
  positionTooltip(tooltip, rect);
  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

/**
 * Mostra tooltip de erro
 */
function showErrorTooltip(error, rect) {
  const tooltip = document.createElement('div');
  tooltip.id = 'veritas-tooltip';
  tooltip.innerHTML = `
    <div class="veritas-tooltip error">
      <div class="veritas-header">
        <span class="veritas-icon">🛡️</span>
        <span class="veritas-title">VeritasAI</span>
        <button class="veritas-close" onclick="this.closest('#veritas-tooltip').remove()">×</button>
      </div>
      <div class="veritas-content">
        <div class="veritas-error">
          <span class="veritas-error-icon">⚠️</span>
          <span class="veritas-error-text">${error}</span>
        </div>
      </div>
    </div>
  `;
  
  positionTooltip(tooltip, rect);
  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

/**
 * Posiciona tooltip
 */
function positionTooltip(tooltip, rect) {
  tooltip.style.position = 'absolute';
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
  tooltip.style.zIndex = '10001';
  
  // Ajustar se sair da tela
  setTimeout(() => {
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10 + window.scrollX}px`;
    }
    if (tooltipRect.bottom > window.innerHeight) {
      tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 10}px`;
    }
  }, 0);
}

/**
 * Esconde tooltip
 */
function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

/**
 * Manipula cliques no documento
 */
function handleDocumentClick(event) {
  if (currentTooltip && !currentTooltip.contains(event.target)) {
    hideTooltip();
  }
}

/**
 * Injeta estilos CSS
 */
function injectStyles() {
  if (document.getElementById('veritas-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'veritas-styles';
  styles.textContent = `
    #veritas-verify-button {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      cursor: pointer;
    }
    
    .veritas-button {
      background: #2196F3;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .veritas-button:hover {
      background: #1976D2;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    #veritas-tooltip {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 320px;
    }
    
    .veritas-tooltip {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }
    
    .veritas-header {
      background: #f5f5f5;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .veritas-title {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      flex: 1;
    }
    
    .veritas-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .veritas-content {
      padding: 16px;
    }
    
    .veritas-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
      font-size: 14px;
    }
    
    .veritas-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top: 2px solid #2196F3;
      border-radius: 50%;
      animation: veritas-spin 1s linear infinite;
    }
    
    @keyframes veritas-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .veritas-classification {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .veritas-confidence {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .veritas-timestamp {
      font-size: 12px;
      color: #999;
    }
    
    .veritas-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #F44336;
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(styles);
}

/**
 * Listener para mensagens do background
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'verifySelectedText':
      const selection = window.getSelection();
      if (selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        verifyText(request.text, rect);
      }
      break;
      
    case 'verifySelection':
      handleTextSelection();
      break;
      
    case 'extensionToggled':
      extensionEnabled = request.enabled;
      if (!extensionEnabled) {
        hideTooltip();
      }
      break;
  }
});

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}
