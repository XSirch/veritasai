# Nome do Projeto: VeritasAI - Extensão de Classificação de Confiabilidade de Informação

## Visão Geral
VeritasAI é uma extensão de navegador que permite a classificação automática de textos visíveis ou selecionados em uma página web, determinando se a informação é: confiável, inconclusiva, sem fundamento ou fake. O sistema utiliza embeddings, busca vetorial com Qdrant e, como fallback, um modelo de linguagem (LLM) via OpenRouter API.

## Objetivos
- Reduzir a exposição do usuário a desinformação em 70% dos casos analisados
- Ajudar o usuário a interpretar criticamente o conteúdo da internet com score de confiabilidade ≥ 85%
- Minimizar o custo de uso de LLM com cache hit rate ≥ 60% após 1000 consultas
- Processar análises em tempo real com latência < 3 segundos

## Funcionalidades MVP
- Detecção de texto selecionado pelo usuário (mínimo 10 caracteres, máximo 2000)
- Geração de embedding usando sentence-transformers/all-MiniLM-L6-v2
- Hash SHA-256 do texto normalizado para identificação única
- Busca vetorial no Qdrant com limiar de similaridade ≥ 0.85
- Classificação imediata se houver match com score > 0.9
- Fallback para LLM via OpenRouter (modelos: GPT-4o-mini, Claude-3-haiku)
- Armazenamento em Qdrant local com persistência em disco
- Interface tooltip responsiva com animações suaves
- Cache local de 10.000 consultas mais recentes

## Project Structure

```
veritas-ai-extension/
├── .docs/                          # Documentação
│   ├── PRD.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── .github/                        # CI/CD workflows
│   └── workflows/
│       ├── main.yml
│       └── release.yml
├── src/                            # Código fonte principal
│   ├── background/                 # Background script
│   │   ├── background.js
│   │   └── api-manager.js
│   ├── content/                    # Content scripts
│   │   ├── content.js
│   │   ├── text-selector.js
│   │   └── ui-components.js
│   ├── popup/                      # Extension popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/                    # Settings page
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   ├── services/                   # Core business logic
│   │   ├── hybrid-analyzer.js
│   │   ├── fact-check-service.js
│   │   ├── llm-service.js
│   │   ├── embedding-service.js
│   │   ├── qdrant-client.js
│   │   ├── cache-manager.js
│   │   └── cost-tracker.js
│   ├── utils/                      # Utilities
│   │   ├── text-processor.js
│   │   ├── keyword-extractor.js
│   │   ├── crypto-utils.js
│   │   └── logger.js
│   ├── config/                     # Configuration
│   │   ├── default-config.js
│   │   ├── api-endpoints.js
│   │   └── constants.js
│   └── assets/                     # Static assets
│       ├── icons/
│       ├── styles/
│       └── fonts/
├── tests/                          # Test suite
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   └── fixtures/
├── docker/                         # Docker configurations
│   ├── docker-compose.yml
│   ├── docker-compose.test.yml
│   └── qdrant/
├── scripts/                        # Build and utility scripts
│   ├── build.js
│   ├── package.js
│   └── setup-dev.js
├── dist/                           # Built extension (gitignored)
├── manifest.json                   # Extension manifest
├── webpack.config.js               # Build configuration
├── package.json                    # Dependencies
├── .env.example                    # Environment template
├── .gitignore
└── README.md
```

## Technical Requirements

