# CI/CD Pipeline - VeritasAI

Este documento descreve o pipeline de CI/CD implementado para o projeto VeritasAI usando GitHub Actions.

## 📋 Visão Geral

O pipeline de CI/CD do VeritasAI é composto por 5 workflows principais que automatizam todo o processo de desenvolvimento, teste, build e deploy:

1. **Tests** - Execução de testes automatizados
2. **Build** - Build da extensão para diferentes ambientes
3. **Quality Gates** - Verificações de qualidade de código
4. **Deploy** - Deploy automático para staging e produção
5. **Release** - Criação de releases automáticas
6. **Notifications** - Sistema de notificações

## 🔄 Workflows

### 1. Tests (`.github/workflows/test.yml`)

**Triggers:**
- Push para `main` e `develop`
- Pull requests para `main` e `develop`
- Execução manual

**Jobs:**
- **test**: Testes unitários e de integração
  - Matrix: Node.js 18.x e 20.x
  - Serviços: Qdrant v1.15.0
  - Coverage com Codecov
- **test-e2e**: Testes end-to-end com Playwright
- **security-scan**: Auditoria de segurança
- **quality-check**: Verificações de qualidade

**Funcionalidades:**
- ✅ Testes paralelos em múltiplas versões do Node.js
- ✅ Integração com Qdrant para testes de integração
- ✅ Coverage automático com upload para Codecov
- ✅ Comentários de coverage em PRs
- ✅ Testes E2E com Playwright
- ✅ Auditoria de segurança com npm audit
- ✅ Verificação de dependências

### 2. Build (`.github/workflows/build.yml`)

**Triggers:**
- Push para `main` e `develop`
- Pull requests para `main` e `develop`
- Execução manual

**Jobs:**
- **build**: Build para development, staging e production
- **test-build**: Validação da extensão buildada
- **security-check**: Verificação de segurança do build

**Funcionalidades:**
- ✅ Build para múltiplos ambientes
- ✅ Validação de manifest.json
- ✅ Verificação de tamanho de bundle
- ✅ Validação de estrutura da extensão
- ✅ Teste de carregamento no Chrome
- ✅ Verificação de permissões

### 3. Quality Gates (`.github/workflows/quality-gates.yml`)

**Triggers:**
- Push para `main` e `develop`
- Pull requests para `main` e `develop`
- Execução manual

**Thresholds:**
- Coverage mínimo: 80%
- Coverage unitário: 85%
- Tamanho máximo por arquivo: 5MB
- Tamanho total máximo: 50MB

**Jobs:**
- **coverage-gate**: Verificação de coverage
- **performance-gate**: Verificação de performance
- **security-gate**: Verificação de segurança
- **code-quality-gate**: Verificação de qualidade

### 4. Deploy (`.github/workflows/deploy.yml`)

**Triggers:**
- Push para `main` (produção)
- Push para `develop` (staging)
- Execução manual

**Jobs:**
- **determine-environment**: Determina ambiente de deploy
- **pre-deploy-checks**: Verificações pré-deploy
- **build-for-deploy**: Build específico para deploy
- **deploy-staging**: Deploy para staging
- **deploy-production**: Deploy para produção

**Ambientes:**
- **Staging**: `develop` branch → staging environment
- **Production**: `main` branch → production environment

### 5. Release (`.github/workflows/release.yml`)

**Triggers:**
- Tags `v*` (ex: v1.0.0)
- Execução manual com versão

**Jobs:**
- **validate-release**: Validação da versão
- **build-release**: Build de produção
- **create-github-release**: Criação do release no GitHub
- **deploy-staging**: Deploy para staging (pre-releases)
- **deploy-production**: Deploy para produção (releases)

**Funcionalidades:**
- ✅ Versionamento semântico
- ✅ Changelog automático
- ✅ Packages de release
- ✅ Deploy automático baseado no tipo de release

### 6. Notifications (`.github/workflows/notifications.yml`)

**Triggers:**
- Completion de outros workflows
- Issues e PRs
- Releases

