/**
 * Testes E2E - Popup de Configurações
 * Testa interface e funcionalidade completa do popup
 */

const { test, expect } = require('@playwright/test');

test.describe('VeritasAI - Popup de Configurações', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    // Configurar contexto da extensão
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navegar para popup (simulado)
    await page.goto('data:text/html,<!DOCTYPE html><html><head><title>VeritasAI Popup</title></head><body></body></html>');
    
    // Carregar HTML do popup
    const popupHTML = await require('fs').promises.readFile('./src/popup/popup.html', 'utf8');
    await page.setContent(popupHTML);
    
    // Carregar CSS
    await page.addStyleTag({ path: './src/popup/popup.css' });
    
    // Mock do Chrome API
    await page.addScriptTag({
      content: `
        window.chrome = {
          runtime: {
            sendMessage: (message, callback) => {
              setTimeout(() => {
                if (message.action === 'getConfiguration') {
                  callback({
                    success: true,
                    data: {
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
                      verboseLogging: false
                    }
                  });
                } else if (message.action === 'testApiKey') {
                  callback({
                    success: true,
                    data: { connected: true }
                  });
                } else if (message.action === 'saveConfiguration') {
                  callback({
                    success: true,
                    data: message
                  });
                } else {
                  callback({ success: false, error: 'Unknown action' });
                }
              }, 100);
            },
            lastError: null
          },
          storage: {
            sync: {
              get: (keys, callback) => callback({}),
              set: (data, callback) => callback()
            }
          }
        };
      `
    });
    
    // Carregar JavaScript do popup
    await page.addScriptTag({ path: './src/popup/popup.js' });
    
    // Aguardar inicialização
    await page.waitForTimeout(200);
  });
  
  test('deve carregar interface corretamente', async () => {
    // Verificar elementos principais
    await expect(page.locator('.popup-header')).toBeVisible();
    await expect(page.locator('.popup-main')).toBeVisible();
    await expect(page.locator('.popup-footer')).toBeVisible();
    
    // Verificar título
    await expect(page.locator('.title')).toContainText('VeritasAI');
    
    // Verificar seções
    await expect(page.locator('.status-section')).toBeVisible();
    await expect(page.locator('.api-section')).toBeVisible();
    await expect(page.locator('.preferences-section')).toBeVisible();
  });
  
  test('deve exibir status do sistema', async () => {
    // Status da extensão
    const extensionStatus = page.locator('#extension-status');
    await expect(extensionStatus).toContainText('Ativa');
    
    // Status das APIs
    const apiStatus = page.locator('#api-status');
    await expect(apiStatus).toBeVisible();
  });
  
  test('deve validar API keys em tempo real', async () => {
    // Google API Key
    const googleInput = page.locator('#google-api-key');
    const googleStatus = page.locator('#google-api-status');
    const googleTestBtn = page.locator('[data-api="google"]');
    
    // Testar chave inválida
    await googleInput.fill('invalid-key');
    await expect(googleStatus).toContainText('Formato inválido');
    await expect(googleTestBtn).toBeDisabled();
    
    // Testar chave válida
    await googleInput.fill('AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI');
    await expect(googleStatus).toContainText('Formato válido');
    await expect(googleTestBtn).toBeEnabled();
    
    // Groq API Key
    const groqInput = page.locator('#groq-api-key');
    const groqStatus = page.locator('#groq-api-status');
    const groqTestBtn = page.locator('[data-api="groq"]');
    
    // Testar chave inválida
    await groqInput.fill('invalid-groq-key');
    await expect(groqStatus).toContainText('Formato inválido');
    await expect(groqTestBtn).toBeDisabled();
    
    // Testar chave válida
    await groqInput.fill('gsk_1234567890abcdef1234567890abcdef1234567890abcdef12');
    await expect(groqStatus).toContainText('Formato válido');
    await expect(groqTestBtn).toBeEnabled();
  });
  
  test('deve testar conectividade das APIs', async () => {
    // Configurar chave válida
    const googleInput = page.locator('#google-api-key');
    const googleTestBtn = page.locator('[data-api="google"]');
    const googleStatus = page.locator('#google-api-status');
    
    await googleInput.fill('AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI');
    
    // Clicar no botão de teste
    await googleTestBtn.click();
    
    // Verificar estado de teste
    await expect(googleStatus).toContainText('Testando...');
    
    // Aguardar resultado
    await expect(googleStatus).toContainText('Conexão bem-sucedida', { timeout: 5000 });
  });
  
  test('deve alternar visibilidade das senhas', async () => {
    const googleInput = page.locator('#google-api-key');
    const toggleBtn = page.locator('[data-target="google-api-key"]');
    
    // Verificar estado inicial (password)
    await expect(googleInput).toHaveAttribute('type', 'password');
    
    // Clicar para mostrar
    await toggleBtn.click();
    await expect(googleInput).toHaveAttribute('type', 'text');
    
    // Clicar para ocultar
    await toggleBtn.click();
    await expect(googleInput).toHaveAttribute('type', 'password');
  });
  
  test('deve gerenciar preferências do usuário', async () => {
    // Idioma
    const languageSelect = page.locator('#language-select');
    await languageSelect.selectOption('en-US');
    await expect(languageSelect).toHaveValue('en-US');
    
    // Tema
    const themeSelect = page.locator('#theme-select');
    await themeSelect.selectOption('dark');
    await expect(themeSelect).toHaveValue('dark');
    
    // Checkboxes
    const notificationsCheckbox = page.locator('#notifications-enabled');
    await notificationsCheckbox.uncheck();
    await expect(notificationsCheckbox).not.toBeChecked();
    
    const autoVerifyCheckbox = page.locator('#auto-verify');
    await autoVerifyCheckbox.check();
    await expect(autoVerifyCheckbox).toBeChecked();
  });
  
  test('deve expandir configurações avançadas', async () => {
    const advancedDetails = page.locator('.advanced-details');
    const advancedContent = page.locator('.advanced-content');
    
    // Verificar estado inicial (fechado)
    await expect(advancedContent).not.toBeVisible();
    
    // Expandir
    await advancedDetails.click();
    await expect(advancedContent).toBeVisible();
    
    // Testar campos avançados
    const timeoutInput = page.locator('#timeout-input');
    await timeoutInput.fill('45');
    await expect(timeoutInput).toHaveValue('45');
    
    const maxTextInput = page.locator('#max-text-length');
    await maxTextInput.fill('3000');
    await expect(maxTextInput).toHaveValue('3000');
  });
  
  test('deve salvar configurações', async () => {
    // Preencher formulário
    await page.locator('#google-api-key').fill('AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI');
    await page.locator('#language-select').selectOption('en-US');
    await page.locator('#theme-select').selectOption('dark');
    
    // Clicar em salvar
    const saveBtn = page.locator('#save-btn');
    await saveBtn.click();
    
    // Verificar feedback
    const saveStatus = page.locator('#save-status');
    await expect(saveStatus).toContainText('Configurações salvas', { timeout: 3000 });
  });
  
  test('deve restaurar configurações padrão', async () => {
    // Alterar algumas configurações
    await page.locator('#language-select').selectOption('en-US');
    await page.locator('#theme-select').selectOption('dark');
    
    // Configurar mock para confirmação
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    
    // Clicar em restaurar
    const resetBtn = page.locator('#reset-btn');
    await resetBtn.click();
    
    // Verificar se voltou aos padrões
    await expect(page.locator('#language-select')).toHaveValue('pt-BR');
    await expect(page.locator('#theme-select')).toHaveValue('auto');
  });
  
  test('deve ser responsivo', async () => {
    // Testar em diferentes tamanhos
    const viewports = [
      { width: 420, height: 600 },
      { width: 380, height: 500 },
      { width: 320, height: 480 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Verificar que elementos principais são visíveis
      await expect(page.locator('.popup-header')).toBeVisible();
      await expect(page.locator('.popup-main')).toBeVisible();
      await expect(page.locator('.popup-footer')).toBeVisible();
      
      // Verificar que não há overflow horizontal
      const body = await page.locator('body').boundingBox();
      expect(body.width).toBeLessThanOrEqual(viewport.width);
    }
  });
  
  test('deve ter acessibilidade adequada', async () => {
    // Verificar atributos ARIA
    await expect(page.locator('.status-section')).toHaveAttribute('aria-labelledby', 'status-title');
    await expect(page.locator('.api-section')).toHaveAttribute('aria-labelledby', 'api-title');
    
    // Verificar labels
    await expect(page.locator('label[for="google-api-key"]')).toBeVisible();
    await expect(page.locator('label[for="groq-api-key"]')).toBeVisible();
    
    // Verificar navegação por teclado
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Verificar que todos os botões têm aria-label
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasText = await button.textContent();
      
      // Botão deve ter aria-label ou texto visível
      expect(hasAriaLabel || hasText?.trim()).toBeTruthy();
    }
  });
  
  test('deve exibir notificações toast', async () => {
    // Simular ação que gera toast
    await page.locator('#google-api-key').fill('AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI');
    await page.locator('[data-api="google"]').click();
    
    // Verificar toast de sucesso
    const toastContainer = page.locator('#toast-container');
    await expect(toastContainer.locator('.toast')).toBeVisible({ timeout: 3000 });
    
    // Toast deve desaparecer automaticamente
    await expect(toastContainer.locator('.toast')).not.toBeVisible({ timeout: 5000 });
  });
  
  test('deve funcionar com atalhos de teclado', async () => {
    // Preencher formulário
    await page.locator('#google-api-key').fill('test-key');
    
    // Usar Ctrl+S para salvar
    await page.keyboard.press('Control+s');
    
    // Verificar que salvamento foi acionado
    const saveStatus = page.locator('#save-status');
    await expect(saveStatus).toContainText('Configurações salvas', { timeout: 3000 });
    
    // Testar Escape para fechar loading (se houver)
    await page.keyboard.press('Escape');
  });
  
  test('deve tratar erros graciosamente', async () => {
    // Mock de erro na API
    await page.evaluate(() => {
      window.chrome.runtime.sendMessage = (message, callback) => {
        setTimeout(() => {
          callback({ success: false, error: 'Erro simulado' });
        }, 100);
      };
    });
    
    // Tentar carregar configurações
    await page.reload();
    
    // Verificar que erro é tratado sem quebrar a interface
    await expect(page.locator('.popup-header')).toBeVisible();
    
    // Verificar toast de erro
    const toastContainer = page.locator('#toast-container');
    await expect(toastContainer.locator('.toast.error')).toBeVisible({ timeout: 3000 });
  });
  
  test('deve manter estado durante sessão', async () => {
    // Preencher formulário
    await page.locator('#google-api-key').fill('test-key');
    await page.locator('#language-select').selectOption('en-US');
    
    // Simular mudança de foco (blur/focus)
    await page.locator('body').click();
    await page.locator('#google-api-key').focus();
    
    // Verificar que valores são mantidos
    await expect(page.locator('#google-api-key')).toHaveValue('test-key');
    await expect(page.locator('#language-select')).toHaveValue('en-US');
  });
});
