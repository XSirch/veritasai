/**
 * Playwright Global Setup
 * Configuração global executada antes de todos os testes E2E
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup() {
  console.log('🚀 Iniciando setup global dos testes E2E...');
  
  // Verificar se a extensão foi buildada
  const distPath = path.resolve('./dist');
  const manifestPath = path.join(distPath, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Extensão não encontrada em ./dist/');
    console.log('💡 Execute "npm run build" antes dos testes E2E');
    process.exit(1);
  }
  
  console.log('✅ Extensão encontrada em ./dist/');
  
  // Verificar se o manifest é válido
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`✅ Manifest válido - ${manifest.name} v${manifest.version}`);
  } catch (error) {
    console.error('❌ Manifest inválido:', error.message);
    process.exit(1);
  }
  
  // Criar diretório de resultados
  const resultsDir = path.resolve('./test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log('📁 Diretório de resultados criado');
  }
  
  // Testar carregamento da extensão
  console.log('🔍 Testando carregamento da extensão...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
      '--disable-web-security',
      '--no-sandbox'
    ]
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Verificar se a extensão foi carregada
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);
    
    // Procurar pela extensão na lista
    const extensionFound = await page.locator('text=VeritasAI').isVisible();
    
    if (extensionFound) {
      console.log('✅ Extensão carregada com sucesso no Chrome');
    } else {
      console.warn('⚠️ Extensão pode não ter sido carregada corretamente');
    }
    
    await context.close();
  } catch (error) {
    console.error('❌ Erro ao testar carregamento da extensão:', error.message);
  } finally {
    await browser.close();
  }
  
  // Configurar variáveis de ambiente para os testes
  process.env.EXTENSION_PATH = distPath;
  process.env.TEST_RESULTS_DIR = resultsDir;
  
  // Criar arquivo de configuração para os testes
  const testConfig = {
    extensionPath: distPath,
    resultsDir: resultsDir,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test'
  };
  
  fs.writeFileSync(
    path.join(resultsDir, 'test-config.json'),
    JSON.stringify(testConfig, null, 2)
  );
  
  console.log('✅ Setup global concluído');
  
  return testConfig;
}

export default globalSetup;