**Funcionalidades:**
- ✅ Notificações Slack para falhas críticas
- ✅ Notificações Discord para falhas críticas
- ✅ Issues automáticas para falhas críticas
- ✅ Notificações de PR para branch main
- ✅ Notificações de release

## 🔧 Configuração

### Secrets Necessários

Configure os seguintes secrets no GitHub:

```bash
# APIs para testes
GOOGLE_FACT_CHECK_API_KEY=your_google_api_key
GROQ_API_KEY=your_groq_api_key

# Chrome Web Store (para deploy)
CHROME_EXTENSION_ID=your_extension_id
CHROME_CLIENT_ID=your_client_id
CHROME_CLIENT_SECRET=your_client_secret
CHROME_REFRESH_TOKEN=your_refresh_token

# Notificações (opcional)
SLACK_WEBHOOK_URL=your_slack_webhook
DISCORD_WEBHOOK_URL=your_discord_webhook
```

### Environments

Configure os seguintes environments no GitHub:

1. **staging**
   - Proteção: Nenhuma
   - Secrets específicos de staging

2. **production**
   - Proteção: Required reviewers
   - Secrets específicos de produção

## 📊 Quality Gates

### Coverage Requirements
- **Total Coverage**: ≥ 80%
- **Unit Test Coverage**: ≥ 85%
- **Integration Coverage**: ≥ 70%

### Performance Requirements
- **Bundle Size**: ≤ 5MB por arquivo
- **Total Size**: ≤ 50MB
- **Build Time**: ≤ 5 minutos

### Security Requirements
- **Vulnerabilities**: 0 críticas, máximo 5 altas
- **Secrets**: Nenhum hardcoded
- **Permissions**: Mínimas necessárias

## 🚀 Fluxo de Deploy

### Staging Deploy
```
develop branch → Tests → Build → Quality Gates → Deploy Staging
```

### Production Deploy
```
main branch → Tests → Build → Quality Gates → Deploy Production
```

### Release Deploy
```
Tag v* → Validate → Build → Create Release → Deploy
```

## 📈 Monitoramento

### Métricas Coletadas
- ✅ Taxa de sucesso dos builds
- ✅ Tempo médio de execução
- ✅ Coverage trends
- ✅ Deploy frequency
- ✅ Lead time for changes

### Dashboards
- GitHub Actions dashboard
- Codecov coverage reports
- Bundle analyzer reports

## 🔍 Troubleshooting

### Falhas Comuns

**1. Testes falhando**
```bash
# Executar localmente
npm run test:all

# Verificar logs específicos
npm run test:unit -- --verbose
```

**2. Build falhando**
```bash
# Build local
npm run build:production

# Verificar tamanho
npm run analyze:bundle
```

**3. Quality gates falhando**
```bash
# Verificar coverage
npm run test:coverage

# Verificar linting
npm run lint
```

### Logs e Debugging

1. **GitHub Actions**: Verificar logs detalhados nos workflows
2. **Artifacts**: Download de artifacts para análise local
3. **Notifications**: Verificar notificações automáticas

## 📝 Scripts Disponíveis

### CI/CD Específicos
```bash
npm run ci:install     # Instalação para CI
npm run ci:test        # Todos os testes
npm run ci:build       # Build de produção
npm run ci:quality     # Verificações de qualidade
```

### Build por Ambiente
```bash
npm run build:development  # Build de desenvolvimento
npm run build:staging     # Build de staging
npm run build:production  # Build de produção
```

### Análise e Qualidade
```bash
npm run analyze:bundle    # Análise de bundle
npm run format:check     # Verificar formatação
npm run type-check       # Verificação de tipos
```

## 🎯 Próximos Passos

1. **Integração com SonarQube** para análise de qualidade avançada
2. **Performance testing** automatizado
3. **Visual regression testing** com Percy
4. **Dependency scanning** com Dependabot
5. **Infrastructure as Code** com Terraform

## 📚 Recursos Adicionais

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Chrome Extension Publishing](https://developer.chrome.com/docs/webstore/publish/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Última atualização**: 2025-01-23  
**Versão do pipeline**: 1.0.0
