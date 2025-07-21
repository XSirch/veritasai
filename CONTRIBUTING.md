# Guia de Contribuição - VeritasAI

Obrigado por considerar contribuir para o VeritasAI! Este documento fornece diretrizes para contribuições.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Funcionalidades](#sugerindo-funcionalidades)

## 🤝 Código de Conduta

Este projeto adere ao [Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você deve seguir este código.

## 🚀 Como Contribuir

### Tipos de Contribuição

- 🐛 **Correção de bugs**
- ✨ **Novas funcionalidades**
- 📚 **Documentação**
- 🧪 **Testes**
- 🎨 **Melhorias de UI/UX**
- ⚡ **Otimizações de performance**

### Processo Geral

1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie uma branch** para sua contribuição
4. **Faça suas alterações**
5. **Execute os testes**
6. **Commit** suas mudanças
7. **Push** para seu fork
8. **Abra um Pull Request**

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Python 3.9+
- uv (gerenciador de pacotes Python)
- Git
- Node.js 16+ (opcional, para frontend)
- Docker (opcional, para Qdrant)

### Setup Inicial

```bash
# Clone seu fork
git clone https://github.com/SEU_USERNAME/veritasai.git
cd veritasai

# Configure o ambiente Python
uv sync

# Execute os testes para verificar
uv run pytest

# Verifique o status do projeto
uv run python scripts/simple_status.py
```

### Estrutura do Projeto

```
src/
├── domain/          # Domain layer (entidades, value objects)
├── utils/           # Utilitários (TextProcessor, etc.)
├── services/        # Serviços (APIs, cache, etc.)
└── ...

tests/
├── unit/            # Testes unitários
├── integration/     # Testes de integração
└── ...

scripts/             # Scripts de automação
docs/               # Documentação
```

## 📝 Padrões de Código

### Python

- **Formatação**: Black (line length: 88)
- **Import sorting**: isort
- **Type checking**: mypy
- **Linting**: flake8
- **Testing**: pytest
- **Coverage**: ≥ 90%

```bash
# Formatar código
uv run black src tests

# Organizar imports
uv run isort src tests

# Verificar tipos
uv run mypy src

# Linting
uv run flake8 src tests

# Executar testes
uv run pytest --cov=src --cov-report=term-missing
```

### Convenções de Nomenclatura

- **Classes**: PascalCase (`TextProcessor`, `AnalysisResult`)
- **Funções/métodos**: snake_case (`normalize_text`, `extract_keywords`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_TEXT_LENGTH`)
- **Arquivos**: snake_case (`text_processor.py`)

### Documentação

- **Docstrings**: Google style
- **Type hints**: Obrigatórios
- **Comentários**: Em português, explicando o "porquê"

```python
def normalize_text(text: str, for_hashing: bool = False) -> str:
    """
    Normaliza texto para processamento consistente.
    
    Args:
        text: Texto a ser normalizado
        for_hashing: Se True, aplica normalização adicional para hash
        
    Returns:
        Texto normalizado
        
    Raises:
        ValueError: Se o texto for vazio ou None
    """
```

## 🔄 Processo de Pull Request

### Antes de Submeter

1. ✅ Todos os testes passando
2. ✅ Coverage ≥ 90%
3. ✅ Código formatado (black, isort)
4. ✅ Sem erros de linting
5. ✅ Type checking limpo
6. ✅ Documentação atualizada

### Template de PR

```markdown
## Descrição
Breve descrição das mudanças.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Como Testar
Passos para testar as mudanças.

## Checklist
- [ ] Testes passando
- [ ] Coverage ≥ 90%
- [ ] Código formatado
- [ ] Documentação atualizada
```

### Revisão

- PRs são revisados por mantenedores
- Feedback será fornecido via comentários
- Mudanças podem ser solicitadas
- Aprovação necessária antes do merge

## 🐛 Reportando Bugs

### Antes de Reportar

1. Verifique se já existe uma issue similar
2. Teste na versão mais recente
3. Colete informações do ambiente

### Template de Bug Report

```markdown
**Descrição do Bug**
Descrição clara e concisa do bug.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente:**
- OS: [e.g. Windows 10]
- Python: [e.g. 3.9.7]
- Versão: [e.g. 1.0.0]

**Contexto Adicional**
Qualquer outra informação relevante.
```

## ✨ Sugerindo Funcionalidades

### Template de Feature Request

```markdown
**Problema Relacionado**
Descrição do problema que esta funcionalidade resolveria.

**Solução Proposta**
Descrição clara da solução desejada.

**Alternativas Consideradas**
Outras soluções que você considerou.

**Contexto Adicional**
Qualquer outra informação relevante.
```

## 🏷️ Convenções de Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

### Exemplos

```
feat(text-processor): adiciona extração de sentenças

fix(domain): corrige validação de confidence score

docs(readme): atualiza instruções de instalação

test(utils): adiciona testes para TextProcessor
```

## 🎯 Áreas Prioritárias

### Backend Python (Pronto para Contribuição)
- ✅ VER-010: KeywordExtractor
- ✅ VER-011: GoogleFactCheckService
- ✅ VER-012: GroqLLMService

### Frontend (Requer Node.js)
- ⏳ Content scripts
- ⏳ Popup interface
- ⏳ Options page

### Infraestrutura (Requer Docker)
- ⏳ Qdrant integration
- ⏳ Vector search
- ⏳ Cache service

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/XSirch/veritasai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/XSirch/veritasai/discussions)
- **Contato**: [XSirch](https://github.com/XSirch)

---

**Obrigado por contribuir para o VeritasAI! 🛡️**
