/**
 * VeritasAI - Popup Manager
 * Gerencia interface de configurações do popup
 */

class PopupManager {
  constructor() {
    this.config = {
      apiTimeout: 10000,
      saveDelay: 1000,
      toastDuration: 3000
    };
    
    this.elements = {};
    this.currentConfig = {};
    this.saveTimer = null;
    this.isLoading = false;
    
    this.init();
  }
  
  /**
   * Inicialização
   */
  async init() {
    try {
      this.cacheElements();
      this.setupEventListeners();
      await this.loadConfiguration();
      this.updateUI();
      
      console.log('✅ PopupManager inicializado');
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      this.showToast('Erro ao carregar configurações', 'error');
    }
  }
  
  /**
   * Cache de elementos DOM
   */
  cacheElements() {
    console.log('🔍 Fazendo cache dos elementos DOM...');

    // Status elements
    this.elements.extensionStatus = document.getElementById('extension-status');
    this.elements.apiStatus = document.getElementById('api-status');

    // API inputs
    this.elements.googleApiKey = document.getElementById('google-api-key');
    this.elements.groqApiKey = document.getElementById('groq-api-key');
    this.elements.googleApiStatus = document.getElementById('google-api-status');
    this.elements.groqApiStatus = document.getElementById('groq-api-status');

    // Preference inputs
    this.elements.languageSelect = document.getElementById('language-select');
    this.elements.themeSelect = document.getElementById('theme-select');
    this.elements.notificationsEnabled = document.getElementById('notifications-enabled');
    this.elements.soundEnabled = document.getElementById('sound-enabled');
    this.elements.autoVerify = document.getElementById('auto-verify');
    this.elements.cacheEnabled = document.getElementById('cache-enabled');

    // Advanced inputs
    this.elements.timeoutInput = document.getElementById('timeout-input');
    this.elements.maxTextLength = document.getElementById('max-text-length');
    this.elements.debugMode = document.getElementById('debug-mode');
    this.elements.verboseLogging = document.getElementById('verbose-logging');

    // Action buttons
    this.elements.resetBtn = document.getElementById('reset-btn');
    this.elements.saveBtn = document.getElementById('save-btn');

    // Status and feedback
    this.elements.saveStatus = document.getElementById('save-status');
    this.elements.loadingOverlay = document.getElementById('loading-overlay');
    this.elements.loadingText = document.getElementById('loading-text');
    this.elements.toastContainer = document.getElementById('toast-container');

    // Toggle visibility buttons
    this.elements.toggleButtons = document.querySelectorAll('.toggle-visibility');
    this.elements.testButtons = document.querySelectorAll('.test-api');

    // Verificar elementos críticos
    const criticalElements = ['loadingOverlay', 'loadingText', 'apiStatus'];
    criticalElements.forEach(elementName => {
      if (!this.elements[elementName]) {
        console.error(`❌ Elemento crítico não encontrado: ${elementName}`);
      } else {
        console.log(`✅ Elemento encontrado: ${elementName}`);
      }
    });

    console.log('✅ Cache de elementos concluído');
  }
  
  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // API key inputs
    if (this.elements.googleApiKey) {
      this.elements.googleApiKey.addEventListener('input', () => this.handleApiKeyInput('google'));
    }
    if (this.elements.groqApiKey) {
      this.elements.groqApiKey.addEventListener('input', () => this.handleApiKeyInput('groq'));
    }
    
    // Toggle visibility buttons
    this.elements.toggleButtons.forEach(btn => {
      btn.addEventListener('click', this.togglePasswordVisibility.bind(this));
    });
    
    // Test API buttons
    this.elements.testButtons.forEach(btn => {
      btn.addEventListener('click', this.testApiKey.bind(this));
    });
    
