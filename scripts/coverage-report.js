#!/usr/bin/env node

/**
 * Script para gerar relatórios de coverage consolidados
 * Combina coverage de JavaScript (Jest) e Python (pytest)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 Gerando relatórios de coverage...\n');

// Configurações
const config = {
  jsCoverage: './coverage',
  pyCoverage: './htmlcov',
  outputDir: './coverage-report',
  thresholds: {
    js: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    py: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    }
  }
};

async function main() {
  try {
    // Criar diretório de saída
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Executar testes JavaScript com coverage
    console.log('🧪 Executando testes JavaScript...');
    try {
      execSync('npm run test:unit', { stdio: 'inherit' });
      console.log('✅ Testes JavaScript concluídos');
    } catch (error) {
      console.warn('⚠️ Alguns testes JavaScript falharam, mas continuando...');
    }
    
    // Executar testes Python com coverage
    console.log('\n🐍 Executando testes Python...');
    try {
      execSync('uv run pytest --cov=src --cov-report=html --cov-report=json', { stdio: 'inherit' });
      console.log('✅ Testes Python concluídos');
    } catch (error) {
      console.warn('⚠️ Alguns testes Python falharam, mas continuando...');
    }
    
    // Analisar coverage JavaScript
    const jsCoverage = analyzeJSCoverage();
    
    // Analisar coverage Python
    const pyCoverage = analyzePyCoverage();
    
    // Gerar relatório consolidado
    generateConsolidatedReport(jsCoverage, pyCoverage);
    
    // Verificar thresholds
    checkThresholds(jsCoverage, pyCoverage);
    
    console.log('\n📊 Relatórios de coverage gerados:');
    console.log(`📁 JavaScript: ${config.jsCoverage}/index.html`);
    console.log(`📁 Python: ${config.pyCoverage}/index.html`);
    console.log(`📁 Consolidado: ${config.outputDir}/index.html`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatórios:', error.message);
    process.exit(1);
  }
}

function analyzeJSCoverage() {
  const coverageFile = path.join(config.jsCoverage, 'coverage-summary.json');
  
  if (!fs.existsSync(coverageFile)) {
    console.warn('⚠️ Arquivo de coverage JavaScript não encontrado');
    return null;
  }
  
  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const total = coverage.total;
    
    console.log('\n📊 Coverage JavaScript:');
    console.log(`  Statements: ${total.statements.pct}%`);
    console.log(`  Branches: ${total.branches.pct}%`);
    console.log(`  Functions: ${total.functions.pct}%`);
    console.log(`  Lines: ${total.lines.pct}%`);
    
    return {
      statements: total.statements.pct,
      branches: total.branches.pct,
      functions: total.functions.pct,
      lines: total.lines.pct,
      files: Object.keys(coverage).length - 1 // -1 para remover 'total'
    };
  } catch (error) {
    console.warn('⚠️ Erro ao analisar coverage JavaScript:', error.message);
    return null;
  }
}

function analyzePyCoverage() {
  const coverageFile = path.join('.', 'coverage.json');
  
  if (!fs.existsSync(coverageFile)) {
    console.warn('⚠️ Arquivo de coverage Python não encontrado');
    return null;
  }
  
  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const totals = coverage.totals;
    
    const statements = (totals.covered_lines / totals.num_statements * 100).toFixed(2);
    const branches = totals.num_branches > 0 ? 
      (totals.covered_branches / totals.num_branches * 100).toFixed(2) : 100;
    
    console.log('\n📊 Coverage Python:');
    console.log(`  Statements: ${statements}%`);
    console.log(`  Branches: ${branches}%`);
    console.log(`  Lines: ${totals.percent_covered}%`);
    
    return {
      statements: parseFloat(statements),
      branches: parseFloat(branches),
      lines: totals.percent_covered,
      files: Object.keys(coverage.files).length
    };
  } catch (error) {
    console.warn('⚠️ Erro ao analisar coverage Python:', error.message);
    return null;
  }
}

function generateConsolidatedReport(jsCoverage, pyCoverage) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeritasAI - Relatório de Coverage</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f8f9fa;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .content {
      padding: 32px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    .card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 24px;
    }
    .card h3 {
      margin: 0 0 16px 0;
      color: #333;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .metric:last-child {
      border-bottom: none;
    }
    .percentage {
      font-weight: bold;
    }
    .good { color: #4CAF50; }
    .warning { color: #FF9800; }
    .poor { color: #F44336; }
    .summary {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
    }
    .links {
      margin-top: 24px;
      text-align: center;
    }
    .links a {
      display: inline-block;
      margin: 0 12px;
      padding: 12px 24px;
      background: #2196F3;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .links a:hover {
      background: #1976D2;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ VeritasAI</h1>
      <p>Relatório de Coverage de Testes</p>
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
    
    <div class="content">
      <div class="grid">
        ${generateCoverageCard('JavaScript', jsCoverage)}
        ${generateCoverageCard('Python', pyCoverage)}
      </div>
      
      <div class="summary">
        <h3>📊 Resumo Geral</h3>
        <p>
          <strong>JavaScript:</strong> ${jsCoverage ? `${jsCoverage.files} arquivos` : 'N/A'} | 
          <strong>Python:</strong> ${pyCoverage ? `${pyCoverage.files} arquivos` : 'N/A'}
        </p>
        <p>
          <strong>Coverage Médio:</strong> 
          ${calculateAverageCoverage(jsCoverage, pyCoverage)}%
        </p>
      </div>
      
      <div class="links">
        <a href="../coverage/index.html">📊 Relatório JavaScript</a>
        <a href="../htmlcov/index.html">🐍 Relatório Python</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(config.outputDir, 'index.html'), html);
}

function generateCoverageCard(language, coverage) {
  if (!coverage) {
    return `
      <div class="card">
        <h3>${language}</h3>
        <p>Coverage não disponível</p>
      </div>
    `;
  }
  
  return `
    <div class="card">
      <h3>${language}</h3>
      <div class="metric">
        <span>Statements:</span>
        <span class="percentage ${getColorClass(coverage.statements)}">${coverage.statements}%</span>
      </div>
      <div class="metric">
        <span>Branches:</span>
        <span class="percentage ${getColorClass(coverage.branches)}">${coverage.branches}%</span>
      </div>
      ${coverage.functions ? `
      <div class="metric">
        <span>Functions:</span>
        <span class="percentage ${getColorClass(coverage.functions)}">${coverage.functions}%</span>
      </div>
      ` : ''}
      <div class="metric">
        <span>Lines:</span>
        <span class="percentage ${getColorClass(coverage.lines)}">${coverage.lines}%</span>
      </div>
    </div>
  `;
}

function getColorClass(percentage) {
  if (percentage >= 80) return 'good';
  if (percentage >= 60) return 'warning';
  return 'poor';
}

function calculateAverageCoverage(jsCoverage, pyCoverage) {
  const coverages = [];
  
  if (jsCoverage) {
    coverages.push(jsCoverage.lines);
  }
  
  if (pyCoverage) {
    coverages.push(pyCoverage.lines);
  }
  
  if (coverages.length === 0) return 0;
  
  const average = coverages.reduce((sum, cov) => sum + cov, 0) / coverages.length;
  return average.toFixed(2);
}

function checkThresholds(jsCoverage, pyCoverage) {
  console.log('\n🎯 Verificando thresholds...');
  
  let passed = true;
  
  if (jsCoverage) {
    console.log('\n📊 JavaScript:');
    Object.entries(config.thresholds.js).forEach(([metric, threshold]) => {
      const actual = jsCoverage[metric];
      const status = actual >= threshold ? '✅' : '❌';
      console.log(`  ${status} ${metric}: ${actual}% (threshold: ${threshold}%)`);
      if (actual < threshold) passed = false;
    });
  }
  
  if (pyCoverage) {
    console.log('\n🐍 Python:');
    Object.entries(config.thresholds.py).forEach(([metric, threshold]) => {
      if (pyCoverage[metric] !== undefined) {
        const actual = pyCoverage[metric];
        const status = actual >= threshold ? '✅' : '❌';
        console.log(`  ${status} ${metric}: ${actual}% (threshold: ${threshold}%)`);
        if (actual < threshold) passed = false;
      }
    });
  }
  
  if (passed) {
    console.log('\n🎉 Todos os thresholds foram atendidos!');
  } else {
    console.log('\n⚠️ Alguns thresholds não foram atendidos');
    process.exit(1);
  }
}

// Executar script
if (require.main === module) {
  main();
}
