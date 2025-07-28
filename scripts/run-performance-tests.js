#!/usr/bin/env node

/**
 * VER-023: Script para executar testes de performance
 * Executa testes de performance e gera relatórios detalhados
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando testes de performance...\n');

// Configurações
const config = {
  testDir: './tests/performance',
  outputDir: './performance-reports',
  thresholds: {
    keywordExtractor: {
      shortText: 50,    // ms
      mediumText: 100,  // ms
      longText: 200     // ms
    },
    extension: {
      backgroundInit: 100,  // ms
      messageProcessing: 50, // ms
      uiInjection: 30,      // ms
      textDetection: 20,    // ms
      popupLoad: 200,       // ms
      configSave: 100,      // ms
      optionsLoad: 300      // ms
    },
    memory: {
      maxIncrease: 10 * 1024 * 1024, // 10MB
      extensionMax: 5 * 1024 * 1024   // 5MB
    },
    storage: {
      syncRead: 20,   // ms
      syncWrite: 30   // ms
    },
    communication: {
      avgMessage: 40, // ms
      maxMessage: 80  // ms
    }
  }
};

async function main() {
  try {
    // Criar diretório de relatórios
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Executar testes de performance
    console.log('📊 Executando testes de performance...');
    const testResults = await runPerformanceTests();
    
    // Gerar relatório
    console.log('📝 Gerando relatório de performance...');
    const report = generatePerformanceReport(testResults);
    
    // Salvar relatório
    const reportPath = path.join(config.outputDir, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Gerar relatório HTML
    const htmlReport = generateHTMLReport(report);
    const htmlPath = path.join(config.outputDir, 'performance-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    // Verificar thresholds
    const thresholdResults = checkThresholds(report);
    
    // Exibir resultados
    displayResults(report, thresholdResults);
    
    console.log(`\n📁 Relatórios salvos em:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
    
    // Exit code baseado nos thresholds
    const passed = thresholdResults.every(result => result.passed);
    process.exit(passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Erro ao executar testes de performance:', error.message);
    process.exit(1);
  }
}

async function runPerformanceTests() {
  try {
    // Executar testes Jest para performance
    const output = execSync('npm run test:performance', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    return parseTestOutput(output);
  } catch (error) {
    // Jest pode retornar exit code 1 mesmo com testes passando
    // se os thresholds não forem atingidos
    return parseTestOutput(error.stdout || error.message);
  }
}

function parseTestOutput(output) {
  // Extrair métricas do output dos testes
  const results = {
    keywordExtractor: {},
    extension: {},
    memory: {},
    storage: {},
    communication: {},
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      executionTime: 0
    }
  };
  
  // Parse básico do output (implementação simplificada)
  const lines = output.split('\n');
  
  lines.forEach(line => {
    // Extrair informações de tempo dos testes
    if (line.includes('ms')) {
      const timeMatch = line.match(/(\d+\.?\d*)\s*ms/);
      if (timeMatch) {
        const time = parseFloat(timeMatch[1]);
        
        if (line.includes('KeywordExtractor')) {
          if (line.includes('texto curto')) {
            results.keywordExtractor.shortText = time;
          } else if (line.includes('texto médio')) {
            results.keywordExtractor.mediumText = time;
          } else if (line.includes('texto longo')) {
            results.keywordExtractor.longText = time;
          }
        }
        
        if (line.includes('background script')) {
          results.extension.backgroundInit = time;
        }
        
        if (line.includes('mensagens')) {
          results.extension.messageProcessing = time;
        }
      }
    }
    
    // Contar testes
    if (line.includes('✓') || line.includes('√')) {
      results.summary.passedTests++;
    } else if (line.includes('✗') || line.includes('×')) {
      results.summary.failedTests++;
    }
  });
  
  results.summary.totalTests = results.summary.passedTests + results.summary.failedTests;
  
  return results;
}

function generatePerformanceReport(testResults) {
  return {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    results: testResults,
    thresholds: config.thresholds,
    summary: {
      ...testResults.summary,
      status: testResults.summary.failedTests === 0 ? 'PASSED' : 'FAILED'
    }
  };
}

function checkThresholds(report) {
  const results = [];
  
  // Verificar thresholds do KeywordExtractor
  if (report.results.keywordExtractor.shortText) {
    results.push({
      test: 'KeywordExtractor - Texto Curto',
      value: report.results.keywordExtractor.shortText,
      threshold: config.thresholds.keywordExtractor.shortText,
      passed: report.results.keywordExtractor.shortText <= config.thresholds.keywordExtractor.shortText
    });
  }
  
  if (report.results.keywordExtractor.mediumText) {
    results.push({
      test: 'KeywordExtractor - Texto Médio',
      value: report.results.keywordExtractor.mediumText,
      threshold: config.thresholds.keywordExtractor.mediumText,
      passed: report.results.keywordExtractor.mediumText <= config.thresholds.keywordExtractor.mediumText
    });
  }
  
  // Verificar thresholds da extensão
  if (report.results.extension.backgroundInit) {
    results.push({
      test: 'Background Script - Inicialização',
      value: report.results.extension.backgroundInit,
      threshold: config.thresholds.extension.backgroundInit,
      passed: report.results.extension.backgroundInit <= config.thresholds.extension.backgroundInit
    });
  }
  
  return results;
}

function displayResults(report, thresholdResults) {
  console.log('\n📊 Resultados dos Testes de Performance:');
  console.log('=' .repeat(50));
  
  console.log(`\n📈 Resumo:`);
  console.log(`   Total de testes: ${report.summary.totalTests}`);
  console.log(`   Testes passaram: ${report.summary.passedTests}`);
  console.log(`   Testes falharam: ${report.summary.failedTests}`);
  console.log(`   Status geral: ${report.summary.status}`);
  
  if (thresholdResults.length > 0) {
    console.log(`\n🎯 Verificação de Thresholds:`);
    thresholdResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${result.test}: ${result.value.toFixed(2)}ms (limite: ${result.threshold}ms)`);
    });
  }
  
  // Exibir métricas específicas
  if (Object.keys(report.results.keywordExtractor).length > 0) {
    console.log(`\n🔍 KeywordExtractor Performance:`);
    Object.entries(report.results.keywordExtractor).forEach(([key, value]) => {
      console.log(`   ${key}: ${value.toFixed(2)}ms`);
    });
  }
  
  if (Object.keys(report.results.extension).length > 0) {
    console.log(`\n🔧 Extension Performance:`);
    Object.entries(report.results.extension).forEach(([key, value]) => {
      console.log(`   ${key}: ${value.toFixed(2)}ms`);
    });
  }
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeritasAI - Relatório de Performance</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    .header { text-align: center; margin-bottom: 30px; }
    .status { padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; }
    .status.passed { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status.failed { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .metric { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
    .metric.good { background: #d4edda; }
    .metric.warning { background: #fff3cd; }
    .metric.bad { background: #f8d7da; }
    .section { margin: 20px 0; }
    .section h3 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 VeritasAI - Relatório de Performance</h1>
      <p>Gerado em: ${new Date(report.timestamp).toLocaleString('pt-BR')}</p>
    </div>
    
    <div class="status ${report.summary.status.toLowerCase()}">
      <h2>Status Geral: ${report.summary.status}</h2>
      <p>Testes: ${report.summary.passedTests}/${report.summary.totalTests} passaram</p>
    </div>
    
    <div class="section">
      <h3>🔍 KeywordExtractor Performance</h3>
      ${Object.entries(report.results.keywordExtractor).map(([key, value]) => `
        <div class="metric">
          <span>${key}</span>
          <span>${value.toFixed(2)}ms</span>
        </div>
      `).join('')}
    </div>
    
    <div class="section">
      <h3>🔧 Extension Performance</h3>
      ${Object.entries(report.results.extension).map(([key, value]) => `
        <div class="metric">
          <span>${key}</span>
          <span>${value.toFixed(2)}ms</span>
        </div>
      `).join('')}
    </div>
    
    <div class="section">
      <h3>📋 Ambiente de Teste</h3>
      <div class="metric">
        <span>Node.js</span>
        <span>${report.environment.node}</span>
      </div>
      <div class="metric">
        <span>Plataforma</span>
        <span>${report.environment.platform}</span>
      </div>
      <div class="metric">
        <span>Arquitetura</span>
        <span>${report.environment.arch}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { runPerformanceTests, generatePerformanceReport };