    // Preference inputs
    if (this.elements.languageSelect) {
      this.elements.languageSelect.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.themeSelect) {
      this.elements.themeSelect.addEventListener('change', this.handleThemeChange.bind(this));
    }
    if (this.elements.notificationsEnabled) {
      this.elements.notificationsEnabled.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.soundEnabled) {
      this.elements.soundEnabled.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.autoVerify) {
      this.elements.autoVerify.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.cacheEnabled) {
      this.elements.cacheEnabled.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    
    // Advanced inputs
    if (this.elements.timeoutInput) {
      this.elements.timeoutInput.addEventListener('input', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.maxTextLength) {
      this.elements.maxTextLength.addEventListener('input', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.debugMode) {
      this.elements.debugMode.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    if (this.elements.verboseLogging) {
      this.elements.verboseLogging.addEventListener('change', this.handlePreferenceChange.bind(this));
    }
    
    // Action buttons
    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', this.resetConfiguration.bind(this));
    }
    if (this.elements.saveBtn) {
      this.elements.saveBtn.addEventListener('click', () => this.saveConfiguration(true));
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }
  
  /**
   * Carrega configuração atual
   */
  async loadConfiguration() {
    this.showLoading('Carregando configurações...');

    try {
      console.log('🔄 Tentando carregar configurações via background script...');
      const response = await this.sendMessage('getConfiguration');

      if (response && response.success) {
        console.log('✅ Configurações carregadas via background script');
        this.currentConfig = response.data || {};
        this.populateForm();
        this.updateApiStatus();
        return;
      } else {
        console.warn('⚠️ Background script não respondeu, tentando fallback...');
        throw new Error(response?.error || 'Background script não disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar via background:', error);

      // Fallback: carregar diretamente do storage
      try {
        console.log('🔄 Tentando carregar configurações diretamente do storage...');
        const result = await chrome.storage.sync.get(['veritasConfig']);

        if (result.veritasConfig) {
          console.log('✅ Configurações carregadas do storage');
          this.currentConfig = result.veritasConfig;
        } else {
          console.log('📝 Usando configurações padrão');
          this.currentConfig = this.getDefaultConfiguration();
        }

        this.populateForm();
        this.updateApiStatus();

      } catch (storageError) {
        console.error('❌ Erro ao carregar do storage:', storageError);
        this.showToast('Erro ao carregar configurações', 'error');
        this.currentConfig = this.getDefaultConfiguration();
        this.populateForm();
      }
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * Popula formulário com configuração atual
   */
  populateForm() {
    console.log('📝 Populando formulário com configuração:', this.currentConfig);
    const config = this.currentConfig;

    try {
      // API Keys
      if (this.elements.googleApiKey) {
        this.elements.googleApiKey.value = config.googleApiKey || '';
      }
      if (this.elements.groqApiKey) {
        this.elements.groqApiKey.value = config.groqApiKey || '';
      }
    
    // Preferences
    if (this.elements.languageSelect) {
      this.elements.languageSelect.value = config.language || 'pt-BR';
    }
    if (this.elements.themeSelect) {
      this.elements.themeSelect.value = config.theme || 'auto';
    }
    if (this.elements.notificationsEnabled) {
      this.elements.notificationsEnabled.checked = config.notificationsEnabled !== false;
    }
    if (this.elements.soundEnabled) {
      this.elements.soundEnabled.checked = config.soundEnabled !== false;
    }
    if (this.elements.autoVerify) {
      this.elements.autoVerify.checked = config.autoVerify === true;
    }
    if (this.elements.cacheEnabled) {
      this.elements.cacheEnabled.checked = config.cacheEnabled !== false;
    }
    
    // Advanced
    if (this.elements.timeoutInput) {
      this.elements.timeoutInput.value = config.apiTimeout || 30;
    }
    if (this.elements.maxTextLength) {
      this.elements.maxTextLength.value = config.maxTextLength || 5000;
    }
    if (this.elements.debugMode) {
      this.elements.debugMode.checked = config.debugMode === true;
    }
    if (this.elements.verboseLogging) {
      this.elements.verboseLogging.checked = config.verboseLogging === true;
    }
    
      // Update test button states
      this.updateTestButtonStates();

      console.log('✅ Formulário populado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao popular formulário:', error);
    }
  }
  
  /**
   * Manipula entrada de API key
   */
  handleApiKeyInput(apiType) {
    const input = apiType === 'google' ? this.elements.googleApiKey : this.elements.groqApiKey;
    const statusElement = apiType === 'google' ? this.elements.googleApiStatus : this.elements.groqApiStatus;
    const testButton = document.querySelector(`[data-api="${apiType}"]`);
    
    if (!input || !statusElement || !testButton) return;
    
    const value = input.value.trim();
    
    // Validação básica
    if (value.length === 0) {
      input.classList.remove('error', 'success');
      statusElement.textContent = '';
      statusElement.className = 'api-status';
      testButton.disabled = true;
    } else if (this.validateApiKey(apiType, value)) {
      input.classList.remove('error');
      input.classList.add('success');
      statusElement.textContent = '✓ Formato válido';
      statusElement.className = 'api-status success';
      testButton.disabled = false;
    } else {
      input.classList.remove('success');
      input.classList.add('error');
      statusElement.textContent = '✗ Formato inválido';
      statusElement.className = 'api-status error';
      testButton.disabled = true;
    }
    
    // Schedule save
    this.scheduleAutoSave();
  }
  
  /**
   * Valida formato de API key
   */
  validateApiKey(apiType, key) {
    switch (apiType) {
      case 'google':
        // Google API keys geralmente têm 39 caracteres
        return /^[A-Za-z0-9_-]{35,45}$/.test(key);
      case 'groq':
        // Groq API keys começam com 'gsk_'
        return /^gsk_[A-Za-z0-9]{48,52}$/.test(key);
      default:
        return false;
    }
  }
  
  /**
   * Obtém configuração padrão
   */
  getDefaultConfiguration() {
    return {
      googleApiKey: '',
      groqApiKey: '',
      language: 'pt-BR',
      theme: 'auto',
      notificationsEnabled: true,
      soundEnabled: true,
      autoVerify: false,
      cacheEnabled: true,
      apiTimeout: 30,
      maxTextLength: 5000,
      debugMode: false,
      verboseLogging: false,
      version: '1.0.17'
    };
  }
  
  /**
   * Envia mensagem para background script
   */
  async sendMessage(action, data = {}) {
    return new Promise((resolve) => {
      console.log(`📤 Enviando mensagem: ${action}`, data);

      // Timeout para evitar loading infinito
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout na mensagem: ${action}`);
        resolve({ success: false, error: 'Timeout na comunicação com background script' });
      }, this.config.apiTimeout);

      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          console.error('❌ Erro na comunicação:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log(`📥 Resposta recebida para ${action}:`, response);
          resolve(response || { success: false, error: 'Resposta vazia do background script' });
        }
      });
    });
  }
  
  /**
   * Mostra loading
   */
  showLoading(text = 'Carregando...') {
    console.log('🔄 Mostrando loading:', text);

    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.hidden = false;
      console.log('✅ Loading overlay mostrado');
    } else {
      console.error('❌ Elemento loadingOverlay não encontrado para mostrar!');
    }

    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = text;
      console.log('✅ Texto do loading atualizado:', text);
    }

    this.isLoading = true;
    console.log('✅ showLoading() concluído');
  }
  
  /**
   * Esconde loading
   */
  hideLoading() {
    console.log('🔄 Tentando esconder loading...');

    if (this.elements.loadingOverlay) {
      console.log('✅ Elemento loadingOverlay encontrado, escondendo...');
      this.elements.loadingOverlay.hidden = true;
      console.log('✅ Loading escondido com sucesso');
    } else {
      console.error('❌ Elemento loadingOverlay não encontrado!');
    }

    this.isLoading = false;
    console.log('✅ hideLoading() concluído');
  }
  
  /**
   * Mostra toast notification
   */
  showToast(message, type = 'info') {
    if (!this.elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, this.config.toastDuration);
  }
  
  /**
   * Atualiza UI
   */
  updateUI() {
    console.log('🎨 Atualizando UI...');

    try {
      // Aplicar tema atual
      const theme = this.currentConfig.theme || 'auto';
      console.log('🎨 Aplicando tema:', theme);
      this.applyTheme(theme);
      console.log('✅ UI atualizada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar UI:', error);
    }
  }
  
  /**
   * Aplica tema
   */
  applyTheme(theme) {
    const body = document.body;
    
    body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    
    if (theme === 'light') {
      body.classList.add('theme-light');
    } else if (theme === 'dark') {
      body.classList.add('theme-dark');
    } else {
      body.classList.add('theme-auto');
    }
  }
  
  /**
   * Atualiza status das APIs
   */
  updateApiStatus() {
    console.log('🔄 Atualizando status das APIs...');

    try {
      const hasGoogle = this.currentConfig.googleApiKey && this.currentConfig.googleApiKey.length > 0;
      const hasGroq = this.currentConfig.groqApiKey && this.currentConfig.groqApiKey.length > 0;

      console.log('📊 Status das APIs:', { hasGoogle, hasGroq });

      if (this.elements.apiStatus) {
        if (hasGoogle && hasGroq) {
          this.elements.apiStatus.innerHTML = '<span class="status-indicator active"></span>Configuradas';
        } else if (hasGoogle || hasGroq) {
          this.elements.apiStatus.innerHTML = '<span class="status-indicator pending"></span>Parcial';
        } else {
          this.elements.apiStatus.innerHTML = '<span class="status-indicator error"></span>Não configuradas';
        }
        console.log('✅ Status das APIs atualizado');
      } else {
        console.error('❌ Elemento apiStatus não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status das APIs:', error);
    }
  }
  
  /**
   * Atualiza estado dos botões de teste
   */
  updateTestButtonStates() {
    // Implementar se necessário
  }
  
  /**
   * Agenda salvamento automático
   */
  scheduleAutoSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.saveConfiguration(false);
    }, this.config.saveDelay);
    
    if (this.elements.saveStatus) {
      this.elements.saveStatus.textContent = 'Alterações não salvas';
    }
    if (this.elements.saveBtn) {
      this.elements.saveBtn.style.background = 'var(--warning-color)';
    }
  }
  
  /**
   * Manipula atalhos de teclado
   */
  handleKeyboardShortcuts(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveConfiguration(true);
    }
    
    if (event.key === 'Escape') {
      this.hideLoading();
    }
  }
  
  /**
   * Testa API key
   */
  async testApiKey(event) {
    const apiType = event.currentTarget.dataset.api;
    console.log('🧪 Testando API key:', apiType);

    try {
      // Obter a API key do input
      const apiKey = apiType === 'google'
        ? this.elements.googleApiKey?.value?.trim()
        : this.elements.groqApiKey?.value?.trim();

      if (!apiKey) {
        this.showToast('Por favor, insira a API key primeiro', 'warning');
        return;
      }

      // Mostrar loading no botão
      const button = event.currentTarget;
      const originalContent = button.innerHTML;
      button.innerHTML = '<span class="test-icon">⏳</span>';
      button.disabled = true;

      // Enviar para background script
      const response = await this.sendMessage('testApiKey', { apiType, apiKey });

      if (response && response.success) {
        this.showToast(`API ${apiType} testada com sucesso!`, 'success');
        console.log('✅ Teste de API bem-sucedido:', response.data);
      } else {
        this.showToast(`Erro no teste da API ${apiType}: ${response?.error || 'Erro desconhecido'}`, 'error');
        console.error('❌ Erro no teste de API:', response);
      }

      // Restaurar botão
      button.innerHTML = originalContent;
      button.disabled = false;

    } catch (error) {
      console.error('❌ Erro ao testar API:', error);
      this.showToast('Erro ao testar API', 'error');
    }
  }

  /**
   * Alterna visibilidade da senha
   */
  togglePasswordVisibility(event) {
    const targetId = event.currentTarget.dataset.target;
    const input = document.getElementById(targetId);
    const icon = event.currentTarget.querySelector('.visibility-icon');

    console.log('👁️ Alternando visibilidade:', targetId);

    if (input) {
      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
        console.log('✅ Senha visível');
      } else {
        input.type = 'password';
        icon.textContent = '👁️';
        console.log('✅ Senha oculta');
      }
    } else {
      console.error('❌ Input não encontrado:', targetId);
    }
  }
  
  handlePreferenceChange() {
    this.scheduleAutoSave();
  }
  
  handleThemeChange() {
    const theme = this.elements.themeSelect?.value || 'auto';
    this.applyTheme(theme);
    this.scheduleAutoSave();
  }
  
  async saveConfiguration(showFeedback = true) {
    try {
      if (showFeedback) {
        this.showLoading('Salvando configurações...');
      }

      // Coletar dados do formulário
      const config = {
        googleApiKey: this.elements.googleApiKey?.value?.trim() || '',
        groqApiKey: this.elements.groqApiKey?.value?.trim() || '',
        language: this.elements.languageSelect?.value || 'pt-BR',
        theme: this.elements.themeSelect?.value || 'auto',
        notificationsEnabled: this.elements.notificationsEnabled?.checked !== false,
        soundEnabled: this.elements.soundEnabled?.checked === true,
        autoVerify: this.elements.autoVerify?.checked === true,
        cacheEnabled: this.elements.cacheEnabled?.checked !== false,
        apiTimeout: parseInt(this.elements.timeoutInput?.value) || 30,
        maxTextLength: parseInt(this.elements.maxTextLength?.value) || 5000,
        debugMode: this.elements.debugMode?.checked === true,
        verboseLogging: this.elements.verboseLogging?.checked === true,
        lastUpdated: Date.now()
      };

      console.log('💾 Salvando configuração:', config);

      // Salvar no storage
      await chrome.storage.sync.set({ veritasConfig: config });

      console.log('✅ Configuração salva no storage');

      // Verificar se foi salvo corretamente
      const verification = await chrome.storage.sync.get(['veritasConfig']);
      console.log('🔍 Verificação do storage:', verification);

      // Limpar timer de auto-save
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }

      // Feedback visual
      if (showFeedback) {
        this.hideLoading();
        this.showSuccess('Configurações salvas com sucesso!');

        if (this.elements.saveStatus) {
          this.elements.saveStatus.textContent = 'Salvo';
          this.elements.saveStatus.className = 'save-status saved';
        }
      }

      console.log('✅ Configurações salvas:', config);

    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);

      if (showFeedback) {
        this.hideLoading();
        this.showError('Erro ao salvar configurações: ' + error.message);
      }
    }
  }
  
  async resetConfiguration() {
    console.log('Reset configuration');
  }

  /**
   * Mostra mensagem de sucesso
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    this.showToast(message, 'error');
  }


}

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
