#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DevSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.requiredDirs = [
      'dist',
      'logs', 
      'test-results',
      'coverage',
      'docker/qdrant/config',
      'src/assets/icons',
      'src/assets/styles',
      'src/assets/fonts'
    ];
  }

  async setup() {
    console.log('🚀 Configurando ambiente de desenvolvimento VeritasAI...\n');

    try {
      await this.checkPrerequisites();
      await this.createDirectories();
      await this.copyConfigFiles();
      await this.installDependencies();
      await this.setupPythonEnvironment();
      await this.setupQdrant();
      await this.createInitialFiles();
      await this.runInitialTests();

      console.log('\n✅ Setup concluído com sucesso!');
      console.log('\n📋 Próximos passos:');
      console.log('1. Configure suas API keys no arquivo .env');
      console.log('2. Execute: npm run dev');
      console.log('3. Execute: npm run py:test (testes Python)');
      console.log('4. Acesse: http://localhost:6333/dashboard (Qdrant)');
      console.log('5. Carregue a extensão em chrome://extensions/');

    } catch (error) {
      console.error('\n❌ Erro durante o setup:', error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Verificando pré-requisitos...');

    const requirements = [
      { cmd: 'node --version', name: 'Node.js', minVersion: '16.0.0' },
      { cmd: 'npm --version', name: 'npm', minVersion: '8.0.0' },
      { cmd: 'python --version', name: 'Python', minVersion: '3.9.0' },
      { cmd: 'docker --version', name: 'Docker', minVersion: '20.0.0' }
    ];

    for (const req of requirements) {
      try {
        const output = execSync(req.cmd, { encoding: 'utf8' });
        console.log(`  ✓ ${req.name}: ${output.trim()}`);
      } catch (error) {
        if (req.name === 'Python') {
          // Tentar python3 como fallback
          try {
            const output = execSync('python3 --version', { encoding: 'utf8' });
            console.log(`  ✓ ${req.name}: ${output.trim()}`);
            continue;
          } catch (error2) {
            throw new Error(`${req.name} não encontrado. Instale Python 3.9+ antes de continuar.`);
          }
        }
        throw new Error(`${req.name} não encontrado. Instale antes de continuar.`);
      }
    }
  }

  async createDirectories() {
    console.log('\n📁 Criando diretórios...');
    
    for (const dir of this.requiredDirs) {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  ✓ Criado: ${dir}`);
      } else {
        console.log(`  - Já existe: ${dir}`);
      }
    }
  }

  async copyConfigFiles() {
    console.log('\n📄 Copiando arquivos de configuração...');
    
    const configFiles = [
      { src: '.env.example', dest: '.env' },
      { src: '.gitignore.example', dest: '.gitignore' }
    ];

    for (const { src, dest } of configFiles) {
      const srcPath = path.join(this.projectRoot, src);
      const destPath = path.join(this.projectRoot, dest);
      
      if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✓ Copiado: ${src} → ${dest}`);
      } else if (!fs.existsSync(destPath)) {
        console.log(`  ⚠️ Arquivo não encontrado: ${src}`);
      } else {
        console.log(`  - Já existe: ${dest}`);
      }
    }
  }

  async installDependencies() {
    console.log('\n📦 Instalando dependências Node.js...');

    try {
      execSync('npm install', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      console.log('  ✓ Dependências Node.js instaladas');
    } catch (error) {
      throw new Error('Falha na instalação das dependências Node.js');
    }
  }

  async setupPythonEnvironment() {
    console.log('\n🐍 Configurando ambiente Python...');

    try {
      // Verificar se uv está instalado
      try {
        execSync('uv --version', { encoding: 'utf8' });
        console.log('  ✓ uv encontrado');
      } catch (error) {
        console.log('  📦 Instalando uv...');
        try {
          // Tentar instalar via pip
          execSync('pip install uv', { stdio: 'inherit' });
          console.log('  ✓ uv instalado via pip');
        } catch (pipError) {
          console.log('  ⚠️ Falha ao instalar uv automaticamente');
          console.log('  📖 Instale manualmente: pip install uv');
          return;
        }
      }

      // Executar setup Python
      execSync('python scripts/setup_python.py', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      console.log('  ✓ Ambiente Python configurado');
    } catch (error) {
      console.log('  ⚠️ Falha na configuração do ambiente Python:', error.message);
      console.log('  📖 Execute manualmente: python scripts/setup_python.py');
    }
  }

  async setupQdrant() {
    console.log('\n🗄️ Configurando Qdrant...');
    
    try {
      // Inicia Qdrant via Docker
      execSync('docker-compose up -d qdrant', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      // Aguarda Qdrant ficar disponível
      await this.waitForQdrant();
      
      // Cria collection inicial
      await this.createQdrantCollection();
      
      console.log('  ✓ Qdrant configurado e rodando');
    } catch (error) {
      throw new Error('Falha na configuração do Qdrant: ' + error.message);
    }
  }

  async waitForQdrant(maxAttempts = 30) {
    const fetch = require('node-fetch');
    
    console.log('  ⏳ Aguardando Qdrant inicializar...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('http://localhost:6333/health');
        if (response.ok) {
          console.log('  ✓ Qdrant disponível');
          return;
        }
      } catch (error) {
        // Continua tentando
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Qdrant não ficou disponível após 60 segundos');
  }

  async createQdrantCollection() {
    const fetch = require('node-fetch');

    const collectionConfig = {
      vectors: {
        size: 384,
        distance: "Cosine",
        hnsw_config: {
          m: 16,
          ef_construct: 100,
          full_scan_threshold: 10000,
          max_indexing_threads: 4
        },
        quantization_config: {
          scalar: {
            type: "int8",
            quantile: 0.99,
            always_ram: true
          }
        }
      },
      optimizers_config: {
        deleted_threshold: 0.2,
        vacuum_min_vector_number: 1000,
        default_segment_number: 2,
        max_segment_size: 200000,
        memmap_threshold: 200000,
        indexing_threshold: 20000,
        flush_interval_sec: 5,
        max_optimization_threads: 2
      },
      wal_config: {
        wal_capacity_mb: 32,
        wal_segments_ahead: 0
      },
      shard_number: 1,
      replication_factor: 1,
      write_consistency_factor: 1,
      on_disk_payload: true
    };

    try {
      const response = await fetch('http://localhost:6333/collections/veritas_embeddings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionConfig)
      });

      if (!response.ok && response.status !== 409) { // 409 = já existe
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('  ✓ Collection criada/verificada');

      // Criar índices de payload
      await this.createPayloadIndices();

    } catch (error) {
      throw new Error('Falha ao criar collection: ' + error.message);
    }
  }

  async createPayloadIndices() {
    const fetch = require('node-fetch');

    const indices = [
      { field: 'text_hash', type: 'keyword' },
      { field: 'classification', type: 'keyword' },
      { field: 'confidence_score', type: 'float' },
      { field: 'source_type', type: 'keyword' },
      { field: 'timestamp', type: 'integer' }
    ];

    for (const index of indices) {
      try {
        const response = await fetch(`http://localhost:6333/collections/veritas_embeddings/index`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field_name: index.field,
            field_schema: index.type
          })
        });

        if (response.ok) {
          console.log(`  ✓ Índice criado: ${index.field}`);
        }
      } catch (error) {
        // Índice pode já existir, continuar
        console.log(`  - Índice ${index.field}: ${error.message}`);
      }
    }
  }

  async createInitialFiles() {
    console.log('\n📝 Criando arquivos iniciais...');
    
    // Criar .gitignore se não existir
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreContent = `
# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
build/

# Environment variables
.env
.env.local

# Logs
logs/
*.log

# Coverage
coverage/

# Test results
test-results/

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Docker volumes
docker/qdrant/storage/
`;
      fs.writeFileSync(gitignorePath, gitignoreContent.trim());
      console.log('  ✓ .gitignore criado');
    }
  }

  async runInitialTests() {
    console.log('\n🧪 Executando testes iniciais...');
    
    try {
      execSync('npm run test:unit -- --passWithNoTests', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      console.log('  ✓ Testes básicos passaram');
    } catch (error) {
      console.warn('  ⚠️ Alguns testes falharam (normal em setup inicial)');
    }
  }
}

// Executa setup se chamado diretamente
if (require.main === module) {
  new DevSetup().setup();
}

module.exports = DevSetup;
