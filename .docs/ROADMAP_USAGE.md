# 📋 Como Usar o Roadmap de Desenvolvimento VeritasAI

## 🎯 Visão Geral

O roadmap do VeritasAI foi estruturado em **múltiplos arquivos** para máxima flexibilidade e compatibilidade:

### 📁 Arquivos do Roadmap

1. **`.vscode/tasks.json`** - Tarefas VSCode executáveis
2. **`.docs/DEVELOPMENT_ROADMAP.json`** - Roadmap estruturado com sprints e milestones
3. **`.docs/COMPLETE_TASK_LIST.json`** - Lista completa de todas as 24+ tarefas
4. **`scripts/roadmap_manager.py`** - Ferramenta de gerenciamento e relatórios

## 🚀 Como Usar no VSCode

### 1. Executar Tarefas Diretamente
```bash
# Abrir Command Palette: Ctrl+Shift+P
# Digitar: "Tasks: Run Task"
# Selecionar uma das tarefas disponíveis:

- Show Development Roadmap      # Ver roadmap completo
- Sprint 1: Setup Environment   # Executar setup inicial
- Sprint 1: Run Tests          # Executar testes
- Sprint 2: Start Qdrant       # Iniciar Qdrant
- Development: Build Extension  # Build da extensão
- Development: Watch Mode      # Modo desenvolvimento
- Quality: Run All Tests       # Todos os testes
- Quality: Coverage Report     # Relatório de coverage
- Python: Run Tests           # Testes Python
- Python: Format Code         # Formatar código Python
```

### 2. Atalhos de Teclado
- `Ctrl+Shift+P` → "Tasks: Run Task" → Selecionar tarefa
- `Ctrl+Shift+B` → Build tasks (Build Extension, Watch Mode)
- `Ctrl+Shift+T` → Test tasks (Run Tests, Coverage)

## 📊 Gerenciamento com Python

### Comandos Disponíveis
```bash
# Visão geral do projeto
python scripts/roadmap_manager.py overview

# Resumo dos sprints
python scripts/roadmap_manager.py sprints

# Detalhes dos milestones
python scripts/roadmap_manager.py milestones

# Listar todas as tarefas
python scripts/roadmap_manager.py tasks

# Tarefas de um sprint específico
python scripts/roadmap_manager.py tasks --sprint 1

# Distribuição de trabalho por equipe
python scripts/roadmap_manager.py team

# Relatório de progresso
python scripts/roadmap_manager.py progress

# Atualizar status de tarefa
python scripts/roadmap_manager.py update --task-id VER-001 --status in_progress
```

### Status Disponíveis
- `not_started` - Não iniciada
- `in_progress` - Em progresso
- `completed` - Concluída
- `blocked` - Bloqueada
- `review` - Em revisão

## 📋 Estrutura das Tarefas

### Campos Obrigatórios
```json
{
  "id": "VER-001",
  "name": "Nome descritivo da tarefa",
  "description": "Descrição detalhada",
  "sprint": 1,
  "milestone": "M1.1",
  "status": "not_started",
  "priority": "critical|high|medium|low",
  "effort_hours": 8,
  "story_points": 3,
  "dependencies": ["VER-000"],
  "assignee": "devops|frontend_dev|backend_dev|fullstack_dev|qa",
  "acceptance_criteria": ["Critério 1", "Critério 2"],
  "related_files": ["arquivo1.js", "arquivo2.py"],
  "prd_reference": "PRD seção X linhas Y-Z",
  "technical_notes": "Detalhes técnicos",
  "definition_of_done": ["DoD 1", "DoD 2"]
}
```

## 🎯 Workflow Recomendado

### Para Desenvolvedores
1. **Início do Sprint**
   ```bash
   python scripts/roadmap_manager.py tasks --sprint 1
   python scripts/roadmap_manager.py update --task-id VER-001 --status in_progress
   ```

2. **Durante Desenvolvimento**
   - Usar VSCode tasks para build/test
   - Atualizar status conforme progresso
   - Verificar dependências antes de iniciar tarefas

3. **Fim da Tarefa**
   ```bash
   python scripts/roadmap_manager.py update --task-id VER-001 --status review
   # Após code review aprovado:
   python scripts/roadmap_manager.py update --task-id VER-001 --status completed
   ```

### Para Scrum Master/PM
1. **Planejamento do Sprint**
   ```bash
   python scripts/roadmap_manager.py sprints
   python scripts/roadmap_manager.py team
   ```

2. **Acompanhamento Diário**
   ```bash
   python scripts/roadmap_manager.py progress
   ```

3. **Retrospectiva**
   ```bash
   python scripts/roadmap_manager.py progress
   # Analisar velocity e ajustar próximo sprint
   ```

## 📈 Métricas e Relatórios

### Relatório de Progresso
```bash
python scripts/roadmap_manager.py progress
```
**Output:**
```
📊 Relatório de Progresso
==================================================
📋 Total de tarefas: 24

Não iniciadas: 20 (83.3%)
Em progresso: 3 (12.5%)
Concluídas: 1 (4.2%)

📈 Progresso por Sprint:
   Sprint 1: 1/5 (20.0%)
   Sprint 2: 0/3 (0.0%)
   Sprint 3: 0/3 (0.0%)
   Sprint 4: 0/4 (0.0%)
```

### Distribuição de Trabalho
```bash
python scripts/roadmap_manager.py team
```
**Output:**
```
👥 Distribuição de Trabalho
==================================================
👤 DevOps Engineer (devops)
   📋 Tarefas: 3
   ⏱️ Horas: 30h
   📊 Story Points: 16
   🔗 IDs: VER-001, VER-002, VER-006
```

## 🔄 Integração com Ferramentas

### GitHub Projects
1. Exportar dados do roadmap
2. Importar como issues no GitHub
3. Usar labels para sprint/priority/assignee

### Jira
1. Usar campos customizados para story_points
2. Mapear status para workflow do Jira
3. Importar como épicos/stories

### Azure DevOps
1. Usar Work Items para tarefas
2. Mapear para Sprints do Azure
3. Usar campos de effort/story points

## 🛠️ Customização

### Adicionar Nova Tarefa
1. Editar `.docs/DEVELOPMENT_ROADMAP.json`
2. Adicionar nova tarefa com ID único
3. Definir dependências corretamente
4. Atualizar sprint summary se necessário

### Modificar Sprints
1. Ajustar datas em `sprints` section
2. Redistribuir tarefas se necessário
3. Atualizar milestones correspondentes

### Personalizar Relatórios
1. Modificar `scripts/roadmap_manager.py`
2. Adicionar novos comandos/relatórios
3. Customizar output format

## ✅ Checklist de Uso

### Setup Inicial
- [ ] Verificar todos os arquivos do roadmap existem
- [ ] Testar comando `python scripts/roadmap_manager.py overview`
- [ ] Configurar VSCode tasks (Ctrl+Shift+P → Tasks: Run Task)
- [ ] Definir responsáveis para cada role (devops, frontend_dev, etc.)

### Durante o Projeto
- [ ] Atualizar status das tarefas regularmente
- [ ] Gerar relatórios de progresso semanalmente
- [ ] Verificar dependências antes de iniciar tarefas
- [ ] Documentar blockers e riscos

### Finalização
- [ ] Todas as tarefas marcadas como `completed`
- [ ] Relatório final de progresso gerado
- [ ] Lessons learned documentadas
- [ ] Roadmap arquivado para referência futura

---

**📞 Suporte**: Para dúvidas sobre o roadmap, consulte o PRD completo em `.docs/PRD.md` ou abra uma issue no repositório.
