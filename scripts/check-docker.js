#!/usr/bin/env node

/**
 * Script para verificar se Docker está rodando e configurado corretamente
 */

const { execSync } = require('child_process');

console.log('🐳 Verificando Docker...\n');

async function main() {
  try {
    // Verificar se Docker está instalado
    console.log('1. Verificando instalação do Docker...');
    const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
    console.log(`✅ Docker instalado: ${dockerVersion.trim()}`);
    
    // Verificar se Docker está rodando
    console.log('2. Verificando se Docker está rodando...');
    try {
      const dockerInfo = execSync('docker info', { encoding: 'utf8', stdio: 'pipe' });
      console.log('✅ Docker está rodando');
    } catch (error) {
      console.log('❌ Docker não está rodando');
      console.log('\n💡 Para iniciar o Docker:');
      console.log('   - Windows: Abra Docker Desktop');
      console.log('   - Linux: sudo systemctl start docker');
      console.log('   - macOS: Abra Docker Desktop');
      process.exit(1);
    }
    
    // Verificar se docker-compose está disponível
    console.log('3. Verificando Docker Compose...');
    try {
      const composeVersion = execSync('docker-compose --version', { encoding: 'utf8' });
      console.log(`✅ Docker Compose: ${composeVersion.trim()}`);
    } catch (error) {
      try {
        const composeVersion = execSync('docker compose version', { encoding: 'utf8' });
        console.log(`✅ Docker Compose (plugin): ${composeVersion.trim()}`);
      } catch (error2) {
        console.log('❌ Docker Compose não encontrado');
        process.exit(1);
      }
    }
    
    // Verificar se pode baixar imagens
    console.log('4. Testando conectividade...');
    try {
      execSync('docker pull hello-world', { stdio: 'pipe' });
      execSync('docker run --rm hello-world', { stdio: 'pipe' });
      console.log('✅ Conectividade OK');
    } catch (error) {
      console.log('⚠️ Problema de conectividade ou permissões');
    }
    
    console.log('\n🎉 Docker está configurado corretamente!');
    console.log('\n📋 Próximos passos:');
    console.log('   npm run docker:up     # Iniciar containers');
    console.log('   npm run qdrant:setup  # Configurar Qdrant');
    console.log('   npm run qdrant:status # Verificar status');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
