#!/usr/bin/env node

/**
 * VER-023: Script para gerar badges de coverage e performance
 * Gera badges SVG para README.md
 */

const fs = require('fs');
const path = require('path');

console.log('🏷️ Gerando badges de coverage e performance...\n');

// Configurações
const config = {
  coverageFile: './coverage/coverage-summary.json',
  performanceFile: './performance-reports/performance-report.json',
  outputDir: './badges',
  colors: {
    excellent: '#4c1',
    good: '#97ca00',
    warning: '#dfb317',
    poor: '#e05d44'
  }
};

async function main() {
  try {
    // Criar diretório de badges
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Gerar badges de coverage
    await generateCoverageBadges();
    
    // Gerar badges de performance
    await generatePerformanceBadges();
    
    // Gerar badge de status geral
    await generateStatusBadge();
    
    console.log('\n✅ Badges gerados com sucesso!');
    console.log(`📁 Badges salvos em: ${config.outputDir}/`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar badges:', error.message);
    process.exit(1);
  }
}

async function generateCoverageBadges() {
  console.log('📊 Gerando badges de coverage...');
  
  if (!fs.existsSync(config.coverageFile)) {
    console.warn('⚠️ Arquivo de coverage não encontrado');
    return;
  }
  
  const coverage = JSON.parse(fs.readFileSync(config.coverageFile, 'utf8'));
  const total = coverage.total;
  
  // Badge de statements
  const statementsColor = getCoverageColor(total.statements.pct);
  const statementsBadge = generateBadgeSVG('statements', `${total.statements.pct}%`, statementsColor);
  fs.writeFileSync(path.join(config.outputDir, 'coverage-statements.svg'), statementsBadge);
  
  // Badge de branches
  const branchesColor = getCoverageColor(total.branches.pct);
  const branchesBadge = generateBadgeSVG('branches', `${total.branches.pct}%`, branchesColor);
  fs.writeFileSync(path.join(config.outputDir, 'coverage-branches.svg'), branchesBadge);
  
  // Badge de functions
  const functionsColor = getCoverageColor(total.functions.pct);
  const functionsBadge = generateBadgeSVG('functions', `${total.functions.pct}%`, functionsColor);
  fs.writeFileSync(path.join(config.outputDir, 'coverage-functions.svg'), functionsBadge);
  
  // Badge de lines
  const linesColor = getCoverageColor(total.lines.pct);
  const linesBadge = generateBadgeSVG('lines', `${total.lines.pct}%`, linesColor);
  fs.writeFileSync(path.join(config.outputDir, 'coverage-lines.svg'), linesBadge);
  
  // Badge geral de coverage
  const avgCoverage = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
  const avgColor = getCoverageColor(avgCoverage);
  const avgBadge = generateBadgeSVG('coverage', `${avgCoverage.toFixed(1)}%`, avgColor);
  fs.writeFileSync(path.join(config.outputDir, 'coverage.svg'), avgBadge);
  
  console.log('✅ Badges de coverage gerados');
}

async function generatePerformanceBadges() {
  console.log('⚡ Gerando badges de performance...');
  
  if (!fs.existsSync(config.performanceFile)) {
    console.warn('⚠️ Arquivo de performance não encontrado');
    return;
  }
  
  const performance = JSON.parse(fs.readFileSync(config.performanceFile, 'utf8'));
  
  // Badge de performance geral
  const status = performance.summary?.status || 'UNKNOWN';
  const statusColor = status === 'PASSED' ? config.colors.excellent : config.colors.poor;
  const statusBadge = generateBadgeSVG('performance', status, statusColor);
  fs.writeFileSync(path.join(config.outputDir, 'performance.svg'), statusBadge);
  
  // Badge de testes
  const totalTests = performance.summary?.totalTests || 0;
  const passedTests = performance.summary?.passedTests || 0;
  const testColor = passedTests === totalTests ? config.colors.excellent : config.colors.warning;
  const testBadge = generateBadgeSVG('tests', `${passedTests}/${totalTests}`, testColor);
  fs.writeFileSync(path.join(config.outputDir, 'tests.svg'), testBadge);
  
  console.log('✅ Badges de performance gerados');
}

async function generateStatusBadge() {
  console.log('🎯 Gerando badge de status geral...');
  
  let overallStatus = 'UNKNOWN';
  let statusColor = config.colors.poor;
  
  // Verificar coverage
  if (fs.existsSync(config.coverageFile)) {
    const coverage = JSON.parse(fs.readFileSync(config.coverageFile, 'utf8'));
    const total = coverage.total;
    const avgCoverage = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
    
    if (avgCoverage >= 90) {
      overallStatus = 'EXCELLENT';
      statusColor = config.colors.excellent;
    } else if (avgCoverage >= 80) {
      overallStatus = 'GOOD';
      statusColor = config.colors.good;
    } else if (avgCoverage >= 70) {
      overallStatus = 'WARNING';
      statusColor = config.colors.warning;
    } else {
      overallStatus = 'POOR';
      statusColor = config.colors.poor;
    }
  }
  
  const statusBadge = generateBadgeSVG('status', overallStatus, statusColor);
  fs.writeFileSync(path.join(config.outputDir, 'status.svg'), statusBadge);
  
  console.log('✅ Badge de status geral gerado');
}

function getCoverageColor(percentage) {
  if (percentage >= 90) return config.colors.excellent;
  if (percentage >= 80) return config.colors.good;
  if (percentage >= 70) return config.colors.warning;
  return config.colors.poor;
}

function generateBadgeSVG(label, value, color) {
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth/2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth/2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth/2}" y="14">${value}</text>
  </g>
</svg>
  `.trim();
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { generateCoverageBadges, generatePerformanceBadges, generateStatusBadge };