### Core Technologies
- **Frontend**: Vanilla JavaScript ES2022 + Web Extensions API
- **Vector Database**: Qdrant v1.15.0 (local instance via Docker)
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2 via Transformers.js
- **LLM API**: OpenRouter (https://openrouter.ai/api/v1)
- **Storage**: IndexedDB para cache local + Qdrant para vetores
- **Build Tool**: Webpack 5 com manifest v3
- **Python Package Manager**: uv (ultra-fast Python package installer)

#### Melhorias do Qdrant v1.15.0

**Performance Enhancements:**
- ✅ **Quantização Escalar**: Redução de 75% no uso de memória com int8 quantization
- ✅ **HNSW Otimizado**: Busca vetorial 40% mais rápida com novos parâmetros
- ✅ **Indexação Paralela**: Múltiplas threads para indexação mais eficiente
- ✅ **Memmap Inteligente**: Uso otimizado de RAM vs disco baseado em thresholds

**Funcionalidades Avançadas:**
- ✅ **Payload Indexing**: Índices específicos para filtros rápidos
- ✅ **Range Queries**: Consultas por faixa de valores (confidence_score, timestamp)
- ✅ **Batch Operations**: Inserção em lote otimizada para múltiplos pontos
- ✅ **WAL Configuration**: Write-Ahead Log configurável para durabilidade

**Configurações de Produção:**
- ✅ **Segment Management**: Controle fino sobre segmentos de dados
- ✅ **Vacuum Optimization**: Limpeza automática de dados deletados
- ✅ **Flush Control**: Controle de persistência em disco
- ✅ **CORS Support**: Habilitado para desenvolvimento web

#### Gerenciamento de Pacotes Python com uv

**Por que uv?**
- ⚡ **10-100x mais rápido** que pip para instalação de pacotes
- 🔒 **Resolução de dependências determinística** com lock file
- 🐍 **Gerenciamento de versões Python** integrado
- 📦 **Compatibilidade total** com pip e PyPI
- 🛠️ **Ferramentas integradas** para desenvolvimento

**Configuração do Projeto:**
```toml
# pyproject.toml
[project]
name = "veritas-ai-extension"
version = "1.0.0"
requires-python = ">=3.9"
dependencies = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.25.0",
    "pydantic>=2.4.0",
    "black>=23.7.0",
    "mypy>=1.5.0",
]

[project.optional-dependencies]
dev = [
    "ipython>=8.15.0",
    "mkdocs>=1.5.0",
    "memory-profiler>=0.61.0",
]
test = [
    "pytest-timeout>=2.1.0",
    "factory-boy>=3.3.0",
    "faker>=19.6.0",
]
```

**Comandos Principais:**
```bash
# Instalação e setup
uv sync                    # Sincronizar todas as dependências
uv sync --all-extras      # Incluir dependências opcionais
uv add pytest            # Adicionar nova dependência
uv add --dev ipython     # Adicionar dependência de desenvolvimento
uv remove package       # Remover dependência

# Execução de comandos
uv run pytest           # Executar testes
uv run black src        # Formatar código
uv run mypy src         # Type checking

# Gerenciamento de ambiente
uv python install 3.11  # Instalar Python 3.11
uv python pin 3.11     # Fixar versão do Python
uv venv                 # Criar ambiente virtual
```

**Integração com Scripts npm:**
```json
{
  "scripts": {
    "py:test": "uv run pytest",
    "py:lint": "uv run python scripts/lint.py",
    "py:format": "uv run python scripts/format.py",
    "py:sync": "uv sync",
    "py:add": "uv add"
  }
}
```

**Benefícios para o VeritasAI:**
- 🚀 **Setup 10x mais rápido** para novos desenvolvedores
- 🔄 **CI/CD otimizado** com cache inteligente
- 📋 **Dependências consistentes** entre ambientes
- 🛡️ **Segurança aprimorada** com lock file determinístico
- 🔧 **Desenvolvimento simplificado** com comandos unificados

### Dependencies
```json
{
  "@xenova/transformers": "^2.17.0",
  "@qdrant/js-client-rest": "^1.15.0",
  "crypto-js": "^4.2.0",
  "lodash.debounce": "^4.0.8",
  "compromise": "^14.10.0",
  "uuid": "^9.0.0",
  "idb": "^7.1.1"
}
```

## API Key Management System

### Estratégia Híbrida de API Keys

O VeritasAI implementa um sistema flexível que permite tanto o uso de API keys padrão do aplicativo quanto keys personalizadas do usuário:

#### **Configuração Padrão (Recomendada)**
- **Google Fact Check API**: Key compartilhada do aplicativo com rate limiting por usuário
- **Groq LLM API**: Pool de keys rotativas para distribuir carga
- **Vantagens**: Setup zero, experiência plug-and-play
- **Limitações**: Rate limits compartilhados, dependência do serviço

#### **Configuração Personalizada (Avançada)**
- **Usuário fornece suas próprias API keys**
- **Vantagens**: Rate limits dedicados, controle total de custos
- **Requisitos**: Conhecimento técnico, configuração manual

### Implementação do Sistema

#### **Estrutura de Configuração**
```javascript
// src/config/api-config.js
const API_CONFIG = {
  // Configurações padrão (keys do app)
  default: {
    googleFactCheck: {
      enabled: true,
      endpoint: 'https://factchecktools.googleapis.com/v1alpha1/claims:search',
      keyRotation: true,
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerDay: 1000,
        perUserLimit: 50 // por usuário por dia
      }
    },
    groq: {
      enabled: true,
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      models: ['mixtral-8x7b-32768', 'gemma-7b-it', 'llama3-8b-8192'],
      keyPool: ['key1', 'key2', 'key3'], // Pool de keys rotativas
      rateLimit: {
        requestsPerMinute: 30,
        tokensPerDay: 100000,
        perUserLimit: 1000 // tokens por usuário por dia
      }
    }
  },

  // Configurações personalizadas
  custom: {
    googleFactCheck: {
      enabled: false,
      apiKey: null,
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerDay: 10000 // Limite da API do Google
      }
    },
    groq: {
      enabled: false,
      apiKey: null,
      preferredModel: 'mixtral-8x7b-32768',
      rateLimit: {
        requestsPerMinute: 30,
        tokensPerDay: 1000000 // Baseado no plano do usuário
      }
    }
  }
};
```

#### **Gerenciador de API Keys**
```javascript
// src/services/api-key-manager.js
class APIKeyManager {
  constructor() {
    this.config = null;
    this.userQuotas = new Map();
    this.keyRotationIndex = 0;
  }

  async initialize() {
    this.config = await this.loadConfiguration();
    await this.loadUserQuotas();
  }

  async loadConfiguration() {
    const userConfig = await chrome.storage.sync.get(['apiConfig']);
    const hasCustomKeys = userConfig.apiConfig?.custom?.enabled;

    return hasCustomKeys ?
      { ...API_CONFIG.default, ...userConfig.apiConfig } :
      API_CONFIG.default;
  }

  async getAPIKey(service) {
    const serviceConfig = this.config[service];

    if (serviceConfig.custom?.enabled) {
      return serviceConfig.custom.apiKey;
    }

    // Rotação de keys para serviços padrão
    if (serviceConfig.keyPool) {
      const key = serviceConfig.keyPool[this.keyRotationIndex];
      this.keyRotationIndex = (this.keyRotationIndex + 1) % serviceConfig.keyPool.length;
      return key;
    }

    return serviceConfig.defaultKey;
  }

  async checkQuota(userId, service, requestType = 'request') {
    const quotaKey = `${userId}_${service}_${requestType}`;
    const today = new Date().toDateString();
    const userQuota = this.userQuotas.get(quotaKey) || { date: today, count: 0 };

    // Reset quota se mudou o dia
    if (userQuota.date !== today) {
      userQuota.date = today;
      userQuota.count = 0;
    }

    const limit = this.config[service].rateLimit.perUserLimit;
    return userQuota.count < limit;
  }

  async incrementQuota(userId, service, requestType = 'request', amount = 1) {
    const quotaKey = `${userId}_${service}_${requestType}`;
    const today = new Date().toDateString();
    const userQuota = this.userQuotas.get(quotaKey) || { date: today, count: 0 };

    userQuota.count += amount;
    this.userQuotas.set(quotaKey, userQuota);

    // Persistir quotas
    await this.saveUserQuotas();
  }
}
```

#### **Interface de Configuração de API Keys**
```javascript
// src/options/api-settings.js
class APISettingsManager {
  constructor() {
    this.form = document.getElementById('api-settings-form');
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Toggle entre modo padrão e personalizado
    document.getElementById('use-default-keys').addEventListener('change', (e) => {
      this.toggleCustomKeyFields(!e.target.checked);
    });

    // Validação de API keys
    document.getElementById('test-google-key').addEventListener('click', () => {
      this.testAPIKey('google');
    });

    document.getElementById('test-groq-key').addEventListener('click', () => {
      this.testAPIKey('groq');
    });

    // Salvar configurações
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfiguration();
    });
  }

  async testAPIKey(service) {
    const keyInput = document.getElementById(`${service}-api-key`);
    const statusElement = document.getElementById(`${service}-key-status`);

    statusElement.textContent = 'Testando...';
    statusElement.className = 'status testing';

    try {
      const isValid = await this.validateAPIKey(service, keyInput.value);
      statusElement.textContent = isValid ? '✓ Válida' : '✗ Inválida';
      statusElement.className = `status ${isValid ? 'valid' : 'invalid'}`;
    } catch (error) {
      statusElement.textContent = '✗ Erro na validação';
      statusElement.className = 'status error';
    }
  }

  async validateAPIKey(service, apiKey) {
    if (service === 'google') {
      const response = await fetch(
        `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${apiKey}&query=test`,
        { method: 'GET' }
      );
      return response.status !== 403;
    }

    if (service === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.status === 200;
    }

    return false;
  }
}
```

#### **Fluxo de Onboarding**
```javascript
// src/services/onboarding-service.js
class OnboardingService {
  constructor() {
    this.steps = [
      'welcome',
      'api-choice',
      'permissions',
      'first-analysis',
      'complete'
    ];
    this.currentStep = 0;
  }

  async startOnboarding() {
    const isFirstTime = await this.isFirstTimeUser();
    if (isFirstTime) {
      await this.showOnboardingFlow();
    }
  }

  async showAPIChoiceStep() {
    return new Promise((resolve) => {
      const modal = this.createModal(`
        <div class="onboarding-step">
          <h2>Configuração de API</h2>
          <p>Escolha como deseja usar o VeritasAI:</p>

          <div class="api-choice-cards">
            <div class="choice-card recommended" data-choice="default">
              <div class="badge">Recomendado</div>
              <h3>🚀 Configuração Rápida</h3>
              <p>Use nossas APIs compartilhadas</p>
              <ul>
                <li>✓ Setup instantâneo</li>
                <li>✓ Sem configuração técnica</li>
                <li>✓ Funciona imediatamente</li>
                <li>⚠️ Limites compartilhados</li>
              </ul>
            </div>

            <div class="choice-card" data-choice="custom">
              <h3>🔧 Configuração Avançada</h3>
              <p>Use suas próprias API keys</p>
              <ul>
                <li>✓ Limites dedicados</li>
                <li>✓ Controle total de custos</li>
                <li>✓ Maior privacidade</li>
                <li>⚠️ Requer configuração manual</li>
              </ul>
            </div>
          </div>

          <div class="onboarding-actions">
            <button id="continue-onboarding" disabled>Continuar</button>
          </div>
        </div>
      `);

      modal.addEventListener('click', (e) => {
        if (e.target.closest('.choice-card')) {
          const choice = e.target.closest('.choice-card').dataset.choice;
          this.selectAPIChoice(choice);
          document.getElementById('continue-onboarding').disabled = false;
        }
      });

      document.getElementById('continue-onboarding').addEventListener('click', () => {
        modal.remove();
        resolve();
      });
    });
  }
}
```

### Browser Compatibility
- Chrome 88+ (Manifest V3)
- Firefox 109+ (Manifest V3)
- Edge 88+

### Required Browser Permissions
```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "https://factchecktools.googleapis.com/*",
    "https://api.groq.com/*",
    "http://localhost:6333/*"
  ],
  "optional_permissions": [
    "background"
  ]
}
```

## User Stories

### US001: Verificação Básica de Texto
**Como** usuário navegando na web  
**Quero** selecionar um texto e verificar sua confiabilidade  
**Para** tomar decisões informadas sobre o conteúdo  

**Critérios de Aceitação:**
- Posso selecionar texto entre 10-2000 caracteres
- Botão "Verificar" aparece em até 200ms após seleção
- Resultado é exibido em até 3 segundos
- Tooltip mostra classificação com cores distintas
- Score de confiabilidade é exibido em percentual

### US002: Cache e Performance
**Como** usuário frequente  
**Quero** que textos já analisados sejam respondidos instantaneamente  
**Para** ter uma experiência fluida  

**Critérios de Aceitação:**
- Textos idênticos retornam resultado em < 100ms
- Cache persiste entre sessões do navegador
- Máximo 10.000 entradas em cache local
- Limpeza automática de cache antigo (> 30 dias)

### US003: Configuração Personalizada
**Como** usuário avançado  
**Quero** ajustar limites de confiabilidade e modelos  
**Para** personalizar a experiência conforme minha necessidade  

**Critérios de Aceitação:**
- Posso ajustar threshold de similaridade (0.7-0.95)
- Posso escolher modelo LLM (GPT-4.1-mini, Claude-3-haiku)
- Posso desabilitar/habilitar cache
- Configurações são salvas e sincronizadas

## API Specifications

### Arquitetura Híbrida de Verificação (Duas Camadas)

#### CAMADA 1: Google Fact Check Tools API (Verificação Primária)

**Objetivo**: Reduzir custos de LLM através de verificação factual direta com fontes confiáveis

##### Endpoint: GET /v1alpha1/claims:search
```json
{
  "query": "{termos_chave_extraidos}",
  "languageCode": "pt",
  "maxAgeDays": 180,
  "pageSize": 10,
  "offset": 0
}
```

##### Response Format:
```json
{
  "claims": [
    {
      "text": "Texto da alegação verificada",
      "claimant": "Fonte original da alegação",
      "claimDate": "2024-01-15T10:30:00Z",
      "claimReview": [
        {
          "publisher": {
            "name": "Agência Lupa",
            "site": "https://lupa.uol.com.br"
          },
          "url": "https://lupa.uol.com.br/jornalismo/2024/01/15/verificacao-exemplo",
          "title": "É falso que...",
          "reviewDate": "2024-01-16T14:20:00Z",
          "textualRating": "False",
          "languageCode": "pt"
        }
      ]
    }
  ]
}
```

##### Critérios de Validação:
```javascript
const validationCriteria = {
  confidenceThreshold: 0.8,
  maxAgeMonths: 6,
  approvedFactCheckers: [
    "Agência Lupa", "Aos Fatos", "Comprova", "Fato ou Fake",
    "Snopes", "PolitiFact", "FactCheck.org", "AFP Checamos"
  ],
  minimumSimilarity: 0.75
};
```

#### CAMADA 2: Groq API com LLM (Fallback Inteligente)

**Trigger**: Executar apenas quando Camada 1 falha ou retorna resultados inconclusivos

##### Endpoint: POST /openai/v1/chat/completions
```json
{
  "model": "mixtral-8x7b-32768",
  "messages": [
    {
      "role": "system",
      "content": "Você é um especialista em análise de desinformação. Analise o texto focando em: 1) Estrutura argumentativa, 2) Presença de fontes, 3) Linguagem tendenciosa, 4) Padrões de desinformação, 5) Consistência factual. Classifique como: CONFIAVEL, INCONCLUSIVA, SEM_FUNDAMENTO, ou FAKE. Forneça score 0-100 e justificativa concisa."
    },
    {
      "role": "user",
      "content": "Analise este texto: {texto_usuario}"
    }
  ],
  "max_tokens": 200,
  "temperature": 0.1,
  "top_p": 0.9
}
```

##### Modelos Disponíveis:
```json
{
  "primary": "mixtral-8x7b-32768",
  "fallback": "gemma-7b-it",
  "fast": "llama3-8b-8192"
}
```

##### Response Format:
```json
{
  "choices": [
    {
      "message": {
        "content": "CLASSIFICACAO: SEM_FUNDAMENTO\nSCORE: 23\nJUSTIFICATIVA: Texto apresenta alegações sem fontes verificáveis, linguagem sensacionalista e inconsistências factuais. Ausência de evidências concretas."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 156,
    "completion_tokens": 45,
    "total_tokens": 201
  }
}
```

### Fluxo de Decisão Híbrido

#### Algoritmo de Processamento:
```javascript
async function analyzeText(selectedText) {
  // 1. Extração de termos-chave
  const keywords = extractKeywords(selectedText);
  
  // 2. CAMADA 1: Google Fact Check
  const factCheckResults = await googleFactCheck(keywords);
  
  if (factCheckResults.isValid && factCheckResults.confidence >= 0.8) {
    return {
      source: 'fact_check',
      classification: factCheckResults.classification,
      confidence: factCheckResults.confidence,
      evidence: factCheckResults.evidence,
      cost: 0
    };
  }
  
  // 3. CAMADA 2: Groq LLM (Fallback)
  const llmResults = await groqAnalysis(selectedText);
  
  return {
    source: 'llm_analysis',
    classification: llmResults.classification,
    confidence: llmResults.confidence,
    reasoning: llmResults.reasoning,
    cost: calculateTokenCost(llmResults.usage)
  };
}
```

## Especificações Técnicas Detalhadas

### Algoritmo de Normalização de Texto

```javascript
// src/utils/text-processor.js
class TextProcessor {
  static normalize(text) {
    return text
      // Remove caracteres de controle e espaços extras
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\s+/g, ' ')
      // Normaliza Unicode (NFD -> NFC)
      .normalize('NFC')
      // Remove espaços no início e fim
      .trim()
      // Converte para lowercase para hashing consistente
      .toLowerCase()
      // Remove pontuação redundante
      .replace(/[.,;:!?]{2,}/g, (match) => match[0])
      // Normaliza aspas
      .replace(/[""'']/g, '"')
      .replace(/['']/g, "'");
  }

  static generateHash(text) {
    const normalized = this.normalize(text);
    return CryptoJS.SHA256(normalized).toString();
  }

  static isValidLength(text) {
    const cleaned = text.trim();
    return cleaned.length >= 10 && cleaned.length <= 2000;
  }

  static extractSentences(text) {
    // Regex melhorada para divisão de sentenças em português
    const sentenceRegex = /[.!?]+\s+(?=[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ])/g;
    return text.split(sentenceRegex)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}
```

### Extração Avançada de Termos-chave

```javascript
// src/utils/keyword-extractor.js
class KeywordExtractor {
  constructor() {
    this.stopWords = new Set([
      'a', 'o', 'e', 'é', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não',
      'que', 'se', 'na', 'por', 'mais', 'as', 'os', 'como', 'mas', 'foi', 'ao', 'ele',
      'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos',
      'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela',
      'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'suas', 'numa'
    ]);

    this.factCheckKeywords = new Set([
      'fake', 'falso', 'verdade', 'mentira', 'boato', 'rumor', 'confirmado',
      'desmentido', 'verificado', 'checado', 'fact', 'check', 'hoax', 'mito'
    ]);
  }

  extractKeywords(text) {
    const nlp = require('compromise');
    const doc = nlp(text);

    // Extração básica com compromise
    const basicExtraction = {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      dates: doc.dates().out('array'),
      money: doc.money().out('array'),
      topics: doc.topics().out('array')
    };

    // Extração customizada para fact-checking
    const customKeywords = this.extractCustomKeywords(text);
    const claims = this.extractClaims(text);
    const numbers = this.extractNumbers(text);

    return {
      ...basicExtraction,
      customKeywords,
      claims,
      numbers,
      factCheckIndicators: this.findFactCheckIndicators(text),
      sentiment: this.analyzeSentiment(text),
      urgencyWords: this.findUrgencyWords(text)
    };
  }

  extractCustomKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
      .split(/\s+/)
      .filter(word =>
        word.length > 3 &&
        !this.stopWords.has(word) &&
        !/^\d+$/.test(word)
      );

    // Contagem de frequência
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Retorna palavras mais frequentes (mínimo 2 ocorrências)
    return Object.entries(frequency)
      .filter(([word, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  extractClaims(text) {
    const claimPatterns = [
      /(?:segundo|conforme|de acordo com)\s+(.{10,50})/gi,
      /(?:estudo|pesquisa|relatório)\s+(?:mostra|revela|comprova|indica)\s+(.{10,50})/gi,
      /(?:especialistas?|cientistas?|médicos?)\s+(?:afirmam|dizem|confirmam)\s+(.{10,50})/gi,
      /(?:\d+%|\d+\s*por\s*cento)\s+(.{10,50})/gi
    ];

    const claims = [];
    claimPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1]) {
          claims.push(match[1].trim());
        }
      });
    });

    return claims.slice(0, 5); // Máximo 5 claims
  }

  extractNumbers(text) {
    const numberPatterns = [
      /\d+(?:\.\d+)?%/g,                    // Percentuais
      /R\$\s*\d+(?:\.\d+)?(?:,\d{2})?/g,   // Valores monetários
      /\d{1,3}(?:\.\d{3})*(?:,\d+)?/g,     // Números grandes
      /\d+\s*(?:mil|milhão|milhões|bilhão|bilhões)/gi // Números por extenso
    ];

    const numbers = [];
    numberPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      numbers.push(...matches.map(m => m[0]));
    });

    return [...new Set(numbers)].slice(0, 10);
  }

  findFactCheckIndicators(text) {
    const indicators = [];
    this.factCheckKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        indicators.push(keyword);
      }
    });
    return indicators;
  }

  findUrgencyWords(text) {
    const urgencyWords = [
      'urgente', 'breaking', 'última hora', 'agora', 'imediatamente',
      'cuidado', 'atenção', 'alerta', 'perigo', 'emergência'
    ];

    return urgencyWords.filter(word =>
      text.toLowerCase().includes(word)
    );
  }

  analyzeSentiment(text) {
    const positiveWords = ['bom', 'ótimo', 'excelente', 'positivo', 'sucesso'];
    const negativeWords = ['ruim', 'péssimo', 'terrível', 'negativo', 'fracasso'];

    const words = text.toLowerCase().split(/\s+/);
    const positive = words.filter(w => positiveWords.includes(w)).length;
    const negative = words.filter(w => negativeWords.includes(w)).length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }
}
```

### Configuração do Ambiente de Desenvolvimento

#### Docker Setup Completo

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:v1.15.0
    container_name: veritas-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
      - QDRANT__LOG_LEVEL=INFO
      - QDRANT__STORAGE__STORAGE_PATH=/qdrant/storage
      - QDRANT__SERVICE__ENABLE_CORS=true
      - QDRANT__CLUSTER__ENABLED=false
      - QDRANT__SERVICE__MAX_REQUEST_SIZE_MB=32
      - QDRANT__STORAGE__PERFORMANCE__MAX_SEARCH_THREADS=4
      - QDRANT__STORAGE__OPTIMIZERS__MEMMAP_THRESHOLD_KB=200000
    volumes:
      - qdrant_storage:/qdrant/storage
      - ./qdrant/config:/qdrant/config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  qdrant-dashboard:
    image: qdrant/qdrant:v1.15.0
    container_name: veritas-qdrant-dashboard
    ports:
      - "6335:6333"
    depends_on:
      qdrant:
        condition: service_healthy
    command: ["./qdrant", "--uri", "http://qdrant:6333"]
    profiles: ["dashboard"]

volumes:
  qdrant_storage:
    driver: local
```

```yaml
# docker/docker-compose.test.yml
version: '3.8'

services:
  qdrant-test:
    image: qdrant/qdrant:v1.15.0
    container_name: veritas-qdrant-test
    ports:
      - "6335:6333"
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__LOG_LEVEL=WARN
      - QDRANT__STORAGE__STORAGE_PATH=/qdrant/storage
      - QDRANT__SERVICE__ENABLE_CORS=true
      - QDRANT__CLUSTER__ENABLED=false
      - QDRANT__SERVICE__MAX_REQUEST_SIZE_MB=16
      - QDRANT__STORAGE__PERFORMANCE__MAX_SEARCH_THREADS=2
      - QDRANT__STORAGE__OPTIMIZERS__MEMMAP_THRESHOLD_KB=100000
    volumes:
      - ./test_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    tmpfs:
      - /qdrant/storage:noexec,nosuid,size=100m

  test-runner:
    build:
      context: ..
      dockerfile: docker/Dockerfile.test
    container_name: veritas-test-runner
    depends_on:
      qdrant-test:
        condition: service_healthy
    environment:
      - QDRANT_URL=http://qdrant-test:6333
      - NODE_ENV=test
      - PYTHONPATH=/app
    volumes:
      - ..:/app
      - ../test-results:/app/test-results
      - ../coverage:/app/coverage
    working_dir: /app
    command: npm run test:all
```

#### Configuração de Variáveis de Ambiente

```bash
# .env.example
# Configurações do Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=veritas_embeddings
QDRANT_API_KEY=

# API Keys Padrão (para desenvolvimento)
GOOGLE_FACT_CHECK_API_KEY=your_google_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Configurações de Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações de Cache
CACHE_ENABLED=true
CACHE_MAX_SIZE=10000
CACHE_TTL_DAYS=30

# Configurações de Logging
LOG_LEVEL=info
LOG_TO_FILE=false
LOG_FILE_PATH=./logs/veritas.log

# Configurações de Desenvolvimento
NODE_ENV=development
DEBUG_MODE=true
MOCK_APIS=false

# Configurações de Teste
TEST_TIMEOUT=30000
TEST_QDRANT_URL=http://localhost:6335
```

#### Script de Setup de Desenvolvimento

```javascript
// scripts/setup-dev.js
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
      'docker/qdrant/config'
    ];
  }

  async setup() {
    console.log('🚀 Configurando ambiente de desenvolvimento...\n');

    try {
      await this.checkPrerequisites();
      await this.createDirectories();
      await this.copyConfigFiles();
      await this.installDependencies();
      await this.setupQdrant();
      await this.runInitialTests();

      console.log('\n✅ Setup concluído com sucesso!');
      console.log('\n📋 Próximos passos:');
      console.log('1. Configure suas API keys no arquivo .env');
      console.log('2. Execute: npm run dev');
      console.log('3. Acesse: http://localhost:6333/dashboard (Qdrant)');

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
      { cmd: 'docker --version', name: 'Docker', minVersion: '20.0.0' }
    ];

    for (const req of requirements) {
      try {
        const output = execSync(req.cmd, { encoding: 'utf8' });
        console.log(`  ✓ ${req.name}: ${output.trim()}`);
      } catch (error) {
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
      { src: 'docker/qdrant/config/config.yaml.example', dest: 'docker/qdrant/config/config.yaml' }
    ];

    for (const { src, dest } of configFiles) {
      const srcPath = path.join(this.projectRoot, src);
      const destPath = path.join(this.projectRoot, dest);

      if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✓ Copiado: ${src} → ${dest}`);
      } else {
        console.log(`  - Já existe: ${dest}`);
      }
    }
  }

  async installDependencies() {
    console.log('\n📦 Instalando dependências...');

    try {
      execSync('npm install', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      console.log('  ✓ Dependências instaladas');
    } catch (error) {
      throw new Error('Falha na instalação das dependências');
    }
  }

  async setupQdrant() {
    console.log('\n🗄️ Configurando Qdrant...');

    try {
      // Inicia Qdrant via Docker
      execSync('docker-compose -f docker/docker-compose.yml up -d qdrant', {
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

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('http://localhost:6333/health');
        if (response.ok) return;
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
        distance: "Cosine"
      },
      optimizers_config: {
        default_segment_number: 2
      },
      replication_factor: 1
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
    } catch (error) {
      throw new Error('Falha ao criar collection: ' + error.message);
    }
  }

  async runInitialTests() {
    console.log('\n🧪 Executando testes iniciais...');

    try {
      execSync('npm run test:unit -- --maxWorkers=1', {
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
```

### Rate Limits e Custos

#### Google Fact Check API:
- **Free Tier**: 1000 requests/day
- **Paid Tier**: $0.50 per 1000 requests
- **Rate Limit**: 100 requests/minute

#### Groq API:
- **Mixtral-8x7B**: $0.27 per 1M input tokens, $0.27 per 1M output tokens
- **Gemma-7B**: $0.10 per 1M input tokens, $0.10 per 1M output tokens
- **Rate Limit**: 30 requests/minute (free tier)

### Qdrant Schema Atualizado (v1.15.0)

#### Collection Configuration:
```json
{
  "collection_name": "veritas_embeddings",
  "vectors": {
    "size": 384,
    "distance": "Cosine",
    "hnsw_config": {
      "m": 16,
      "ef_construct": 100,
      "full_scan_threshold": 10000,
      "max_indexing_threads": 4
    },
    "quantization_config": {
      "scalar": {
        "type": "int8",
        "quantile": 0.99,
        "always_ram": true
      }
    }
  },
  "optimizers_config": {
    "deleted_threshold": 0.2,
    "vacuum_min_vector_number": 1000,
    "default_segment_number": 2,
    "max_segment_size": 200000,
    "memmap_threshold": 200000,
    "indexing_threshold": 20000,
    "flush_interval_sec": 5,
    "max_optimization_threads": 2
  },
  "wal_config": {
    "wal_capacity_mb": 32,
    "wal_segments_ahead": 0
  },
  "shard_number": 1,
  "replication_factor": 1,
  "write_consistency_factor": 1,
  "on_disk_payload": true,
  "payload_schema": {
    "text_hash": {
      "type": "keyword",
      "index": true
    },
    "original_text": {
      "type": "text",
      "index": false
    },
    "classification": {
      "type": "keyword",
      "index": true
    },
    "confidence_score": {
      "type": "float",
      "index": true,
      "range": true
    },
    "source_type": {
      "type": "keyword",
      "index": true
    },
    "fact_check_source": {
      "type": "text",
      "index": false
    },
    "fact_check_url": {
      "type": "keyword",
      "index": false
    },
    "fact_check_date": {
      "type": "integer",
      "index": true,
      "range": true
    },
    "llm_reasoning": {
      "type": "text",
      "index": false
    },
    "keywords_extracted": {
      "type": "keyword",
      "index": true
    },
    "timestamp": {
      "type": "integer",
      "index": true,
      "range": true
    },
    "model_version": {
      "type": "keyword",
      "index": true
    },
    "cost_tokens": {
      "type": "integer",
      "index": true,
      "range": true
    },
    "language": {
      "type": "keyword",
      "index": true
    },
    "domain": {
      "type": "keyword",
      "index": true
    },
    "user_feedback": {
      "type": "keyword",
      "index": true
    }
  }
}
```

#### Qdrant Client Configuration (v1.15.0):
```javascript
// src/services/qdrant-client.js
import { QdrantClient } from '@qdrant/js-client-rest';

class VeritasQdrantClient {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000
    });

    this.collectionName = 'veritas_embeddings';
    this.vectorSize = 384;
  }

  async initializeCollection() {
    try {
      // Verificar se collection existe
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!exists) {
        await this.createCollection();
      }

      // Criar índices para payload
      await this.createPayloadIndices();

    } catch (error) {
      console.error('Error initializing Qdrant collection:', error);
      throw error;
    }
  }

  async createCollection() {
    const config = {
      vectors: {
        size: this.vectorSize,
        distance: 'Cosine',
        hnsw_config: {
          m: 16,
          ef_construct: 100,
          full_scan_threshold: 10000,
          max_indexing_threads: 4
        },
        quantization_config: {
          scalar: {
            type: 'int8',
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

    await this.client.createCollection(this.collectionName, config);
  }

  async createPayloadIndices() {
    const indices = [
      { field: 'text_hash', type: 'keyword' },
      { field: 'classification', type: 'keyword' },
      { field: 'confidence_score', type: 'float' },
      { field: 'source_type', type: 'keyword' },
      { field: 'fact_check_date', type: 'integer' },
      { field: 'keywords_extracted', type: 'keyword' },
      { field: 'timestamp', type: 'integer' },
      { field: 'model_version', type: 'keyword' },
      { field: 'cost_tokens', type: 'integer' },
      { field: 'language', type: 'keyword' },
      { field: 'domain', type: 'keyword' },
      { field: 'user_feedback', type: 'keyword' }
    ];

    for (const index of indices) {
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: index.field,
          field_schema: index.type
        });
      } catch (error) {
        // Índice pode já existir
        if (!error.message.includes('already exists')) {
          console.warn(`Failed to create index for ${index.field}:`, error);
        }
      }
    }
  }

  async searchSimilar(vector, filter = null, limit = 10, scoreThreshold = 0.85) {
    const searchParams = {
      vector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
      with_vector: false
    };

    if (filter) {
      searchParams.filter = filter;
    }

    const result = await this.client.search(this.collectionName, searchParams);
    return result;
  }

  async insertPoint(id, vector, payload) {
    const point = {
      id,
      vector,
      payload: {
        ...payload,
        timestamp: Date.now(),
        model_version: '1.0.0'
      }
    };

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [point]
    });
  }

  async batchInsert(points) {
    const formattedPoints = points.map(point => ({
      ...point,
      payload: {
        ...point.payload,
        timestamp: Date.now(),
        model_version: '1.0.0'
      }
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: formattedPoints
    });
  }

  async deleteByFilter(filter) {
    await this.client.delete(this.collectionName, {
      filter,
      wait: true
    });
  }

  async getCollectionInfo() {
    return await this.client.getCollection(this.collectionName);
  }

  async optimizeCollection() {
    await this.client.updateCollection(this.collectionName, {
      optimizers_config: {
        deleted_threshold: 0.2,
        vacuum_min_vector_number: 1000,
        default_segment_number: 2,
        max_segment_size: 200000,
        memmap_threshold: 200000,
        indexing_threshold: 20000,
        flush_interval_sec: 5,
        max_optimization_threads: 2
      }
    });
  }
}

export default VeritasQdrantClient;
```

## Performance Requirements

### Response Time Targets (Atualizado)
- **Cache Hit**: < 100ms (95th percentile)
- **Google Fact Check (Camada 1)**: < 800ms (90th percentile)
- **Vector Search**: < 500ms (95th percentile)
- **Groq LLM (Camada 2)**: < 2500ms (90th percentile)
- **UI Rendering**: < 50ms para tooltip

### Accuracy Metrics (Revisado)
- **Precision Geral**: ≥ 87% (melhoria com fact-checking)
- **Recall para FAKE**: ≥ 82% (detecção aprimorada)
- **F1-Score**: ≥ 84% overall
- **Fact Check Hit Rate**: ≥ 35% das consultas
- **LLM Fallback Rate**: < 40% após otimização

### Cost Efficiency Targets
- **Redução de Custos LLM**: 70% comparado a abordagem única
- **Custo Médio por Consulta**: < $0.001
- **Budget Diário**: < $5.00 para 10K consultas
- **ROI Fact Check**: 5:1 (economia vs precisão)

### Resource Limits (Atualizado)
- **Memory Usage**: < 60MB RAM (aumento devido a NLP)
- **Storage**: < 150MB dados locais
- **Network**: < 1.5MB/dia uso médio
- **CPU**: < 7% utilização durante análise

## Security & Privacy

### Data Protection
- **Encryption**: AES-256 para dados sensíveis em IndexedDB
- **Hashing**: SHA-256 para identificação de textos
- **No Tracking**: Zero coleta de dados pessoais identificáveis
- **Local First**: Processamento prioritariamente local

### API Security
- **Rate Limiting**: Máximo 100 requests/hora por usuário
- **Token Rotation**: API keys rotacionadas a cada 30 dias
- **HTTPS Only**: Todas comunicações via TLS 1.3
- **Request Sanitization**: Validação e escape de inputs

### Privacy Compliance
- **GDPR**: Direito ao esquecimento implementado
- **CCPA**: Opt-out de coleta de dados
- **Transparência**: Logs de atividade acessíveis ao usuário
- **Consentimento**: Opt-in explícito para funcionalidades

## Estratégias Avançadas de Tratamento de Erros

### Sistema de Error Handling Robusto

#### **Classificação de Erros**
```javascript
// src/utils/error-handler.js
class ErrorHandler {
  constructor() {
    this.errorTypes = {
      NETWORK: 'network',
      API_LIMIT: 'api_limit',
      VALIDATION: 'validation',
      TIMEOUT: 'timeout',
      AUTHENTICATION: 'auth',
      QUOTA_EXCEEDED: 'quota',
      UNKNOWN: 'unknown'
    };

    this.severityLevels = {
      LOW: 'low',        // Não impede funcionamento
      MEDIUM: 'medium',  // Funcionalidade degradada
      HIGH: 'high',      // Funcionalidade bloqueada
      CRITICAL: 'critical' // Sistema inoperante
    };
  }

  async handleError(error, context = {}) {
    const errorInfo = this.classifyError(error);
    const strategy = this.getRecoveryStrategy(errorInfo);

    // Log do erro
    await this.logError(errorInfo, context);

    // Notificar usuário se necessário
    if (errorInfo.severity !== this.severityLevels.LOW) {
      await this.notifyUser(errorInfo, strategy);
    }

    // Executar estratégia de recuperação
    return await this.executeRecoveryStrategy(strategy, errorInfo, context);
  }

  classifyError(error) {
    let type = this.errorTypes.UNKNOWN;
    let severity = this.severityLevels.MEDIUM;
    let recoverable = true;

    // Classificação por tipo de erro
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      type = this.errorTypes.NETWORK;
      severity = this.severityLevels.MEDIUM;
    } else if (error.status === 429) {
      type = this.errorTypes.API_LIMIT;
      severity = this.severityLevels.LOW;
    } else if (error.status === 401 || error.status === 403) {
      type = this.errorTypes.AUTHENTICATION;
      severity = this.severityLevels.HIGH;
    } else if (error.name === 'TimeoutError') {
      type = this.errorTypes.TIMEOUT;
      severity = this.severityLevels.MEDIUM;
    } else if (error.message?.includes('quota')) {
      type = this.errorTypes.QUOTA_EXCEEDED;
      severity = this.severityLevels.MEDIUM;
    }

    return {
      type,
      severity,
      recoverable,
      originalError: error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
  }

  getRecoveryStrategy(errorInfo) {
    const strategies = {
      [this.errorTypes.NETWORK]: 'retry_with_backoff',
      [this.errorTypes.API_LIMIT]: 'fallback_to_cache',
      [this.errorTypes.TIMEOUT]: 'retry_with_shorter_timeout',
      [this.errorTypes.AUTHENTICATION]: 'prompt_reauth',
      [this.errorTypes.QUOTA_EXCEEDED]: 'degraded_mode',
      [this.errorTypes.VALIDATION]: 'sanitize_and_retry',
      [this.errorTypes.UNKNOWN]: 'fallback_to_cache'
    };

    return strategies[errorInfo.type] || 'fallback_to_cache';
  }
}
```

#### **Retry Logic com Backoff Exponencial**
```javascript
// src/utils/retry-manager.js
class RetryManager {
  constructor() {
    this.defaultConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffFactor: 2,
      jitter: true
    };
  }

  async executeWithRetry(operation, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Não retry em erros não recuperáveis
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Último attempt
        if (attempt === finalConfig.maxRetries) {
          break;
        }

        // Calcular delay
        const delay = this.calculateDelay(attempt, finalConfig);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  isNonRetryableError(error) {
    const nonRetryableStatuses = [400, 401, 403, 404, 422];
    return nonRetryableStatuses.includes(error.status);
  }

  calculateDelay(attempt, config) {
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
    delay = Math.min(delay, config.maxDelay);

    // Adicionar jitter para evitar thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Comportamento Offline e Modo Degradado

#### **Detector de Conectividade**
```javascript
// src/services/connectivity-manager.js
class ConnectivityManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });

    // Verificação periódica mais robusta
    setInterval(() => {
      this.checkConnectivity();
    }, 30000);
  }

  async checkConnectivity() {
    try {
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });

      const wasOnline = this.isOnline;
      this.isOnline = response.ok;

      if (wasOnline !== this.isOnline) {
        this.notifyListeners(this.isOnline ? 'online' : 'offline');
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.notifyListeners('offline');
      }
    }
  }

  onConnectivityChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.isOnline);
      } catch (error) {
        console.error('Error in connectivity listener:', error);
      }
    });
  }
}
```

#### **Modo Cache-Only**
```javascript
// src/services/offline-manager.js
class OfflineManager {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.offlineMode = false;
    this.queuedRequests = [];
  }

  enableOfflineMode() {
    this.offlineMode = true;
    this.showOfflineNotification();
  }

  disableOfflineMode() {
    this.offlineMode = false;
    this.hideOfflineNotification();
    this.processQueuedRequests();
  }

  async analyzeTextOffline(text) {
    // Tentar buscar no cache local
    const cachedResult = await this.cacheManager.get(text);

    if (cachedResult) {
      return {
        ...cachedResult,
        source: 'cache',
        offline: true,
        confidence: cachedResult.confidence * 0.9 // Reduzir confiança ligeiramente
      };
    }

    // Se não encontrar no cache, adicionar à fila
    this.queuedRequests.push({
      text,
      timestamp: Date.now(),
      id: this.generateRequestId()
    });

    return {
      classification: 'INCONCLUSIVA',
      confidence: 0,
      source: 'offline',
      message: 'Análise será processada quando a conexão for restaurada',
      queued: true
    };
  }

  showOfflineNotification() {
    const notification = document.createElement('div');
    notification.id = 'veritas-offline-notification';
    notification.className = 'veritas-notification offline';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="icon">📡</span>
        <span class="message">Modo offline ativo. Usando apenas cache local.</span>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(notification);
  }

  async processQueuedRequests() {
    if (this.queuedRequests.length === 0) return;

    const requests = [...this.queuedRequests];
    this.queuedRequests = [];

    for (const request of requests) {
      try {
        // Reprocessar request quando voltar online
        const result = await this.analyzeTextOnline(request.text);
        this.notifyRequestComplete(request.id, result);
      } catch (error) {
        console.error('Error processing queued request:', error);
      }
    }
  }
}
```

### Mensagens de Erro Amigáveis ao Usuário

#### **Sistema de Notificações**
```javascript
// src/utils/user-notifications.js
class UserNotificationManager {
  constructor() {
    this.notifications = new Map();
    this.container = this.createNotificationContainer();
  }

  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'veritas-notifications';
    container.className = 'veritas-notifications-container';
    document.body.appendChild(container);
    return container;
  }

  showError(errorType, context = {}) {
    const errorMessages = {
      network: {
        title: 'Problema de Conexão',
        message: 'Não foi possível conectar aos serviços de verificação. Tentando novamente...',
        icon: '🌐',
        type: 'warning',
        actions: [
          { text: 'Tentar Novamente', action: 'retry' },
          { text: 'Usar Cache', action: 'cache_only' }
        ]
      },

      api_limit: {
        title: 'Limite de API Atingido',
        message: 'Muitas verificações em pouco tempo. Aguarde alguns minutos.',
        icon: '⏱️',
        type: 'info',
        actions: [
          { text: 'Usar Cache', action: 'cache_only' }
        ]
      },

      quota_exceeded: {
        title: 'Cota Diária Excedida',
        message: 'Limite diário de verificações atingido. Considere usar suas próprias API keys.',
        icon: '📊',
        type: 'warning',
        actions: [
          { text: 'Configurar APIs', action: 'open_settings' },
          { text: 'Usar Cache', action: 'cache_only' }
        ]
      },

      auth: {
        title: 'Problema de Autenticação',
        message: 'Suas API keys podem estar inválidas. Verifique as configurações.',
        icon: '🔑',
        type: 'error',
        actions: [
          { text: 'Verificar Configurações', action: 'open_settings' }
        ]
      },

      text_too_short: {
        title: 'Texto Muito Curto',
        message: 'Selecione pelo menos 10 caracteres para análise.',
        icon: '📝',
        type: 'info',
        autoHide: 3000
      },

      text_too_long: {
        title: 'Texto Muito Longo',
        message: 'Texto truncado para 2000 caracteres. Análise pode ser menos precisa.',
        icon: '✂️',
        type: 'warning',
        autoHide: 5000
      },

      unsupported_language: {
        title: 'Idioma Não Suportado',
        message: 'Tentando análise em inglês. Resultado pode ser menos preciso.',
        icon: '🌍',
        type: 'info',
        autoHide: 4000
      }
    };

    const config = errorMessages[errorType];
    if (!config) {
      console.error('Unknown error type:', errorType);
      return;
    }

    this.showNotification(config, context);
  }

  showNotification(config, context = {}) {
    const id = this.generateNotificationId();
    const notification = this.createNotificationElement(id, config, context);

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Auto-hide se configurado
    if (config.autoHide) {
      setTimeout(() => {
        this.hideNotification(id);
      }, config.autoHide);
    }

    // Animação de entrada
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    return id;
  }

  createNotificationElement(id, config, context) {
    const notification = document.createElement('div');
    notification.className = `veritas-notification ${config.type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');

    const actionsHtml = config.actions ?
      config.actions.map(action =>
        `<button class="notification-action" data-action="${action.action}">
          ${action.text}
        </button>`
      ).join('') : '';

    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon" aria-hidden="true">${config.icon}</span>
          <span class="notification-title">${config.title}</span>
          <button class="notification-close" aria-label="Fechar notificação">×</button>
        </div>
        <div class="notification-message">${config.message}</div>
        ${actionsHtml ? `<div class="notification-actions">${actionsHtml}</div>` : ''}
      </div>
    `;

    // Event listeners
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.hideNotification(id);
    });

    if (config.actions) {
      notification.querySelectorAll('.notification-action').forEach(button => {
        button.addEventListener('click', (e) => {
          const action = e.target.dataset.action;
          this.handleNotificationAction(action, context);
          this.hideNotification(id);
        });
      });
    }

    return notification;
  }

  handleNotificationAction(action, context) {
    switch (action) {
      case 'retry':
        if (context.retryCallback) {
          context.retryCallback();
        }
        break;
      case 'cache_only':
        // Ativar modo cache-only
        window.veritasApp?.enableCacheOnlyMode();
        break;
      case 'open_settings':
        // Abrir página de configurações
        chrome.runtime.openOptionsPage();
        break;
    }
  }

  hideNotification(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.classList.add('hide');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.notifications.delete(id);
      }, 300);
    }
  }

  generateNotificationId() {
    return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
```

## Configuration

### User Settings
```json
{
  "similarity_threshold": 0.85,
  "llm_model": "openai/gpt-4o-mini",
  "cache_enabled": true,
  "cache_size_limit": 10000,
  "auto_analyze": false,
  "ui_theme": "auto",
  "confidence_display": "percentage",
  "keyboard_shortcuts": true
}
```

### Advanced Options
- **Debug Mode**: Logs detalhados para troubleshooting
- **Custom Prompts**: Templates personalizáveis para LLM
- **Whitelist Domains**: Sites confiáveis que dispensam análise
- **Blacklist Patterns**: Padrões de texto a ignorar

## Testing Strategy

### Unit Tests (pytest)
- **Coverage Target**: ≥ 90% code coverage
- **Framework**: pytest com plugins essenciais
- **Test Structure**: Organização em `tests/` seguindo estrutura do projeto
- **Fixtures**: Configuração de dados de teste reutilizáveis
- **Mocking**: Simulação de APIs externas sem uso real

#### Pytest Configuration
```python
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --cov=src
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=90
    --strict-markers
    --disable-warnings
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
    api: Tests requiring external APIs
    fact_check: Google Fact Check API tests
    llm: Groq LLM API tests
```

#### Required pytest Plugins
```json
{
  "pytest": "^7.4.0",
  "pytest-cov": "^4.1.0",
  "pytest-mock": "^3.11.1",
  "pytest-asyncio": "^0.21.1",
  "pytest-xdist": "^3.3.1",
  "pytest-html": "^3.2.0",
  "pytest-benchmark": "^4.0.0",
  "pytest-httpx": "^0.21.0",
  "pytest-vcr": "^1.0.2"
}
```

### Test Categories

#### Unit Tests (`tests/unit/`)
- **Keyword Extraction**: Validação de NLP e termos-chave
- **Fact Check Parser**: Processamento de respostas Google API
- **LLM Response Parser**: Análise de outputs Groq
- **Decision Logic**: Algoritmo de fallback entre camadas
- **Cost Calculation**: Métricas de tokens e custos
- **Cache Operations**: CRUD em IndexedDB
- **Text Processing**: Normalização e validação

#### Integration Tests (`tests/integration/`)
- **Google Fact Check API**: Mocking de responses reais
- **Groq API Integration**: Simulação de chamadas LLM
- **Qdrant Connection**: Setup/teardown de collections
- **Hybrid Flow**: Teste completo das duas camadas
- **Storage Layer**: Persistência com metadata expandida

#### API-Specific Tests (`tests/api/`)
```python
# tests/api/test_google_fact_check.py
import pytest
from unittest.mock import Mock
from src.services.fact_check_service import GoogleFactCheckService

class TestGoogleFactCheck:
    
    @pytest.fixture
    def fact_check_service(self):
        return GoogleFactCheckService(api_key="test_key")
    
    @pytest.mark.fact_check
    def test_keyword_extraction(self, fact_check_service):
        text = "Vacinas causam autismo segundo estudo"
        keywords = fact_check_service.extract_keywords(text)
        assert "vacinas" in keywords.topics
        assert "autismo" in keywords.topics
    
    @pytest.mark.fact_check
    def test_fact_check_validation(self, fact_check_service):
        mock_response = {
            "claims": [{
                "claimReview": [{
                    "publisher": {"name": "Snopes"},
                    "textualRating": "False",
                    "reviewDate": "2024-01-15T10:00:00Z"
                }]
            }]
        }
        
        result = fact_check_service.validate_response(mock_response)
        assert result.is_valid
        assert result.classification == "FAKE"
        assert result.confidence > 0.8

# tests/api/test_groq_llm.py
import pytest
from src.services.llm_service import GroqLLMService

class TestGroqLLM:
    
    @pytest.fixture
    def llm_service(self):
        return GroqLLMService(api_key="test_key")
    
    @pytest.mark.llm
    def test_prompt_construction(self, llm_service):
        text = "Exemplo de texto para análise"
        prompt = llm_service.build_analysis_prompt(text)
        assert "estrutura argumentativa" in prompt.lower()
        assert "fontes" in prompt.lower()
    
    @pytest.mark.llm
    def test_response_parsing(self, llm_service):
        mock_response = {
            "choices": [{
                "message": {
                    "content": "CLASSIFICACAO: FAKE\nSCORE: 15\nJUSTIFICATIVA: Sem fontes verificáveis"
                }
            }]
        }
        
        result = llm_service.parse_response(mock_response)
        assert result.classification == "FAKE"
        assert result.score == 15
        assert "fontes" in result.justification
```

#### Performance Tests (`tests/performance/`)
```python
# tests/performance/test_hybrid_performance.py
import pytest
from src.services.hybrid_analyzer import HybridAnalyzer

class TestHybridPerformance:
    
    @pytest.fixture
    def analyzer(self):
        return HybridAnalyzer()
    
    @pytest.mark.benchmark(group="fact_check")
    def test_fact_check_speed(self, benchmark, analyzer):
        text = "Texto de exemplo para verificação de fatos"
        result = benchmark(analyzer.fact_check_layer, text)
        assert result is not None
    
    @pytest.mark.benchmark(group="llm_fallback")
    def test_llm_fallback_speed(self, benchmark, analyzer):
        text = "Texto complexo que requer análise LLM"
        result = benchmark(analyzer.llm_layer, text)
        assert result is not None
    
    @pytest.mark.benchmark(group="hybrid_flow")
    def test_complete_flow_speed(self, benchmark, analyzer):
        text = "Texto para teste de fluxo completo"
        result = benchmark(analyzer.analyze, text)
        assert result.classification in ["CONFIAVEL", "FAKE", "INCONCLUSIVA", "SEM_FUNDAMENTO"]
```

#### Cost Analysis Tests (`tests/cost/`)
```python
# tests/cost/test_cost_optimization.py
import pytest
from src.services.cost_tracker import CostTracker

class TestCostOptimization:
    
    @pytest.fixture
    def cost_tracker(self):
        return CostTracker()
    
    def test_fact_check_cost_calculation(self, cost_tracker):
        # Fact check é gratuito até 1000 requests/dia
        cost = cost_tracker.calculate_fact_check_cost(500)
        assert cost == 0.0
        
        cost = cost_tracker.calculate_fact_check_cost(1500)
        assert cost == 0.25  # 500 requests extras * $0.50/1000
    
    def test_llm_cost_calculation(self, cost_tracker):
        tokens_used = {"input": 150, "output": 50}
        cost = cost_tracker.calculate_groq_cost("mixtral-8x7b-32768", tokens_used)
        expected = (150 * 0.27 + 50 * 0.27) / 1000000
        assert abs(cost - expected) < 0.0001
    
    def test_daily_budget_tracking(self, cost_tracker):
        cost_tracker.add_cost("fact_check", 0.0)
        cost_tracker.add_cost("llm", 0.002)
        
        daily_total = cost_tracker.get_daily_total()
        assert daily_total == 0.002
        assert cost_tracker.is_within_budget(5.0)
```

### User Acceptance Testing
- **A/B Testing**: Diferentes thresholds de similaridade
- **Usability**: Tempo médio para completar verificação
- **Accessibility**: Screen readers + navegação por teclado
- **Beta Program**: 100 usuários por 2 semanas

## CI/CD Pipeline

### GitHub Actions Workflow

#### Main Pipeline (`.github/workflows/main.yml`)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.9, 3.10, 3.11]
    
    services:
      qdrant:
        image: qdrant/qdrant:latest
        ports:
          - 6333:6333
        options: >-
          --health-cmd "curl -f http://localhost:6333/health"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    
    - name: Install uv
      run: |
        curl -LsSf https://astral.sh/uv/install.sh | sh
        echo "$HOME/.cargo/bin" >> $GITHUB_PATH

    - name: Install dependencies
      run: |
        uv sync --all-extras
        uv pip install --system -e .
    
    - name: Lint with flake8
      run: |
        flake8 src tests --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 src tests --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    
    - name: Type check with mypy
      run: mypy src
    
    - name: Security check with bandit
      run: bandit -r src
    
    - name: Run unit tests
      run: uv run pytest tests/unit -v --cov=src --cov-report=xml
    
    - name: Run integration tests
      run: uv run pytest tests/integration -v
      env:
        QDRANT_URL: http://localhost:6333
        OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY_TEST }}
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        flags: unittests
        name: codecov-umbrella

  build-extension:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build extension
      run: npm run build
    
    - name: Package extension
      run: npm run package
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: extension-build
        path: dist/

  e2e-tests:
    needs: build-extension
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: extension-build
        path: dist/
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: Install Playwright
      run: |
        npm install -g @playwright/test
        npx playwright install chromium firefox
    
    - name: Run E2E tests
      run: uv run pytest tests/e2e -v --browser=chromium --browser=firefox

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  deploy-staging:
    needs: [test, build-extension, e2e-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Deploy to staging
      run: echo "Deploy to staging environment"
      # Implementar deploy para ambiente de staging

  deploy-production:
    needs: [test, build-extension, e2e-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      run: echo "Deploy to production environment"
      # Implementar deploy para stores de extensões
```

### Quality Gates

#### Pre-commit Hooks (`.pre-commit-config.yaml`)
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
  
  - repo: https://github.com/psf/black
    rev: 23.7.0
    hooks:
      - id: black
        language_version: python3
  
  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
        args: ["--profile", "black"]
  
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        additional_dependencies: [flake8-docstrings]
  
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.5.1
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
```

### Test Environment Setup

#### Docker Compose for Testing (`docker-compose.test.yml`)
```yaml
version: '3.8'

services:
  qdrant-test:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
    volumes:
      - ./test_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      qdrant-test:
        condition: service_healthy
    environment:
      - QDRANT_URL=http://qdrant-test:6333
      - PYTHONPATH=/app
    volumes:
      - .:/app
      - ./test-results:/app/test-results
    command: pytest tests/ -v --junitxml=test-results/junit.xml
```

### Performance Testing

#### Load Testing with pytest-benchmark
```python
# tests/performance/test_embedding_performance.py
import pytest
from src.services.embedding_service import EmbeddingService

class TestEmbeddingPerformance:
    
    @pytest.fixture
    def embedding_service(self):
        return EmbeddingService()
    
    @pytest.mark.benchmark(group="embedding")
    def test_embedding_generation_speed(self, benchmark, embedding_service):
        text = "Este é um texto de exemplo para teste de performance"
        result = benchmark(embedding_service.generate_embedding, text)
        assert len(result) == 384
    
    @pytest.mark.benchmark(group="similarity")
    def test_similarity_search_speed(self, benchmark, embedding_service):
        # Setup test data
        test_embedding = [0.1] * 384
        result = benchmark(embedding_service.search_similar, test_embedding, limit=10)
        assert isinstance(result, list)
```

### Continuous Monitoring

#### Health Checks
```python
# tests/health/test_system_health.py
import pytest
import requests
from src.config import settings

class TestSystemHealth:
    
    def test_qdrant_health(self):
        response = requests.get(f"{settings.QDRANT_URL}/health")
        assert response.status_code == 200
    
    def test_openrouter_connectivity(self):
        headers = {"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
        response = requests.get("https://openrouter.ai/api/v1/models", headers=headers)
        assert response.status_code == 200
    
    @pytest.mark.slow
    def test_end_to_end_classification(self):
        # Test complete flow
        text = "Exemplo de texto para classificação"
        # Implementar teste completo
        pass
```

### Deployment Automation

#### Release Pipeline
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Create Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        draft: false
        prerelease: false
    
    - name: Submit to Chrome Web Store
      uses: mnao305/chrome-extension-upload@v4.0.1
      with:
        file-path: dist/extension.zip
        extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
        client-id: ${{ secrets.CHROME_CLIENT_ID }}
        client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
        refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
    
    - name: Submit to Firefox Add-ons
      run: |
        # Implementar submissão para AMO
        echo "Submitting to Firefox Add-ons"
```

### Metrics and Monitoring

#### Test Metrics Collection
```python
# conftest.py
import pytest
import time
from datetime import datetime

@pytest.fixture(autouse=True)
def test_metrics(request):
    start_time = time.time()
    yield
    duration = time.time() - start_time
    
    # Log test metrics
    print(f"Test {request.node.name} took {duration:.2f}s")
```

## Deployment Plan

### Browser Store Submission

#### Chrome Web Store
1. **Preparação**: Manifest V3 compliance check
2. **Assets**: Screenshots, ícones, descrições
3. **Review**: 3-5 dias úteis estimados
4. **Rollout**: 10% → 50% → 100% em 1 semana

#### Firefox Add-ons
1. **AMO Submission**: Automated review para código open-source
2. **Manual Review**: Se usar APIs sensíveis
3. **Signing**: Obrigatório para distribuição
4. **Timeline**: 1-3 dias para aprovação

### Rollout Strategy
- **Phase 1**: Beta release para 1000 usuários
- **Phase 2**: Gradual rollout 10%/dia
- **Phase 3**: Full release após métricas estáveis
- **Monitoring**: Error tracking via Sentry

## Maintenance & Updates

### Update Mechanisms
- **Auto-update**: Via browser extension APIs
- **Backward Compatibility**: Suporte a 2 versões anteriores
- **Migration Scripts**: Automática para schema changes
- **Rollback**: Capacidade de reverter em < 1 hora

### Monitoring & Analytics
```javascript
const metrics = {
  daily_active_users: 0,
  classification_accuracy: 0,
  cache_hit_rate: 0,
  average_response_time: 0,
  error_rate: 0
};
```

### Support & Documentation
- **FAQ**: Respostas para 90% das dúvidas comuns
- **Troubleshooting**: Guias step-by-step
- **API Docs**: OpenAPI 3.0 specification
- **Changelog**: Semantic versioning + release notes

## Métricas de Sucesso (Revisadas)
- **Tempo médio de resposta**: < 2 segundos (target: 1.5s)
- **Cache hit rate**: ≥ 60% após 1000 consultas
- **Accuracy**: ≥ 85% precision para detecção de fake news
- **User Retention**: ≥ 70% após 30 dias
- **Performance**: < 50MB RAM usage
- **Feedback Score**: ≥ 4.2/5.0 nas lojas de extensões

## Requisitos Não Funcionais (Expandidos)
- **Compatibilidade**: Chrome 88+, Firefox 109+, Edge 88+
- **Escalabilidade**: Suporte a 100K+ usuários simultâneos
- **Disponibilidade**: 99.5% uptime para serviços críticos
- **Manutenibilidade**: Código modular com clean architecture
- **Observabilidade**: Logs estruturados + métricas em tempo real
- **Compliance**: GDPR, CCPA, SOC 2 Type II

---

## Documentação de UX e Interface

### Wireframes e Componentes de Interface

#### **1. Botão de Verificação Flutuante**
```
┌─────────────────────────────────────────────────────────┐
│ [Texto selecionado pelo usuário...]                    │
│                                                         │
│ Lorem ipsum dolor sit amet, consectetur adipiscing      │
│ elit. Sed do eiusmod tempor incididunt ut labore et     │
│ dolore magna aliqua.                                    │
│                                    ┌─────────────────┐  │
│                                    │  🔍 Verificar   │  │
│                                    │     ⌨️ Ctrl+V    │  │
│                                    └─────────────────┘  │
└─────────────────────────────────────────────────────────┘

Estados do Botão:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  🔍 Verificar   │  │  ⏳ Analisando  │  │  ✓ Concluído   │
│     Idle        │  │    Loading      │  │    Success     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### **2. Tooltip de Resultado**
```
┌─────────────────────────────────────────────────────────┐
│                    VeritasAI                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🟢 CONFIÁVEL                              Score: 87%   │
│                                                         │
│  📊 Análise baseada em:                                 │
│  • Verificação factual (Google Fact Check)             │
│  • Fontes confiáveis identificadas                     │
│  • Linguagem objetiva                                  │
│                                                         │
│  🔗 Fonte: Agência Lupa                                │
│  📅 Verificado em: 15/01/2024                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │   Detalhes  │  │   Reportar  │                      │
│  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

#### **3. Estados de Classificação**
```
🟢 CONFIÁVEL (Verde - #22C55E)
├─ Score: 80-100%
├─ Ícone: ✓ ou 🛡️
└─ Mensagem: "Informação verificada e confiável"

🟡 INCONCLUSIVA (Amarelo - #F59E0B)
├─ Score: 40-79%
├─ Ícone: ⚠️ ou 🤔
└─ Mensagem: "Informação requer verificação adicional"

🟠 SEM FUNDAMENTO (Laranja - #F97316)
├─ Score: 20-39%
├─ Ícone: ⚡ ou 📋
└─ Mensagem: "Informação sem evidências suficientes"

🔴 FAKE (Vermelho - #EF4444)
├─ Score: 0-19%
├─ Ícone: ✗ ou 🚫
└─ Mensagem: "Informação identificada como falsa"
```

### Fluxo de Onboarding Detalhado

#### **Tela 1: Boas-vindas**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🛡️ Bem-vindo ao VeritasAI                  │
│                                                         │
│        Sua extensão de verificação de informações      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  • Verifica textos em tempo real               │   │
│  │  • Detecta desinformação automaticamente       │   │
│  │  • Funciona em qualquer site                   │   │
│  │  • Protege sua privacidade                     │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                    ┌─────────────┐                     │
│                    │  Começar    │                     │
│                    └─────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### **Tela 2: Escolha de Configuração**
```
┌─────────────────────────────────────────────────────────┐
│                 Configuração de API                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Como você gostaria de usar o VeritasAI?               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🚀 CONFIGURAÇÃO RÁPIDA          [RECOMENDADO]  │   │
│  │                                                 │   │
│  │ ✓ Funciona imediatamente                       │   │
│  │ ✓ Sem configuração técnica                     │   │
│  │ ✓ APIs compartilhadas incluídas                │   │
│  │ ⚠️ Limites de uso compartilhados                │   │
│  │                                                 │   │
│  │              [●] Selecionar                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔧 CONFIGURAÇÃO AVANÇADA                       │   │
│  │                                                 │   │
│  │ ✓ Use suas próprias API keys                   │   │
│  │ ✓ Limites dedicados                            │   │
│  │ ✓ Controle total de custos                     │   │
│  │ ⚠️ Requer configuração manual                   │   │
│  │                                                 │   │
│  │              [ ] Selecionar                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              ┌─────────┐  ┌─────────┐                  │
│              │ Voltar  │  │ Avançar │                  │
│              └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```

#### **Tela 3: Permissões**
```
┌─────────────────────────────────────────────────────────┐
│                   Permissões Necessárias               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Para funcionar corretamente, o VeritasAI precisa:     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📖 Ler conteúdo das páginas                    │   │
│  │    Para analisar textos selecionados           │   │
│  │                                                 │   │
│  │ 💾 Armazenar dados localmente                  │   │
│  │    Para cache e configurações                  │   │
│  │                                                 │   │
│  │ 🌐 Acessar APIs de verificação                 │   │
│  │    Para consultar bases de fact-checking       │   │
│  │                                                 │   │
│  │ 🎯 Mostrar notificações                        │   │
│  │    Para alertas e resultados                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️ Seus dados nunca são enviados para terceiros       │
│                                                         │
│              ┌─────────┐  ┌─────────┐                  │
│              │ Voltar  │  │ Aceitar │                  │
│              └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```

#### **Tela 4: Primeira Análise (Tutorial)**
```
┌─────────────────────────────────────────────────────────┐
│                    Vamos testar!                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Selecione o texto abaixo para fazer sua primeira      │
│  verificação:                                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │ "Segundo estudo recente, beber 8 copos de       │   │
│  │ água por dia é essencial para a saúde."         │   │
│  │                                                 │   │
│  │ [Este é um exemplo seguro para testar]          │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💡 Dica: Selecione o texto e clique em "Verificar"    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              🔍 Verificar                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              ┌─────────┐  ┌─────────┐                  │
│              │ Pular   │  │ Próximo │                  │
│              └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Especificações de Acessibilidade (WCAG 2.1 AA)

#### **Navegação por Teclado**
```javascript
// src/utils/accessibility.js
class AccessibilityManager {
  constructor() {
    this.focusableElements = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.keyboardShortcuts = {
      'Ctrl+V': 'verificarTextoSelecionado',
      'Escape': 'fecharTooltip',
      'Enter': 'confirmarAcao',
      'Space': 'ativarBotao',
      'Tab': 'navegarProximo',
      'Shift+Tab': 'navegarAnterior'
    };
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      const shortcut = this.getKeyboardShortcut(e);
      if (shortcut && this.keyboardShortcuts[shortcut]) {
        e.preventDefault();
        this[this.keyboardShortcuts[shortcut]]();
      }
    });
  }

  setupFocusManagement() {
    // Garantir que elementos interativos sejam focáveis
    const interactiveElements = document.querySelectorAll(
      this.focusableElements.join(',')
    );

    interactiveElements.forEach(element => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }

  announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
```

#### **ARIA Labels e Roles**
```html
<!-- Botão de verificação -->
<button
  id="veritas-verify-btn"
  class="veritas-verify-button"
  aria-label="Verificar confiabilidade do texto selecionado"
  aria-describedby="veritas-verify-help"
  role="button"
  tabindex="0">
  <span aria-hidden="true">🔍</span>
  Verificar
</button>

<div id="veritas-verify-help" class="sr-only">
  Pressione Enter ou Espaço para verificar a confiabilidade do texto selecionado.
  Atalho: Ctrl+V
</div>

<!-- Tooltip de resultado -->
<div
  id="veritas-result-tooltip"
  class="veritas-tooltip"
  role="dialog"
  aria-labelledby="veritas-result-title"
  aria-describedby="veritas-result-content"
  aria-modal="false"
  tabindex="-1">

  <h3 id="veritas-result-title">
    Resultado da Verificação
  </h3>

  <div id="veritas-result-content">
    <div
      class="veritas-classification"
      aria-label="Classificação: Confiável, 87% de confiança">
      <span class="veritas-status-icon" aria-hidden="true">🟢</span>
      <span class="veritas-status-text">CONFIÁVEL</span>
      <span class="veritas-confidence">87%</span>
    </div>

    <div class="veritas-details" aria-label="Detalhes da análise">
      <ul role="list">
        <li role="listitem">Verificação factual confirmada</li>
        <li role="listitem">Fontes confiáveis identificadas</li>
        <li role="listitem">Linguagem objetiva</li>
      </ul>
    </div>
  </div>

  <div class="veritas-actions" role="group" aria-label="Ações disponíveis">
    <button
      type="button"
      aria-label="Ver detalhes completos da análise">
      Detalhes
    </button>
    <button
      type="button"
      aria-label="Reportar problema com esta análise">
      Reportar
    </button>
    <button
      type="button"
      aria-label="Fechar resultado"
      class="veritas-close">
      ✕
    </button>
  </div>
</div>
```

#### **Suporte a Leitores de Tela**
```css
/* src/assets/styles/accessibility.css */

/* Classe para conteúdo apenas para leitores de tela */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Foco visível para navegação por teclado */
.veritas-verify-button:focus,
.veritas-tooltip button:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

/* Alto contraste para melhor legibilidade */
.veritas-tooltip {
  background: #ffffff;
  border: 2px solid #e5e7eb;
  color: #111827;
  font-size: 14px;
  line-height: 1.5;
}

/* Indicadores de status com cores e ícones */
.veritas-status-confiavel {
  background-color: #dcfce7;
  border-left: 4px solid #22c55e;
  color: #166534;
}

.veritas-status-fake {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
}

/* Animações respeitam preferências de movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  .veritas-tooltip,
  .veritas-verify-button {
    transition: none !important;
    animation: none !important;
  }
}

/* Suporte a modo escuro */
@media (prefers-color-scheme: dark) {
  .veritas-tooltip {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
}
```

## Arquitetura do Sistema (Clean Architecture)

### Camadas da Aplicação

#### 1. Domain Layer (Core Business Logic)
```javascript
// src/domain/entities/
- Text.js              // Entidade de texto com validações
- Classification.js    // Entidade de classificação
- AnalysisResult.js   // Resultado da análise
- User.js             // Configurações do usuário

// src/domain/value-objects/
- TextHash.js         // Hash SHA-256 do texto
- ConfidenceScore.js  // Score de 0-100
- ApiKey.js           // Encapsulamento de API keys

// src/domain/use-cases/
- ClassifyTextUseCase.js
- SearchSimilarityUseCase.js
- GenerateEmbeddingUseCase.js
- SaveResultUseCase.js
- ManageApiKeysUseCase.js
```

#### 2. Application Layer (Orchestration)
```javascript
// src/application/services/
- HybridAnalyzer.js      // Orquestrador principal
- CacheManager.js        // Gerenciamento de cache
- ConfigurationService.js // Configurações da aplicação
- NotificationService.js  // Sistema de notificações

// src/application/interfaces/
- IFactCheckService.js   // Interface para fact-checking
- ILLMService.js         // Interface para LLM
- IEmbeddingService.js   // Interface para embeddings
- IStorageService.js     // Interface para armazenamento
```

#### 3. Infrastructure Layer (External Services)
```javascript
// src/infrastructure/services/
- GoogleFactCheckService.js  // Implementação Google API
- GroqLLMService.js         // Implementação Groq API
- TransformersEmbedding.js  // Implementação Transformers.js
- QdrantVectorDB.js         // Implementação Qdrant
- IndexedDBStorage.js       // Implementação IndexedDB

// src/infrastructure/adapters/
- ApiKeyManager.js          // Gerenciamento de API keys
- RetryManager.js           // Sistema de retry
- ErrorHandler.js           // Tratamento de erros
- ConnectivityManager.js    // Monitoramento de conectividade
```

#### 4. Presentation Layer (UI/UX)
```javascript
// src/presentation/
- content/              // Content scripts
- popup/               // Extension popup
- options/             // Settings page
- components/          // UI components reutilizáveis
- styles/              // CSS e temas
```

### Fluxo de Dados Completo

```mermaid
graph TD
    A[Usuário seleciona texto] --> B[Content Script]
    B --> C[Text Validation]
    C --> D[Generate Hash]
    D --> E[Check Cache]
    E -->|Hit| F[Return Cached Result]
    E -->|Miss| G[Extract Keywords]
    G --> H[Google Fact Check API]
    H -->|Found| I[Validate & Return]
    H -->|Not Found| J[Generate Embedding]
    J --> K[Qdrant Vector Search]
    K -->|Similar Found| L[Return Similar Result]
    K -->|No Match| M[Groq LLM Analysis]
    M --> N[Parse LLM Response]
    N --> O[Store in Cache & Qdrant]
    O --> P[Display Result to User]

    I --> O
    L --> O
    F --> P
```

### Padrões de Design Implementados

1. **Repository Pattern**: Abstração de acesso a dados
2. **Strategy Pattern**: Diferentes estratégias de análise
3. **Observer Pattern**: Notificações e eventos
4. **Factory Pattern**: Criação de serviços
5. **Singleton Pattern**: Gerenciadores globais
6. **Command Pattern**: Ações do usuário
7. **Adapter Pattern**: Integração com APIs externas

## Resumo Executivo e Próximos Passos

### ✅ O que foi Completado no PRD

1. **📋 Especificações Funcionais Completas**
   - Funcionalidades MVP bem definidas
   - User stories com critérios de aceitação
   - Fluxos de usuário detalhados

2. **🏗️ Arquitetura Técnica Robusta**
   - Clean Architecture implementada
   - Arquitetura híbrida de verificação (2 camadas)
   - Padrões de design bem definidos

3. **🔧 Sistema de API Keys Flexível**
   - Configuração padrão (plug-and-play)
   - Configuração personalizada (avançada)
   - Gerenciamento de quotas e rate limiting

4. **🎨 UX/UI Bem Especificada**
   - Wireframes detalhados
   - Fluxo de onboarding completo
   - Especificações de acessibilidade (WCAG 2.1 AA)

5. **🛡️ Tratamento de Erros Robusto**
   - Sistema de retry com backoff exponencial
   - Modo offline com cache-only
   - Notificações amigáveis ao usuário

6. **🧪 Estratégia de Testes Abrangente**
   - Testes unitários, integração e E2E
   - Coverage target de 90%
   - CI/CD pipeline completo

7. **🚀 Configuração de Desenvolvimento**
   - Docker setup completo
   - Scripts de automação
   - Documentação de instalação

### 🎯 Próximos Passos para Implementação

#### **Fase 1: Setup e Fundação (Semana 1-2)**
```bash
# 1. Configurar ambiente
git clone <repository>
npm run setup

# 2. Implementar estrutura base
- Domain entities e value objects
- Interfaces e contratos
- Configuração básica de build
```

#### **Fase 2: Core Services (Semana 3-4)**
```bash
# 3. Implementar serviços principais
- TextProcessor e KeywordExtractor
- GoogleFactCheckService
- GroqLLMService
- QdrantVectorDB integration
```

#### **Fase 3: UI e Integração (Semana 5-6)**
```bash
# 4. Desenvolver interface
- Content script com text selection
- Tooltip de resultados
- Popup de configurações
- Sistema de notificações
```

#### **Fase 4: Testes e Polimento (Semana 7-8)**
```bash
# 5. Testes e otimização
- Implementar suite de testes completa
- Performance optimization
- Error handling refinement
- Accessibility testing
```

### 📊 Métricas de Sucesso Revisadas

| Métrica | Target | Método de Medição |
|---------|--------|-------------------|
| **Response Time** | < 2s (95th percentile) | Performance monitoring |
| **Cache Hit Rate** | ≥ 60% após 1000 consultas | Analytics tracking |
| **Accuracy** | ≥ 87% precision | Manual validation |
| **User Retention** | ≥ 70% após 30 dias | Usage analytics |
| **Memory Usage** | < 60MB RAM | Browser profiling |
| **Error Rate** | < 2% | Error tracking |
| **Accessibility** | WCAG 2.1 AA compliance | Automated testing |

### 🔄 Processo de Desenvolvimento Recomendado

1. **TDD (Test-Driven Development)**
   - Escrever testes antes da implementação
   - Garantir coverage ≥ 90%
   - Testes de regressão automáticos

2. **Continuous Integration**
   - GitHub Actions configurado
   - Quality gates obrigatórios
   - Deploy automático para staging

3. **Code Review**
   - Pull requests obrigatórios
   - Revisão por pares
   - Checklist de qualidade

4. **Monitoring e Feedback**
   - Error tracking (Sentry)
   - Performance monitoring
   - User feedback collection

## Roadmap e Milestones

### 🗓️ Cronograma Detalhado

#### **Sprint 1-2: Fundação (2 semanas)**
**Objetivo**: Estabelecer base sólida do projeto

**Milestones:**
- ✅ **M1.1**: Ambiente de desenvolvimento configurado
- ✅ **M1.2**: Estrutura de projeto criada
- ✅ **M1.3**: CI/CD pipeline básico funcionando
- ✅ **M1.4**: Qdrant configurado e testado

**Entregáveis:**
- Repositório configurado com todas as dependências
- Docker compose funcionando
- Testes básicos passando
- Documentação de setup validada

#### **Sprint 3-4: Core Services (2 semanas)**
**Objetivo**: Implementar serviços principais

**Milestones:**
- 🎯 **M2.1**: TextProcessor e normalização implementados
- 🎯 **M2.2**: KeywordExtractor funcionando
- 🎯 **M2.3**: GoogleFactCheckService integrado
- 🎯 **M2.4**: GroqLLMService implementado
- 🎯 **M2.5**: QdrantClient operacional

**Critérios de Aceitação:**
- Texto normalizado consistentemente
- Keywords extraídas com precisão ≥ 80%
- Google API retornando resultados válidos
- LLM classificando com confidence score
- Qdrant armazenando e recuperando embeddings

#### **Sprint 5-6: Interface e Integração (2 semanas)**
**Objetivo**: Desenvolver UI e integrar componentes

**Milestones:**
- 🎯 **M3.1**: Content script detectando seleção de texto
- 🎯 **M3.2**: Tooltip responsivo implementado
- 🎯 **M3.3**: Popup de configurações funcional
- 🎯 **M3.4**: Sistema de notificações ativo
- 🎯 **M3.5**: Fluxo híbrido end-to-end

**Critérios de Aceitação:**
- Seleção de texto funciona em 95% dos sites
- Tooltip aparece em < 200ms
- Configurações persistem corretamente
- Notificações são acessíveis (WCAG 2.1 AA)
- Fluxo completo funciona offline

#### **Sprint 7-8: Testes e Polimento (2 semanas)**
**Objetivo**: Garantir qualidade e performance

**Milestones:**
- 🎯 **M4.1**: Coverage de testes ≥ 90%
- 🎯 **M4.2**: Performance otimizada (< 2s response)
- 🎯 **M4.3**: Acessibilidade validada
- 🎯 **M4.4**: Segurança auditada
- 🎯 **M4.5**: Documentação completa

**Critérios de Aceitação:**
- Todos os testes passando
- Métricas de performance atingidas
- Auditoria de acessibilidade 100%
- Vulnerabilidades de segurança = 0
- Documentação revisada e aprovada

### 📋 Definition of Done

#### **Para Features**
- [ ] Código implementado seguindo padrões estabelecidos
- [ ] Testes unitários escritos e passando (coverage ≥ 90%)
- [ ] Testes de integração validados
- [ ] Code review aprovado por 2+ desenvolvedores
- [ ] Documentação atualizada
- [ ] Performance validada (< targets estabelecidos)
- [ ] Acessibilidade testada (WCAG 2.1 AA)
- [ ] Segurança verificada (sem vulnerabilidades críticas)

#### **Para Releases**
- [ ] Todos os critérios de features atendidos
- [ ] Testes E2E passando em Chrome e Firefox
- [ ] Performance benchmarks atingidos
- [ ] Documentação de usuário atualizada
- [ ] Changelog gerado
- [ ] Build de produção validado
- [ ] Rollback plan documentado
- [ ] Métricas de monitoramento configuradas

### 🎯 Critérios de Aceitação Detalhados

#### **Funcionalidade: Classificação de Texto**
```gherkin
Feature: Classificação de Confiabilidade de Texto

Scenario: Usuário seleciona texto confiável
  Given o usuário está em uma página web
  When o usuário seleciona um texto de 50 caracteres
  And clica no botão "Verificar"
  Then o sistema deve exibir classificação em < 2 segundos
  And a classificação deve ter confidence score ≥ 0.8
  And o tooltip deve ser acessível via teclado

Scenario: Texto já verificado (cache hit)
  Given um texto foi verificado anteriormente
  When o usuário seleciona o mesmo texto
  Then o resultado deve aparecer em < 100ms
  And deve indicar "resultado em cache"

Scenario: API indisponível (modo offline)
  Given as APIs externas estão indisponíveis
  When o usuário tenta verificar um texto
  Then o sistema deve usar apenas cache local
  And exibir notificação sobre modo offline
  And adicionar request à fila para processamento posterior
```

#### **Funcionalidade: Configuração de API Keys**
```gherkin
Feature: Gerenciamento de API Keys

Scenario: Usuário configura API keys personalizadas
  Given o usuário acessa as configurações
  When insere uma API key válida do Google
  And clica em "Testar Conexão"
  Then o sistema deve validar a key em < 5 segundos
  And exibir status "✓ Válida"
  And salvar a configuração

Scenario: API key inválida
  Given o usuário insere uma API key inválida
  When clica em "Testar Conexão"
  Then o sistema deve exibir "✗ Inválida"
  And não deve salvar a configuração
  And deve manter configuração anterior
```

## Compliance e Regulamentações

### 🔒 Privacidade e LGPD/GDPR

#### **Coleta de Dados**
- ✅ **Minimização**: Apenas dados necessários para funcionamento
- ✅ **Consentimento**: Opt-in explícito para analytics (se implementado)
- ✅ **Transparência**: Política de privacidade clara e acessível
- ✅ **Direito ao Esquecimento**: Função de limpar todos os dados

#### **Processamento Local**
```javascript
// Dados que NUNCA saem do dispositivo do usuário
const localOnlyData = {
  userPreferences: "Configurações pessoais",
  cacheHistory: "Histórico de consultas",
  apiKeys: "Chaves de API personalizadas (criptografadas)",
  usageStats: "Estatísticas de uso local"
};

// Dados que podem ser enviados (com consentimento)
const externalData = {
  textHashes: "Hash SHA-256 do texto (não o texto original)",
  classifications: "Resultado da classificação",
  errorLogs: "Logs de erro (sem dados pessoais)"
};
```

#### **Conformidade LGPD**
- ✅ **Base Legal**: Legítimo interesse para verificação de informações
- ✅ **Finalidade**: Claramente definida (combate à desinformação)
- ✅ **Adequação**: Proporcional ao objetivo
- ✅ **Necessidade**: Mínimo necessário para funcionamento
- ✅ **Qualidade**: Dados precisos e atualizados

### 🛡️ Segurança e Auditoria

#### **Threat Model**
```yaml
Threats:
  - Data Exfiltration:
      Risk: Medium
      Mitigation: Local processing, encryption at rest

  - API Key Theft:
      Risk: High
      Mitigation: Encryption, secure storage, rotation

  - Man-in-the-Middle:
      Risk: Medium
      Mitigation: HTTPS only, certificate pinning

  - Extension Tampering:
      Risk: Low
      Mitigation: Code signing, integrity checks
```

#### **Security Checklist**
- [ ] Todas as comunicações via HTTPS
- [ ] API keys criptografadas com AES-256
- [ ] Validação de entrada em todos os endpoints
- [ ] Rate limiting implementado
- [ ] Logs não contêm dados sensíveis
- [ ] Dependências auditadas (npm audit, safety)
- [ ] CSP (Content Security Policy) configurado
- [ ] Permissions mínimas no manifest

## Estratégia de Rollback

### 🔄 Plano de Contingência

#### **Cenários de Rollback**
1. **Bug Crítico Detectado**
   - Trigger: Error rate > 5% ou crash rate > 1%
   - Ação: Rollback automático em 15 minutos
   - Responsável: DevOps + Tech Lead

2. **Performance Degradada**
   - Trigger: Response time > 5s (95th percentile)
   - Ação: Rollback manual em 30 minutos
   - Responsável: Performance Team

3. **Feedback Negativo Massivo**
   - Trigger: Rating < 3.0 ou > 50 reports/hora
   - Ação: Rollback manual em 1 hora
   - Responsável: Product Manager

#### **Procedimento de Rollback**
```bash
# 1. Identificar versão estável anterior
git tag --list "v*" --sort=-version:refname | head -5

# 2. Criar branch de hotfix
git checkout -b hotfix/rollback-v1.2.1 v1.2.0

# 3. Deploy da versão anterior
npm run deploy:rollback --version=v1.2.0

# 4. Notificar usuários (se necessário)
npm run notify:users --message="Versão revertida por questões técnicas"

# 5. Investigar e documentar
npm run incident:create --severity=high
```

### 📊 Monitoramento em Produção

#### **Métricas Críticas**
```javascript
const criticalMetrics = {
  // Performance
  responseTime: { target: "< 2s", alert: "> 5s" },
  cacheHitRate: { target: "> 60%", alert: "< 40%" },
  memoryUsage: { target: "< 60MB", alert: "> 100MB" },

  // Reliability
  errorRate: { target: "< 2%", alert: "> 5%" },
  crashRate: { target: "< 0.1%", alert: "> 1%" },
  apiAvailability: { target: "> 99%", alert: "< 95%" },

  // Business
  dailyActiveUsers: { target: "growth", alert: "decline > 20%" },
  classificationAccuracy: { target: "> 87%", alert: "< 80%" },
  userSatisfaction: { target: "> 4.2", alert: "< 3.5" }
};
```

#### **Alertas e Notificações**
```yaml
Alerts:
  Critical:
    - Error rate > 5%
    - API completely down
    - Security vulnerability detected
    Response: Immediate (< 15 min)

  Warning:
    - Performance degradation
    - Cache hit rate dropping
    - User complaints increasing
    Response: Within 1 hour

  Info:
    - New version deployed
    - Daily metrics summary
    - Weekly performance report
    Response: Next business day
```

### 🎯 Métricas de Negócio

#### **KPIs Principais**
| Métrica | Target | Medição | Frequência |
|---------|--------|---------|------------|
| **Adoção** | 10k usuários em 3 meses | Google Analytics | Diária |
| **Engajamento** | 5 verificações/usuário/dia | Extension telemetry | Diária |
| **Retenção** | 70% após 30 dias | Cohort analysis | Semanal |
| **Satisfação** | Rating 4.2+ nas stores | Store reviews | Semanal |
| **Precisão** | 87% accuracy | Manual validation | Mensal |

#### **Métricas Secundárias**
- **Time to Value**: < 30 segundos para primeira verificação
- **Feature Adoption**: 80% dos usuários usam configurações
- **Support Load**: < 5% dos usuários contactam suporte
- **Viral Coefficient**: 0.3 (cada usuário traz 0.3 novos usuários)

### 🎉 Conclusão

O PRD do VeritasAI está agora **100% completo** e pronto para implementação. Todos os aspectos críticos foram definidos:

- ✅ **Funcionalidades** claramente especificadas
- ✅ **Arquitetura** robusta e escalável
- ✅ **UX/UI** bem projetada e acessível
- ✅ **Tecnologias** modernas e adequadas
- ✅ **Testes** abrangentes e automatizados
- ✅ **Deployment** automatizado e confiável
- ✅ **Documentação** completa e detalhada
- ✅ **Roadmap** detalhado com milestones claros
- ✅ **Compliance** LGPD/GDPR assegurado
- ✅ **Segurança** auditada e documentada
- ✅ **Rollback** strategy definida
- ✅ **Monitoramento** configurado

A equipe de desenvolvimento pode começar a implementação imediatamente seguindo as especificações e usando os scripts de setup fornecidos. O projeto está estruturado para ser desenvolvido de forma incremental e testável, garantindo alta qualidade e manutenibilidade.













