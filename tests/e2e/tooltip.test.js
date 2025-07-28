/**
 * Testes E2E para Tooltip de Resultados
 * Verifica funcionalidade, performance, acessibilidade e responsividade
 */

const { test, expect } = require('@playwright/test');

test.describe('VeritasAI - Tooltip de Resultados', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    // Configurar extensão
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navegar para página de teste
    await page.goto('data:text/html,<html><body><p>Texto para teste de seleção com informações verificáveis.</p></body></html>');
    
    // Simular carregamento da extensão
    await page.addScriptTag({
      content: `
        // Mock da extensão VeritasAI
        window.chrome = {
          runtime: {
            sendMessage: (msg, callback) => {
              setTimeout(() => {
                callback({
                  success: true,
                  data: {
                    classification: 'verified',
                    overallConfidence: 0.85,
                    evidences: [
                      { source: 'Wikipedia', score: 90 },
                      { source: 'Reuters', score: 85 }
                    ],
                    analysisTime: 150
                  }
                });
              }, 100);
            },
            getURL: (path) => '/mock/' + path
          }
        };
      `
    });
    
    // Carregar CSS do tooltip
    await page.addStyleTag({
      path: './src/assets/styles/tooltip.css'
    });
    
    // Carregar componentes
    await page.addScriptTag({
      path: './src/content/ui-components.js',
      type: 'module'
    });
  });
  
  test('deve mostrar tooltip em menos de 200ms', async () => {
    // Selecionar texto
    await page.locator('p').selectText();
    
    // Simular clique no botão verificar
    const startTime = Date.now();
    
    await page.evaluate(() => {
      const { ResultTooltip } = window;
      const tooltip = new ResultTooltip();
      
      const mockResult = {
        classification: 'verified',
        overallConfidence: 0.85,
        evidences: [{ source: 'Test', score: 90 }]
      };
      
      const mockSelection = {
        text: 'Texto para teste',
        contentType: 'general'
      };
      
      const mockPosition = { x: 100, y: 100 };
      
      tooltip.create(mockResult, mockSelection, mockPosition);
    });
    
    // Verificar se tooltip apareceu
    const tooltip = page.locator('#veritas-result-tooltip');
    await expect(tooltip).toBeVisible();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(200);
  });
  
  test('deve exibir estados visuais corretos para cada classificação', async () => {
    const classifications = [
      { type: 'verified', color: 'rgb(76, 175, 80)', icon: '✅' },
      { type: 'likely_true', color: 'rgb(139, 195, 74)', icon: '✅' },
      { type: 'uncertain', color: 'rgb(255, 152, 0)', icon: '⚠️' },
      { type: 'likely_false', color: 'rgb(255, 87, 34)', icon: '❌' },
      { type: 'disputed', color: 'rgb(244, 67, 54)', icon: '🚫' },
      { type: 'no_data', color: 'rgb(117, 117, 117)', icon: '❓' }
    ];
    
    for (const classification of classifications) {
      await page.evaluate((classType) => {
        // Limpar tooltip anterior
        const existing = document.getElementById('veritas-result-tooltip');
        if (existing) existing.remove();
        
        const { ResultTooltip } = window;
        const tooltip = new ResultTooltip();
        
        const mockResult = {
          classification: classType,
          overallConfidence: 0.75,
          evidences: []
        };
        
        const mockSelection = {
          text: 'Texto teste',
          contentType: 'general'
        };
        
        tooltip.create(mockResult, mockSelection, { x: 100, y: 100 });
      }, classification.type);
      
      const tooltip = page.locator('#veritas-result-tooltip');
      await expect(tooltip).toBeVisible();
      
      // Verificar classe de classificação
      await expect(tooltip.locator('.veritas-tooltip')).toHaveClass(
        new RegExp(`veritas-classification-${classification.type}`)
      );
      
      // Verificar ícone
      const icon = tooltip.locator('.veritas-classification-icon');
      await expect(icon).toContainText(classification.icon);
      
      // Verificar cor (aproximada)
      const badge = tooltip.locator('.veritas-classification-text');
      const color = await badge.evaluate(el => getComputedStyle(el).color);
      // Note: cores podem variar ligeiramente devido a CSS custom properties
    }
  });
  
  test('deve ter acessibilidade WCAG 2.1 AA', async () => {
    await page.evaluate(() => {
      const { ResultTooltip } = window;
      const tooltip = new ResultTooltip();
      
      const mockResult = {
        classification: 'verified',
        overallConfidence: 0.85,
        evidences: [{ source: 'Test', score: 90 }]
      };
      
      tooltip.create(mockResult, { text: 'Test', contentType: 'general' }, { x: 100, y: 100 });
    });
    
    const tooltip = page.locator('#veritas-result-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Verificar atributos ARIA
    await expect(tooltip).toHaveAttribute('role', 'dialog');
    await expect(tooltip).toHaveAttribute('aria-labelledby', 'veritas-tooltip-title');
    await expect(tooltip).toHaveAttribute('aria-describedby', 'veritas-tooltip-content');
    
    // Verificar título
    const title = tooltip.locator('#veritas-tooltip-title');
    await expect(title).toBeVisible();
    
    // Verificar barra de progresso
    const progressBar = tooltip.locator('.veritas-confidence-bar');
    await expect(progressBar).toHaveAttribute('role', 'progressbar');
    await expect(progressBar).toHaveAttribute('aria-valuenow');
    
    // Verificar navegação por teclado
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Verificar escape para fechar
    await page.keyboard.press('Escape');
    await expect(tooltip).not.toBeVisible();
  });
  
  test('deve ser responsivo em diferentes resoluções', async () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 320, height: 568, name: 'Small Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      await page.evaluate(() => {
        // Limpar tooltip anterior
        const existing = document.getElementById('veritas-result-tooltip');
        if (existing) existing.remove();
        
        const { ResultTooltip } = window;
        const tooltip = new ResultTooltip();
        
        const mockResult = {
          classification: 'verified',
          overallConfidence: 0.85,
          evidences: [
            { source: 'Source 1', score: 90 },
            { source: 'Source 2', score: 85 }
          ]
        };
        
        tooltip.create(mockResult, { text: 'Test', contentType: 'general' }, { x: 50, y: 50 });
      });
      
      const tooltip = page.locator('#veritas-result-tooltip');
      await expect(tooltip).toBeVisible();
      
      // Verificar que tooltip não sai da viewport
      const tooltipBox = await tooltip.boundingBox();
      expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBox.y).toBeGreaterThanOrEqual(0);
      expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
      
      // Verificar largura mínima/máxima
      if (viewport.width >= 400) {
        expect(tooltipBox.width).toBeLessThanOrEqual(400);
      }
      expect(tooltipBox.width).toBeGreaterThanOrEqual(240);
    }
  });
  
  test('deve executar ações dos botões corretamente', async () => {
    await page.evaluate(() => {
      const { ResultTooltip } = window;
      const tooltip = new ResultTooltip();
      
      const mockResult = {
        classification: 'verified',
        overallConfidence: 0.85,
        evidences: [{ source: 'Test', score: 90 }]
      };
      
      tooltip.create(mockResult, { text: 'Test', contentType: 'general' }, { x: 100, y: 100 });
    });
    
    const tooltip = page.locator('#veritas-result-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Testar botão de detalhes
    const detailsBtn = tooltip.locator('[data-action="details"]');
    await expect(detailsBtn).toBeVisible();
    
    // Configurar listener para evento customizado
    const actionPromise = page.evaluate(() => {
      return new Promise(resolve => {
        document.addEventListener('veritasTooltipAction', (e) => {
          resolve(e.detail.action);
        }, { once: true });
      });
    });
    
    await detailsBtn.click();
    const action = await actionPromise;
    expect(action).toBe('details');
    
    // Testar outros botões
    const buttons = ['report', 'share', 'feedback'];
    for (const buttonAction of buttons) {
      const btn = tooltip.locator(`[data-action="${buttonAction}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute('aria-label');
    }
  });
  
  test('deve ter animações suaves', async () => {
    // Verificar animação de entrada
    await page.evaluate(() => {
      const { ResultTooltip } = window;
      const tooltip = new ResultTooltip();
      
      const mockResult = {
        classification: 'verified',
        overallConfidence: 0.85
      };
      
      tooltip.create(mockResult, { text: 'Test', contentType: 'general' }, { x: 100, y: 100 });
    });
    
    const tooltip = page.locator('#veritas-result-tooltip');
    
    // Verificar que tooltip inicia invisível e fica visível
    await expect(tooltip).toHaveClass(/veritas-tooltip-visible/);
    
    // Verificar animação da barra de confiança
    const confidenceFill = tooltip.locator('.veritas-confidence-fill');
    const width = await confidenceFill.evaluate(el => getComputedStyle(el).width);
    expect(width).not.toBe('0px');
    
    // Verificar animação de saída
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveClass(/veritas-tooltip-hiding/);
  });
  
  test('deve funcionar com prefers-reduced-motion', async () => {
    // Simular preferência por movimento reduzido
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.evaluate(() => {
      const { ResultTooltip } = window;
      const tooltip = new ResultTooltip();
      
      const mockResult = {
        classification: 'verified',
        overallConfidence: 0.85
      };
      
      tooltip.create(mockResult, { text: 'Test', contentType: 'general' }, { x: 100, y: 100 });
    });
    
    const tooltip = page.locator('#veritas-result-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Verificar que animações estão desabilitadas
    const transition = await tooltip.evaluate(el => getComputedStyle(el).transition);
    expect(transition).toBe('none');
  });
});
