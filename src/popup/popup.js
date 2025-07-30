/**
 * VeritasAI - Popup Manager
 * Gerencia interface de configurações do popup
 */

class PopupManager {
  constructor() {
    this.config = {
      apiTimeout: 10000,
      saveDelay: 1000,
      toastDuration: 5000 // Aumentado para 5 segundos
    };

    this.elements = {};
    this.currentConfig = this.getDefaultConfiguration(); // Inicializar com configuração padrão
    this.saveTimer = null;

    console.log('🏗️ PopupManager construído com configuração padrão:', this.currentConfig);
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

    // API inputs - Groq
    this.elements.groqApiKey = document.getElementById('groq-api-key');
    this.elements.groqApiStatus = document.getElementById('groq-api-status');
    this.elements.groqModelSelect = document.getElementById('groq-model-select');

    // Embedding API inputs
    this.elements.openaiApiKey = document.getElementById('openai-api-key');
    this.elements.cohereApiKey = document.getElementById('cohere-api-key');
    this.elements.huggingfaceApiKey = document.getElementById('huggingface-api-key');

    // Qdrant status
    this.elements.qdrantStatus = document.getElementById('qdrant-status');
    this.elements.qdrantRefresh = document.getElementById('qdrant-refresh');

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
    const criticalElements = ['loadingOverlay', 'loadingText', 'apiStatus', 'saveBtn', 'groqApiKey'];
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
    // API key inputs - apenas Groq
    if (this.elements.groqApiKey) {
      this.elements.groqApiKey.addEventListener('input', () => this.handleApiKeyInput('groq'));
    }

    // Groq model select
    if (this.elements.groqModelSelect) {
      this.elements.groqModelSelect.addEventListener('change', () => this.handleModelChange());
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
      console.log('✅ Listener do botão Reset adicionado');
    } else {
      console.error('❌ Botão Reset não encontrado');
    }

    if (this.elements.saveBtn) {
      this.elements.saveBtn.addEventListener('click', () => {
        console.log('🖱️ Botão Salvar clicado!');
        this.saveConfiguration(true);
      });
      console.log('✅ Listener do botão Salvar adicionado');
    } else {
      console.error('❌ Botão Salvar não encontrado');
    }

    // Qdrant refresh button
    if (this.elements.qdrantRefresh) {
      this.elements.qdrantRefresh.addEventListener('click', () => {
        console.log('🔄 Botão Qdrant Refresh clicado!');
        this.updateQdrantStatus();
      });
      console.log('✅ Listener do botão Qdrant Refresh adicionado');
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
        console.log('📥 Resposta recebida para getConfiguration:', response);
        this.currentConfig = response.config || response.data || {};
        console.log('🔧 Configuração atual definida:', this.currentConfig);
        this.populateForm();
        this.updateApiStatus();
        this.updateQdrantStatus();
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
        this.updateQdrantStatus();

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

    // Debug: verificar se a configuração tem os dados esperados
    console.log('🔍 Dados da configuração:');
    console.log('  - groqApiKey:', config.groqApiKey ? config.groqApiKey.substring(0, 10) + '...' : 'não definida');
    console.log('  - groqModel:', config.groqModel || 'não definido');
    console.log('  - language:', config.language || 'não definido');

    try {
      // API Keys - apenas Groq
      if (this.elements.groqApiKey) {
        const apiKeyValue = config.groqApiKey || '';
        this.elements.groqApiKey.value = apiKeyValue;
        console.log('🔑 API Key populada:', apiKeyValue ? apiKeyValue.substring(0, 10) + '...' : 'vazia');
      } else {
        console.error('❌ Elemento groqApiKey não encontrado');
      }

      // Groq Model
      if (this.elements.groqModelSelect) {
        const modelValue = config.groqModel || 'llama-3.1-8b-instant';
        this.elements.groqModelSelect.value = modelValue;
        console.log('🤖 Modelo populado:', modelValue);
      } else {
        console.error('❌ Elemento groqModelSelect não encontrado');
      }

      // Embedding API Keys
      if (this.elements.openaiApiKey) {
        this.elements.openaiApiKey.value = config.openaiApiKey || '';
        console.log('🔑 OpenAI API Key populada:', config.openaiApiKey ? 'sk-...' : 'vazia');
      }

      if (this.elements.cohereApiKey) {
        this.elements.cohereApiKey.value = config.cohereApiKey || '';
        console.log('🔑 Cohere API Key populada:', config.cohereApiKey ? 'co-...' : 'vazia');
      }

      if (this.elements.huggingfaceApiKey) {
        this.elements.huggingfaceApiKey.value = config.huggingFaceApiKey || '';
        console.log('🔑 Hugging Face API Key populada:', config.huggingFaceApiKey ? 'hf_...' : 'vazia');
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
    // Apenas Groq suportado
    if (apiType !== 'groq') return;

    const input = this.elements.groqApiKey;
    const statusElement = this.elements.groqApiStatus;
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
    // Apenas Groq suportado
    if (apiType === 'groq') {
      // Groq API keys começam com 'gsk_'
      return /^gsk_[A-Za-z0-9]{48,52}$/.test(key);
    }
    return false;
  }
  
  /**
   * Obtém configuração padrão
   */
  getDefaultConfiguration() {
    return {
      groqApiKey: '',
      groqModel: 'llama-3.1-8b-instant',
      openaiApiKey: '',
      cohereApiKey: '',
      huggingFaceApiKey: '',
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

    // Adicionar ao container
    this.elements.toastContainer.appendChild(toast);

    // Forçar reflow para animação
    toast.offsetHeight;

    // Adicionar classe show para animação
    toast.classList.add('show');

    // Remover após duração especificada
    setTimeout(() => {
      if (toast.parentNode) {
        // Animação de saída
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';

        // Remover do DOM após animação
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
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
      const hasGroq = this.currentConfig.groqApiKey && this.currentConfig.groqApiKey.length > 0;

      console.log('📊 Status da API Groq:', { hasGroq });

      if (this.elements.apiStatus) {
        if (hasGroq) {
          this.elements.apiStatus.innerHTML = '<span class="status-indicator active"></span>Groq AI Configurado';
        } else {
          this.elements.apiStatus.innerHTML = '<span class="status-indicator error"></span>Groq AI Não Configurado';
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
   * Atualiza status do Qdrant
   */
  async updateQdrantStatus() {
    console.log('🧠 Verificando status do Qdrant...');

    if (!this.elements.qdrantStatus) {
      console.warn('⚠️ Elemento qdrantStatus não encontrado');
      return;
    }

    const qdrantDetails = document.getElementById('qdrant-details');
    const qdrantItems = document.getElementById('qdrant-items');
    const qdrantThreshold = document.getElementById('qdrant-threshold');
    const qdrantCollectionStatus = document.getElementById('qdrant-collection-status');

    try {
      // Mostrar status de carregamento
      this.elements.qdrantStatus.innerHTML = `
        <span class="status-indicator loading"></span>
        <span class="status-text">Verificando conexão...</span>
      `;

      // Solicitar estatísticas do Qdrant via background script
      const response = await this.sendMessage('getQdrantStats', {});

      if (response && response.success && response.data.available) {
        // Qdrant disponível
        const stats = response.data;

        this.elements.qdrantStatus.innerHTML = `
          <span class="status-indicator active"></span>
          <span class="status-text">🟢 Conectado (localhost:6333)</span>
        `;

        // Mostrar detalhes
        if (qdrantDetails) {
          qdrantDetails.style.display = 'block';

          if (qdrantItems) qdrantItems.textContent = stats.total_points || 0;
          if (qdrantThreshold) qdrantThreshold.textContent = `${Math.round((stats.similarity_threshold || 0.85) * 100)}%`;
          if (qdrantCollectionStatus) qdrantCollectionStatus.textContent = stats.status || 'active';
        }

        console.log('✅ Qdrant disponível:', stats);
      } else {
        // Qdrant não disponível
        this.elements.qdrantStatus.innerHTML = `
          <span class="status-indicator warning"></span>
          <span class="status-text">🟡 Offline (Opcional)</span>
        `;

        // Esconder detalhes
        if (qdrantDetails) {
          qdrantDetails.style.display = 'none';
        }

        console.log('⚠️ Qdrant não disponível:', response?.data?.message || 'Sem resposta');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar Qdrant:', error);

      this.elements.qdrantStatus.innerHTML = `
        <span class="status-indicator error"></span>
        <span class="status-text">🔴 Erro de Conexão</span>
      `;

      // Esconder detalhes
      if (qdrantDetails) {
        qdrantDetails.style.display = 'none';
      }
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
      // Apenas Groq suportado
      if (apiType !== 'groq') {
        this.showToast('Apenas Groq AI é suportado', 'error');
        return;
      }

      const apiKey = this.elements.groqApiKey?.value?.trim();

      if (!apiKey) {
        this.showToast('Por favor, insira a API key primeiro', 'warning');
        return;
      }

      // Mostrar loading no botão
      const button = event.currentTarget;
      const originalContent = button.innerHTML;
      button.innerHTML = '<span class="test-icon">⏳</span>';
      button.disabled = true;

      // Obter modelo selecionado
      const model = this.elements.groqModelSelect?.value || 'llama-3.1-8b-instant';

      // Enviar para background script
      const response = await this.sendMessage('testGroqApi', { apiKey, model });

      if (response && response.success) {
        this.showToast(`Groq AI testado com sucesso! Modelo: ${model}`, 'success');
        console.log('✅ Teste de Groq API bem-sucedido:', response);
      } else {
        this.showToast(`Erro no teste do Groq AI: ${response?.error || 'Erro desconhecido'}`, 'error');
        console.error('❌ Erro no teste de Groq API:', response);
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

  handleModelChange() {
    const model = this.elements.groqModelSelect?.value || 'llama-3.1-8b-instant';
    console.log('🤖 Modelo Groq alterado para:', model);

    // Salvar automaticamente quando o modelo for alterado
    this.scheduleAutoSave();
  }
  
  async saveConfiguration(showFeedback = true) {
    console.log('💾 saveConfiguration chamada, showFeedback:', showFeedback);

    try {
      if (showFeedback) {
        this.showLoading('Salvando configurações...');
      }

      // Coletar dados do formulário - apenas Groq
      console.log('📝 Coletando dados do formulário...');
      console.log('🔑 Groq API Key atual:', this.elements.groqApiKey?.value?.substring(0, 10) + '...');

      const config = {
        groqApiKey: this.elements.groqApiKey?.value?.trim() || '',
        groqModel: this.elements.groqModelSelect?.value || 'llama-3.1-8b-instant',
        openaiApiKey: this.elements.openaiApiKey?.value?.trim() || '',
        cohereApiKey: this.elements.cohereApiKey?.value?.trim() || '',
        huggingFaceApiKey: this.elements.huggingfaceApiKey?.value?.trim() || '',
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

      // Atualizar configuração atual com os dados salvos
      this.currentConfig = { ...config };
      console.log('✅ Configuração atual atualizada:', this.currentConfig);

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
