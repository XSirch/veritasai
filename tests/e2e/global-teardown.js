/**
 * Playwright Global Teardown
 * Limpeza executada após todos os testes E2E
 */

import fs from 'fs';
import path from 'path';

async function globalTeardown() {
  console.log('🧹 Iniciando teardown global dos testes E2E...');
  
  const resultsDir = path.resolve('./test-results');
  
  try {
    // Ler configuração dos testes
    const configPath = path.join(resultsDir, 'test-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`📊 Testes executados em: ${config.timestamp}`);
    }
    
    // Gerar resumo dos resultados
    const summaryPath = path.join(resultsDir, 'summary.txt');
    const summary = `
VeritasAI E2E Test Summary
=========================
Timestamp: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'test'}
Extension Path: ${process.env.EXTENSION_PATH || './dist'}

Test Results Directory: ${resultsDir}
- HTML Report: ${path.join(resultsDir, 'html-report/index.html')}
- JSON Results: ${path.join(resultsDir, 'results.json')}
- JUnit XML: ${path.join(resultsDir, 'junit.xml')}

To view the HTML report:
npm run test:e2e:report

To run tests again:
npm run test:e2e
`;
    
    fs.writeFileSync(summaryPath, summary);
    console.log('📄 Resumo dos testes salvo em test-results/summary.txt');
    
    // Limpar arquivos temporários (se necessário)
    const tempFiles = [
      path.join(resultsDir, 'test-config.json')
    ];
    
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️ Arquivo temporário removido: ${path.basename(file)}`);
      }
    });
    
    console.log('✅ Teardown global concluído');
    
  } catch (error) {
    console.error('❌ Erro no teardown global:', error.message);
  }
}

export default globalTeardown;
