#!/usr/bin/env node

/**
 * Script para atualizar thresholds de coverage baseado no coverage atual
 * Aumenta gradualmente os thresholds conforme mais testes são implementados
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 Atualizando thresholds de coverage...\n');

async function main() {
  try {
    // Executar testes para obter coverage atual
    console.log('🔄 Executando testes para obter coverage atual...');
    
    const coverageFile = './coverage/coverage-summary.json';
    
    // Executar testes com coverage
    try {
      execSync('npm run test:coverage -- --silent', { stdio: 'pipe' });
    } catch (error) {
      console.log('⚠️ Alguns testes falharam, mas continuando com análise de coverage...');
    }
    
    // Verificar se arquivo de coverage existe
    if (!fs.existsSync(coverageFile)) {
      console.error('❌ Arquivo de coverage não encontrado. Execute npm run test:coverage primeiro.');
      process.exit(1);
    }
    
    // Ler coverage atual
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const total = coverage.total;
    
    console.log('📈 Coverage atual:');
    console.log(`  Statements: ${total.statements.pct}%`);
    console.log(`  Branches: ${total.branches.pct}%`);
    console.log(`  Functions: ${total.functions.pct}%`);
    console.log(`  Lines: ${total.lines.pct}%\n`);
    
    // Calcular novos thresholds (90% do coverage atual, mínimo 5%)
    const newThresholds = {
      statements: Math.max(5, Math.floor(total.statements.pct * 0.9)),
      branches: Math.max(5, Math.floor(total.branches.pct * 0.9)),
      functions: Math.max(5, Math.floor(total.functions.pct * 0.9)),
      lines: Math.max(5, Math.floor(total.lines.pct * 0.9))
    };
    
    console.log('🎯 Novos thresholds sugeridos:');
    console.log(`  Statements: ${newThresholds.statements}%`);
    console.log(`  Branches: ${newThresholds.branches}%`);
    console.log(`  Functions: ${newThresholds.functions}%`);
    console.log(`  Lines: ${newThresholds.lines}%\n`);
    
    // Atualizar jest.config.js
    await updateJestConfig(newThresholds);
    
    console.log('✅ Thresholds atualizados com sucesso!');
    console.log('💡 Execute npm test para verificar se os novos thresholds são atendidos.');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar thresholds:', error.message);
    process.exit(1);
  }
}

async function updateJestConfig(thresholds) {
  const jestConfigPath = './jest.config.js';
  
  if (!fs.existsSync(jestConfigPath)) {
    console.error('❌ jest.config.js não encontrado');
    return;
  }
  
  let content = fs.readFileSync(jestConfigPath, 'utf8');
  
  // Regex para encontrar e substituir os thresholds globais
  const globalThresholdRegex = /global:\s*\{[^}]*branches:\s*\d+[^}]*functions:\s*\d+[^}]*lines:\s*\d+[^}]*statements:\s*\d+[^}]*\}/;
  
  const newGlobalThreshold = `global: {
      branches: ${thresholds.branches},
      functions: ${thresholds.functions},
      lines: ${thresholds.lines},
      statements: ${thresholds.statements}
    }`;
  
  if (globalThresholdRegex.test(content)) {
    content = content.replace(globalThresholdRegex, newGlobalThreshold);
    fs.writeFileSync(jestConfigPath, content);
    console.log('📝 jest.config.js atualizado');
  } else {
    console.warn('⚠️ Não foi possível encontrar thresholds globais no jest.config.js');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, updateJestConfig };
