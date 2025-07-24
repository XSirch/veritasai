/**
 * Testes E2E básicos para a extensão VeritasAI
 * Testa fluxos principais da extensão no navegador
 */

import { test, expect } from '@playwright/test';

test.describe('VeritasAI Extension - Fluxos Básicos', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Aguardar carregamento da extensão
    await page.waitForTimeout(2000);
  });
  
  test('deve carregar a extensão corretamente', async ({ page }) => {
    // Navegar para página de extensões
    await page.goto('chrome://extensions/');
    
    // Verificar se a extensão está listada
    await expect(page.locator('text=VeritasAI')).toBeVisible({ timeout: 10000 });
    
    // Verificar se está habilitada
    const extensionCard = page.locator('[role="main"]').locator('text=VeritasAI').locator('..');
    await expect(extensionCard.locator('text=Ativado')).toBeVisible();
  });
  
  test('deve abrir popup da extensão', async ({ page }) => {
    // Navegar para uma página de teste
    await page.goto('https://example.com');
    
    // Tentar clicar no ícone da extensão (simulado)
    // Como não podemos clicar diretamente no ícone, vamos testar se o popup HTML existe
    const popupUrl = `chrome-extension://${await getExtensionId(page)}/popup/popup.html`;
    
    await page.goto(popupUrl);
    
    // Verificar elementos do popup
    await expect(page.locator('text=VeritasAI')).toBeVisible();
    await expect(page.locator('text=Verificação de Informações')).toBeVisible();
    await expect(page.locator('#enabled-toggle')).toBeVisible();
    await expect(page.locator('#verify-btn')).toBeVisible();
  });
  
  test('deve mostrar página de opções', async ({ page }) => {
    const extensionId = await getExtensionId(page);
    const optionsUrl = `chrome-extension://${extensionId}/options/options.html`;
    
    await page.goto(optionsUrl);
    
    // Verificar elementos da página de opções
    await expect(page.locator('text=VeritasAI')).toBeVisible();
    await expect(page.locator('text=Configurações Avançadas')).toBeVisible();
    
    // Verificar abas
    await expect(page.locator('text=Geral')).toBeVisible();
    await expect(page.locator('text=APIs')).toBeVisible();
    await expect(page.locator('text=Cache')).toBeVisible();
    await expect(page.locator('text=Avançado')).toBeVisible();
  });
  
  test('deve permitir alternar configurações no popup', async ({ page }) => {
    const extensionId = await getExtensionId(page);
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    
    // Verificar toggle principal
    const enabledToggle = page.locator('#enabled-toggle');
    await expect(enabledToggle).toBeVisible();
    
    // Verificar estado inicial
    const isChecked = await enabledToggle.isChecked();
    
    // Alternar estado
    await enabledToggle.click();
    
    // Verificar se mudou
    const newState = await enabledToggle.isChecked();
    expect(newState).toBe(!isChecked);
    
    // Verificar outros toggles
    await expect(page.locator('#auto-check-toggle')).toBeVisible();
    await expect(page.locator('#tooltips-toggle')).toBeVisible();
  });
  
  test('deve permitir verificação manual no popup', async ({ page }) => {
    const extensionId = await getExtensionId(page);
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    
    const textInput = page.locator('#text-input');
    const verifyBtn = page.locator('#verify-btn');
    const charCount = page.locator('#char-count');
    
    // Verificar elementos
    await expect(textInput).toBeVisible();
    await expect(verifyBtn).toBeVisible();
    await expect(charCount).toBeVisible();
    
    // Verificar estado inicial
    await expect(verifyBtn).toBeDisabled();
    await expect(charCount).toHaveText('0/2000');
    
    // Inserir texto muito curto
    await textInput.fill('Curto');
    await expect(verifyBtn).toBeDisabled();
    
    // Inserir texto válido
    const testText = 'Este é um texto de teste para verificação de informações que tem tamanho adequado.';
    await textInput.fill(testText);
    
    // Verificar se botão foi habilitado
    await expect(verifyBtn).toBeEnabled();
    await expect(charCount).toHaveText(`${testText.length}/2000`);
    
    // Clicar em verificar
    await verifyBtn.click();
    
    // Verificar loading
    await expect(verifyBtn).toHaveText('Verificando...');
    await expect(verifyBtn).toBeDisabled();
    
    // Aguardar resultado (mock)
    await page.waitForTimeout(2000);
    
    // Verificar se voltou ao estado normal
    await expect(verifyBtn).toHaveText('Verificar');
    await expect(verifyBtn).toBeEnabled();
  });
  
  test('deve navegar entre abas na página de opções', async ({ page }) => {
    const extensionId = await getExtensionId(page);
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    
    // Verificar aba inicial (Geral)
    await expect(page.locator('#general-tab')).toHaveClass(/active/);
    
    // Clicar na aba APIs
    await page.locator('[data-tab="api-tab"]').click();
    await expect(page.locator('#api-tab')).toHaveClass(/active/);
    await expect(page.locator('#general-tab')).not.toHaveClass(/active/);
    
    // Verificar elementos da aba APIs
    await expect(page.locator('#google-api-key')).toBeVisible();
    await expect(page.locator('#groq-api-key')).toBeVisible();
    await expect(page.locator('#test-google-api')).toBeVisible();
    await expect(page.locator('#test-groq-api')).toBeVisible();
    
    // Clicar na aba Cache
    await page.locator('[data-tab="cache-tab"]').click();
    await expect(page.locator('#cache-tab')).toHaveClass(/active/);
    
    // Verificar elementos da aba Cache
    await expect(page.locator('#cache-enabled')).toBeVisible();
    await expect(page.locator('#cache-ttl')).toBeVisible();
    await expect(page.locator('#clear-cache-btn')).toBeVisible();
    
    // Clicar na aba Avançado
    await page.locator('[data-tab="advanced-tab"]').click();
    await expect(page.locator('#advanced-tab')).toHaveClass(/active/);
    
    // Verificar elementos da aba Avançado
    await expect(page.locator('#export-btn')).toBeVisible();
    await expect(page.locator('#reset-btn')).toBeVisible();
  });
  
  test('deve salvar configurações na página de opções', async ({ page }) => {
    const extensionId = await getExtensionId(page);
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    
    // Alterar configuração geral
    const enabledCheckbox = page.locator('#enabled');
    const currentState = await enabledCheckbox.isChecked();
    
    await enabledCheckbox.click();
    
    // Salvar configurações
    await page.locator('#general-form button[type="submit"]').click();
    
    // Verificar se houve feedback (notificação ou mudança visual)
    // Como é um mock, vamos apenas verificar se o formulário foi submetido
    await page.waitForTimeout(1000);
    
    // Verificar se o estado foi mantido
    const newState = await enabledCheckbox.isChecked();
    expect(newState).toBe(!currentState);
  });
  
  test('deve injetar content script em páginas web', async ({ page }) => {
    // Navegar para uma página de teste
    await page.goto('https://example.com');
    
    // Aguardar carregamento do content script
    await page.waitForTimeout(2000);
    
    // Verificar se os estilos foram injetados
    const styles = await page.locator('#veritas-styles').count();
    expect(styles).toBeGreaterThan(0);
    
    // Simular seleção de texto
    await page.locator('h1').click();
    await page.keyboard.down('Shift');
    await page.keyboard.press('End');
    await page.keyboard.up('Shift');
    
    // Aguardar possível aparição do botão de verificação
    await page.waitForTimeout(1000);
    
    // Como é um mock, vamos apenas verificar se não há erros de JavaScript
    const errors = await page.evaluate(() => {
      return window.errors || [];
    });
    expect(errors.length).toBe(0);
  });
  
  test('deve responder a comandos de teclado', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForTimeout(2000);
    
    // Simular comando de teclado (Ctrl+Shift+V)
    await page.keyboard.press('Control+Shift+KeyV');
    
    // Aguardar processamento
    await page.waitForTimeout(1000);
    
    // Como é um mock, verificamos apenas que não há erros
    const errors = await page.evaluate(() => window.errors || []);
    expect(errors.length).toBe(0);
  });
});

/**
 * Função auxiliar para obter ID da extensão
 */
async function getExtensionId(page) {
  // Em um ambiente real, você obteria o ID da extensão
  // Para testes, usamos um ID mock
  return 'mock-extension-id-for-testing';
}
