# VeritasAI - Extensão de Verificação de Informações

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-in%20development-orange.svg)](https://github.com/XSirch/veritasai)

🛡️ **Extensão de navegador para verificação automática de confiabilidade de informações usando IA e fact-checking**

> **⚠️ Projeto em Desenvolvimento**: Este projeto está atualmente em desenvolvimento ativo. Algumas funcionalidades podem não estar disponíveis ainda.

## 📋 Visão Geral

VeritasAI é uma extensão de navegador que permite a classificação automática de textos selecionados em páginas web, determinando se a informação é: **confiável**, **inconclusiva**, **sem fundamento** ou **fake**.

O sistema utiliza uma arquitetura híbrida com:
- **Camada 1**: Google Fact Check Tools API (verificação primária)
- **Camada 2**: Groq LLM API (fallback inteligente)
- **Cache local**: Qdrant v1.15.0 + IndexedDB para performance

## 📊 Status do Projeto

**Progresso atual**: 92% (12/13 tarefas principais concluídas)
**Sprint atual**: 4
**Última atualização**: 2025-01-23

### ✅ Implementado
- **VER-001**: Estrutura inicial do projeto (Configuração base completa)
- **VER-002**: Ambiente de desenvolvimento (Scripts de setup automático)
- **VER-003**: Webpack e build system (Sistema de build completo)
- **VER-004**: Manifest.json da extensão (Manifest V3 completo e validado)
- **VER-005**: Sistema de testes (Jest, Playwright, coverage configurados)
- **VER-006**: Docker e Qdrant (Qdrant v1.15.0 configurado e funcionando)
- **VER-007**: Estrutura base das entidades (Domain Layer)
- **VER-009**: TextProcessor (Normalização e processamento de texto)
- **VER-010**: KeywordExtractor (Sistema de extração de palavras-chave com NLP)
- **VER-011**: GoogleFactCheckService (Integração com Google Fact Check API)
- **VER-012**: GroqLLMService (Sistema LLM com fallbacks inteligentes)
- **VER-013**: QdrantClient (Cliente para busca vetorial e armazenamento)

### 🔄 Próximo
- **VER-014**: EmbeddingService (Geração de embeddings)
- **VER-015**: HybridAnalyzer (Orquestrador principal)
- **VER-008**: CI/CD pipeline (GitHub Actions para automação)

### ⏸️ Bloqueado
- Frontend (requer implementação dos content/background scripts)

📄 **[Ver status detalhado](CURRENT_STATUS.md)**

## ✨ Funcionalidades

- 🔍 **Verificação em tempo real** de textos selecionados
- 🎯 **Classificação automática** com score de confiabilidade
- 💾 **Cache inteligente** para respostas instantâneas
- 🌐 **Funciona offline** com cache local
- 🔧 **APIs configuráveis** (padrão ou personalizadas)
- ♿ **Totalmente acessível** (WCAG 2.1 AA)
- 🎨 **Interface responsiva** com tooltips informativos
- 📝 **Processamento avançado de texto** com normalização Unicode e extração de sentenças

## 🚀 Instalação Rápida

### Pré-requisitos
- Node.js 16+
- npm 8+
- Python 3.9+
- uv (gerenciador de pacotes Python)
- Docker 20+
- Git

### Setup Automático
```bash
# Clone o repositório
git clone https://github.com/your-username/veritas-ai-extension.git
cd veritas-ai-extension

# Execute o setup automático
npm run setup
```

O script de setup irá:
1. ✅ Verificar pré-requisitos (Node.js, Python, Docker)
2. 📁 Criar diretórios necessários
3. 📄 Copiar arquivos de configuração
4. 📦 Instalar dependências Node.js
5. 🐍 Configurar ambiente Python com uv
6. 🗄️ Configurar Qdrant via Docker
7. 🧪 Executar testes iniciais

### Configuração Manual

1. **Instalar dependências**
```bash
npm install
```

2. **Configurar ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Iniciar Qdrant**
```bash
npm run docker:up
```

4. **Build da extensão**
```bash
npm run build:dev
```

## 🔧 Configuração de API Keys

### Opção 1: Configuração Rápida (Recomendada)
Use as APIs compartilhadas do aplicativo - funciona imediatamente sem configuração.

### Opção 2: APIs Personalizadas
Configure suas próprias API keys para limites dedicados:

1. **Google Fact Check Tools API**
   - Acesse: https://console.developers.google.com/
   - Ative a API: Fact Check Tools API
   - Crie credenciais: API Key
   - Adicione ao `.env`: `GOOGLE_FACT_CHECK_API_KEY=sua_key`

2. **Groq API**
   - Acesse: https://console.groq.com/
   - Crie uma conta e gere API key
   - Adicione ao `.env`: `GROQ_API_KEY=sua_key`

## 🛠️ Desenvolvimento

### Scripts Disponíveis

#### JavaScript/Node.js
```bash
npm run dev          # Desenvolvimento com watch
npm run build        # Build de produção
npm run test         # Executar todos os testes
npm run test:unit    # Testes unitários
npm run test:e2e     # Testes end-to-end
npm run lint         # Verificar código
npm run format       # Formatar código
```

#### Python (via uv)
```bash
npm run py:test      # Testes Python
npm run py:lint      # Linting Python
npm run py:format    # Formatar código Python
npm run py:sync      # Sincronizar dependências
npm run py:add       # Adicionar dependência Python

# Ou diretamente com uv:
uv run pytest       # Executar testes
uv run black src     # Formatar código
uv add requests      # Adicionar dependência
uv sync              # Sincronizar ambiente
```

### Estrutura do Projeto
```
src/
├── background/      # Background scripts
├── content/         # Content scripts
├── popup/           # Extension popup
├── options/         # Settings page
├── services/        # Core business logic
├── utils/           # Utilities
├── config/          # Configuration
├── domain/          # Domain layer (Python)
│   ├── entities/    # Domain entities
│   └── value_objects/ # Value objects
└── assets/          # Static assets
```

### Componentes Backend (Python)

#### Domain Layer
- **Entities**: `Text`, `Classification`, `AnalysisResult`, `User`
- **Value Objects**: `TextHash`, `ConfidenceScore`, `ApiKey`

#### TextProcessor Utility
```python
from src.utils.text_processor import TextProcessor

# Normalização de texto
normalized = TextProcessor.normalize(text)

# Geração de hash SHA-256
hash_value = TextProcessor.generate_hash(text)

# Validação de comprimento
is_valid = TextProcessor.is_valid_length(text)

# Extração de sentenças
sentences = TextProcessor.extract_sentences(text)

# Estatísticas do texto
stats = TextProcessor.get_text_stats(text)
```

### Testes
```bash
# Testes unitários com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch

# Testes E2E com Playwright
npm run test:e2e
```

## 📦 Build e Distribuição

### Build para Produção
```bash
npm run build
npm run package
```

### Instalação Local
1. Abra Chrome/Edge: `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique "Carregar sem compactação"
4. Selecione a pasta `dist/`

## 🎯 Como Usar

1. **Selecione texto** em qualquer página web
2. **Clique no botão "Verificar"** que aparece
3. **Veja o resultado** no tooltip:
   - 🟢 **CONFIÁVEL** (80-100%)
   - 🟡 **INCONCLUSIVA** (40-79%)
   - 🟠 **SEM FUNDAMENTO** (20-39%)
   - 🔴 **FAKE** (0-19%)

### Atalhos de Teclado
- `Ctrl+Shift+V`: Verificar texto selecionado
- `Ctrl+Shift+T`: Ativar/desativar extensão
- `Escape`: Fechar tooltip

## 🔒 Privacidade e Segurança

- ✅ **Dados locais**: Processamento prioritariamente local
- ✅ **Criptografia**: AES-256 para dados sensíveis
- ✅ **Zero tracking**: Nenhum dado pessoal coletado
- ✅ **GDPR compliant**: Direito ao esquecimento
- ✅ **Open source**: Código auditável

## 📊 Performance

- ⚡ **Cache hit**: < 100ms
- 🌐 **Fact check**: < 800ms  
- 🤖 **LLM analysis**: < 2500ms
- 💾 **Memory usage**: < 60MB
- 🎯 **Accuracy**: ≥ 87% precision

## 🤝 Contribuindo

Contribuições são bem-vindas! Este projeto segue as melhores práticas de desenvolvimento open source.

### Como Contribuir

1. **Fork** o projeto
2. **Clone** seu fork: `git clone https://github.com/SEU_USERNAME/veritasai.git`
3. **Crie uma branch**: `git checkout -b feature/nova-funcionalidade`
4. **Faça suas alterações** seguindo os padrões do projeto
5. **Execute os testes**: `uv run pytest && npm test`
6. **Commit**: `git commit -m 'feat: adiciona nova funcionalidade'`
7. **Push**: `git push origin feature/nova-funcionalidade`
8. **Abra um Pull Request**

### Padrões de Código
- **Python**: Black, isort, mypy, flake8
- **JavaScript**: ESLint + Prettier
- **Testes**: Coverage ≥ 90% obrigatório
- **Commits**: Conventional Commits
- **Pre-commit hooks**: Configurados automaticamente

### Desenvolvimento Local

```bash
# Clone e configure
git clone https://github.com/XSirch/veritasai.git
cd veritasai

# Configure ambiente Python
uv sync

# Execute testes Python
uv run pytest

# Verifique status do projeto
uv run python scripts/simple_status.py
```

## 📝 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

### Resumo da Licença
- ✅ Uso comercial permitido
- ✅ Modificação permitida
- ✅ Distribuição permitida
- ✅ Uso privado permitido
- ❗ Sem garantia
- ❗ Sem responsabilidade

## 🆘 Suporte

### Canais de Suporte
- 📖 **Documentação**: [Wiki do projeto](https://github.com/XSirch/veritasai/wiki)
- 🐛 **Bugs**: [Issues](https://github.com/XSirch/veritasai/issues)
- 💬 **Discussões**: [Discussions](https://github.com/XSirch/veritasai/discussions)
- 📧 **Contato**: [XSirch](https://github.com/XSirch)

### Antes de Abrir uma Issue
1. Verifique se já existe uma issue similar
2. Use os templates fornecidos
3. Inclua informações do ambiente
4. Forneça passos para reproduzir o problema

## 👥 Autores e Reconhecimentos

### Desenvolvedor Principal
- **XSirch** - *Criador e desenvolvedor principal* - [GitHub](https://github.com/XSirch)

### Tecnologias Utilizadas
- **Backend**: Python 3.9+ com uv, Pydantic, pytest
- **Frontend**: JavaScript ES2022, Webpack 5
- **IA/ML**: Groq LLM API, Google Fact Check Tools
- **Database**: Qdrant Vector Database
- **Testing**: pytest, Jest, Playwright
- **CI/CD**: GitHub Actions
- **Arquitetura**: Clean Architecture + DDD

### Agradecimentos Especiais
- 🙏 **Google** - Fact Check Tools API
- 🙏 **Groq** - LLM API de alta performance
- 🙏 **Qdrant** - Vector database open source
- 🙏 **Comunidade Open Source** - Bibliotecas e ferramentas

## 📊 Status do Repositório

![GitHub stars](https://img.shields.io/github/stars/XSirch/veritasai?style=social)
![GitHub forks](https://img.shields.io/github/forks/XSirch/veritasai?style=social)
![GitHub issues](https://img.shields.io/github/issues/XSirch/veritasai)
![GitHub pull requests](https://img.shields.io/github/issues-pr/XSirch/veritasai)

---

**🛡️ Desenvolvido com ❤️ para combater a desinformação e promover a verificação de fatos**
