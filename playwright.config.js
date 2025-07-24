/**
 * Playwright Configuration for VeritasAI Extension
 * Configuração para testes E2E da extensão de navegador
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Diretório dos testes
  testDir: './tests/e2e',
  
  // Timeout global
  timeout: 30000,
  
  // Timeout para expects
  expect: {
    timeout: 5000
  },
  
  // Configuração de retry
  retries: process.env.CI ? 2 : 0,
  
  // Workers paralelos
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  // Configuração global
  use: {
    // Timeout para ações
    actionTimeout: 10000,
    
    // Timeout para navegação
    navigationTimeout: 15000,
    
    // Base URL
    baseURL: 'https://example.com',
    
    // Trace
    trace: 'on-first-retry',
    
    // Screenshot
    screenshot: 'only-on-failure',
    
    // Video
    video: 'retain-on-failure',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Locale
    locale: 'pt-BR',
    
    // Timezone
    timezoneId: 'America/Sao_Paulo'
  },
  
  // Configuração de projetos (diferentes navegadores)
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Configuração específica para extensão
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`,
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ],
          headless: false // Extensões precisam de modo não-headless
        }
      }
    },
    
    {
      name: 'chrome-extension-headless',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`,
            '--disable-web-security',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--headless=new'
          ]
        }
      }
    },
    
    {
      name: 'firefox-extension',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'extensions.autoDisableScopes': 0,
            'extensions.enabledScopes': 15,
            'xpinstall.signatures.required': false
          }
        }
      }
    },
    
    // Testes em diferentes resoluções
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`
          ]
        }
      }
    },
    
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad Pro'],
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`
          ]
        }
      }
    }
  ],
  
  // Configuração de servidor de desenvolvimento (se necessário)
  webServer: process.env.CI ? undefined : {
    command: 'npm run serve:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  
  // Diretório de saída
  outputDir: 'test-results/',
  
  // Configurações globais de setup
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  
  // Configuração de metadata
  metadata: {
    'test-type': 'e2e',
    'extension': 'VeritasAI',
    'version': '1.0.0'
  },
  
  // Configuração de fixtures
  testIdAttribute: 'data-testid',
  
  // Configuração de network
  use: {
    ...devices['Desktop Chrome'].use,
    
    // Interceptar requests
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
    },
    
    // Configuração de proxy (se necessário)
    // proxy: {
    //   server: 'http://localhost:8080'
    // },
    
    // Configuração de storage state (para login persistente)
    // storageState: 'tests/e2e/auth.json'
  },
  
  // Configuração de expect
  expect: {
    // Timeout para expects
    timeout: 5000,
    
    // Configuração de screenshots
    toHaveScreenshot: {
      mode: 'css',
      animations: 'disabled'
    },
    
    // Configuração de comparação visual
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 100
    }
  },
  
  // Configuração de test info
  testInfo: {
    // Anexar logs automaticamente
    attachments: [
      {
        name: 'extension-logs',
        path: 'test-results/extension-logs.txt',
        contentType: 'text/plain'
      }
    ]
  }
});
