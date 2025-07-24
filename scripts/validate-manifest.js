#!/usr/bin/env node

/**
 * Script para validar o manifest.json da extensão VeritasAI
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validando manifest.json...\n');

// Caminhos
const manifestPath = path.join(__dirname, '../dist/manifest.json');
const srcManifestPath = path.join(__dirname, '../manifest.json');

// Verificar se os arquivos existem
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Arquivo dist/manifest.json não encontrado');
  console.log('💡 Execute "npm run build" primeiro');
  process.exit(1);
}

if (!fs.existsSync(srcManifestPath)) {
  console.error('❌ Arquivo manifest.json não encontrado');
  process.exit(1);
}

try {
  // Carregar e validar JSON
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  console.log('✅ JSON válido');
  
  // Validações básicas
  const validations = [
    {
      name: 'Manifest Version 3',
      check: () => manifest.manifest_version === 3,
      required: true
    },
    {
      name: 'Nome da extensão',
      check: () => manifest.name && manifest.name.length > 0,
      required: true
    },
    {
      name: 'Versão',
      check: () => manifest.version && /^\d+\.\d+\.\d+$/.test(manifest.version),
      required: true
    },
    {
      name: 'Descrição',
      check: () => manifest.description && manifest.description.length > 0,
      required: true
    },
    {
      name: 'Service Worker',
      check: () => manifest.background && manifest.background.service_worker,
      required: true
    },
    {
      name: 'Permissões básicas',
      check: () => manifest.permissions && Array.isArray(manifest.permissions),
      required: true
    },
    {
      name: 'Content Scripts',
      check: () => manifest.content_scripts && Array.isArray(manifest.content_scripts),
      required: true
    },
    {
      name: 'Action (popup)',
      check: () => manifest.action && manifest.action.default_popup,
      required: true
    },
    {
      name: 'Ícones',
      check: () => manifest.icons && Object.keys(manifest.icons).length > 0,
      required: true
    },
    {
      name: 'Página de opções',
      check: () => manifest.options_page,
      required: false
    },
    {
      name: 'Comandos de teclado',
      check: () => manifest.commands && Object.keys(manifest.commands).length > 0,
      required: false
    },
    {
      name: 'Web Accessible Resources',
      check: () => manifest.web_accessible_resources && Array.isArray(manifest.web_accessible_resources),
      required: false
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('\n📋 Validações:\n');
  
  validations.forEach(validation => {
    const result = validation.check();
    const icon = result ? '✅' : (validation.required ? '❌' : '⚠️');
    const status = result ? 'PASS' : (validation.required ? 'FAIL' : 'OPCIONAL');
    
    console.log(`${icon} ${validation.name}: ${status}`);
    
    if (result) {
      passed++;
    } else if (validation.required) {
      failed++;
    }
  });
  
  // Verificar arquivos referenciados
  console.log('\n📁 Verificando arquivos referenciados:\n');
  
  const filesToCheck = [
    { path: manifest.background.service_worker, name: 'Service Worker' },
    { path: manifest.action.default_popup, name: 'Popup HTML' },
    { path: manifest.options_page, name: 'Options HTML' }
  ];
  
  // Adicionar content scripts
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script, index) => {
      if (script.js) {
        script.js.forEach(jsFile => {
          filesToCheck.push({ path: jsFile, name: `Content Script JS ${index + 1}` });
        });
      }
      if (script.css) {
        script.css.forEach(cssFile => {
          filesToCheck.push({ path: cssFile, name: `Content Script CSS ${index + 1}` });
        });
      }
    });
  }
  
  // Adicionar ícones
  if (manifest.icons) {
    Object.entries(manifest.icons).forEach(([size, iconPath]) => {
      filesToCheck.push({ path: iconPath, name: `Ícone ${size}x${size}` });
    });
  }
  
  let filesFound = 0;
  let filesMissing = 0;
  
  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, '../dist', file.path);
    const exists = fs.existsSync(fullPath);
    const icon = exists ? '✅' : '❌';
    
    console.log(`${icon} ${file.name}: ${file.path}`);
    
    if (exists) {
      filesFound++;
    } else {
      filesMissing++;
    }
  });
  
  // Resumo
  console.log('\n📊 Resumo:\n');
  console.log(`✅ Validações aprovadas: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Validações falharam: ${failed}`);
  }
  console.log(`📁 Arquivos encontrados: ${filesFound}`);
  if (filesMissing > 0) {
    console.log(`❌ Arquivos faltando: ${filesMissing}`);
  }
  
  // Informações adicionais
  console.log('\n📋 Informações da extensão:\n');
  console.log(`Nome: ${manifest.name}`);
  console.log(`Versão: ${manifest.version}`);
  console.log(`Descrição: ${manifest.description}`);
  console.log(`Permissões: ${manifest.permissions.join(', ')}`);
  
  if (manifest.host_permissions) {
    console.log(`Host Permissions: ${manifest.host_permissions.join(', ')}`);
  }
  
  // Resultado final
  if (failed === 0 && filesMissing === 0) {
    console.log('\n🎉 Manifest válido e todos os arquivos encontrados!');
    console.log('✅ A extensão está pronta para ser carregada no Chrome');
    process.exit(0);
  } else {
    console.log('\n⚠️ Existem problemas que precisam ser corrigidos');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Erro ao validar manifest:', error.message);
  process.exit(1);
}
