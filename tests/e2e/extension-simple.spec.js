/**
 * Teste simples para verificar se a extensão está funcionando
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

test('teste simples de carregamento da extensão', async () => {
  const extensionPath = path.resolve('./dist');
  
  // Lançar o navegador com a extensão
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar logs do console
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });

  // Navegar para uma página simples
  await page.goto('https://example.com');
  
  // Aguardar um pouco para o content script carregar
  await page.waitForTimeout(3000);

  // Exibir logs
  console.log('📋 Console logs:', consoleLogs);

  // Verificar se VeritasAI foi definido
  const veritasAI = await page.evaluate(() => {
    return typeof window.VeritasAI !== 'undefined';
  });

  console.log('🔍 VeritasAI encontrado:', veritasAI);

  // Verificar se há páginas de extensão
  const allPages = context.pages();
  const extensionPages = allPages.filter(p => p.url().startsWith('chrome-extension://'));
  console.log('🔌 Páginas de extensão:', extensionPages.length);

  await browser.close();

  // Verificar se funcionou
  expect(veritasAI).toBe(true);
});
