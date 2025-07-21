#!/usr/bin/env python3
"""
Script para gerar relatório de status do projeto VeritasAI.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


def load_tasks() -> List[Dict[str, Any]]:
    """Carrega as tarefas do arquivo de roadmap."""
    # Tentar carregar do roadmap JSON
    roadmap_file = Path(".docs/DEVELOPMENT_ROADMAP.json")

    if roadmap_file.exists():
        try:
            with open(roadmap_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Extrair tarefas do roadmap
            if 'tasks' in data:
                return data['tasks']
            elif isinstance(data, list):
                return data

        except json.JSONDecodeError as e:
            print(f"❌ Erro ao ler roadmap: {e}")

    # Fallback: procurar no tasks.json por tarefas inline
    tasks_file = Path(".vscode/tasks.json")

    if not tasks_file.exists():
        print("❌ Nenhum arquivo de tarefas encontrado")
        return []

    try:
        with open(tasks_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Procurar por objetos JSON que parecem tarefas VER-XXX
        ver_tasks = []
        lines = content.split('\n')

        current_task = {}
        in_task = False
        brace_count = 0

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # Detectar início de tarefa VER-XXX
            if '"id": "VER-' in line:
                current_task = {}

                # Extrair ID
                current_task['id'] = line.split('"')[3]

                # Ler as próximas linhas até encontrar o fim do objeto
                j = i + 1
                while j < len(lines) and not (lines[j].strip().startswith('}') and lines[j].count('}') >= lines[j].count('{')):
                    next_line = lines[j].strip()

                    if '"name":' in next_line:
                        current_task['name'] = next_line.split('"')[3]
                    elif '"description":' in next_line:
                        current_task['description'] = next_line.split('"')[3]
                    elif '"status":' in next_line:
                        current_task['status'] = next_line.split('"')[3]
                    elif '"sprint":' in next_line:
                        try:
                            current_task['sprint'] = int(next_line.split(':')[1].strip().rstrip(','))
                        except:
                            current_task['sprint'] = 'N/A'
                    elif '"milestone":' in next_line:
                        current_task['milestone'] = next_line.split('"')[3]
                    elif '"priority":' in next_line:
                        current_task['priority'] = next_line.split('"')[3]
                    elif '"effort_hours":' in next_line:
                        try:
                            current_task['effort_hours'] = int(next_line.split(':')[1].strip().rstrip(','))
                        except:
                            current_task['effort_hours'] = 'N/A'
                    elif '"dependencies":' in next_line:
                        # Extrair dependências (formato simples)
                        deps_str = next_line.split('[')[1].split(']')[0] if '[' in next_line and ']' in next_line else ''
                        deps = [dep.strip().strip('"') for dep in deps_str.split(',') if dep.strip().strip('"')]
                        current_task['dependencies'] = deps

                    j += 1

                # Adicionar tarefa se tiver ID
                if current_task.get('id'):
                    if 'dependencies' not in current_task:
                        current_task['dependencies'] = []
                    ver_tasks.append(current_task)

                i = j
            else:
                i += 1

        return ver_tasks

    except Exception as e:
        print(f"❌ Erro ao processar tasks.json: {e}")
        return []


def analyze_tasks(tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analisa as tarefas e gera estatísticas."""
    if not tasks:
        return {
            'total': 0,
            'completed': 0,
            'in_progress': 0,
            'not_started': 0,
            'blocked': 0,
            'completion_rate': 0.0
        }
    
    total = len(tasks)
    completed = sum(1 for task in tasks if task.get('status') == 'completed')
    in_progress = sum(1 for task in tasks if task.get('status') == 'in_progress')
    not_started = sum(1 for task in tasks if task.get('status') == 'not_started')
    blocked = sum(1 for task in tasks if task.get('status') == 'blocked')
    
    completion_rate = (completed / total * 100) if total > 0 else 0.0
    
    return {
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
        'not_started': not_started,
        'blocked': blocked,
        'completion_rate': completion_rate
    }


def check_file_exists(filepath: str) -> bool:
    """Verifica se um arquivo existe."""
    return Path(filepath).exists()


def generate_report(tasks: List[Dict[str, Any]]) -> str:
    """Gera o relatório de status em formato Markdown."""
    stats = analyze_tasks(tasks)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report = f"""# VeritasAI - Relatório de Status

**Gerado em**: {now}  
**Total de tarefas**: {stats['total']}  
**Taxa de conclusão**: {stats['completion_rate']:.1f}%

## 📊 Resumo Estatístico

- ✅ **Concluídas**: {stats['completed']} tarefas
- 🔄 **Em progresso**: {stats['in_progress']} tarefas  
- ⏳ **Não iniciadas**: {stats['not_started']} tarefas
- ⏸️ **Bloqueadas**: {stats['blocked']} tarefas

## 📋 Detalhamento por Tarefa

"""
    
    # Agrupar tarefas por status
    completed_tasks = [t for t in tasks if t.get('status') == 'completed']
    in_progress_tasks = [t for t in tasks if t.get('status') == 'in_progress']
    not_started_tasks = [t for t in tasks if t.get('status') == 'not_started']
    blocked_tasks = [t for t in tasks if t.get('status') == 'blocked']
    
    # Tarefas concluídas
    if completed_tasks:
        report += "### ✅ Tarefas Concluídas\n\n"
        for task in completed_tasks:
            task_id = task.get('id', 'N/A')
            name = task.get('name', 'N/A')
            sprint = task.get('sprint', 'N/A')
            milestone = task.get('milestone', 'N/A')
            
            report += f"- **{task_id}**: {name}\n"
            report += f"  - Sprint: {sprint} | Milestone: {milestone}\n"
            
            # Verificar arquivos relacionados
            related_files = task.get('related_files', [])
            if related_files:
                existing_files = [f for f in related_files if check_file_exists(f)]
                if existing_files:
                    report += f"  - ✅ Arquivos: {', '.join(existing_files)}\n"
                else:
                    report += f"  - ⚠️ Arquivos não encontrados: {', '.join(related_files)}\n"
            
            report += "\n"
    
    # Tarefas em progresso
    if in_progress_tasks:
        report += "### 🔄 Tarefas em Progresso\n\n"
        for task in in_progress_tasks:
            task_id = task.get('id', 'N/A')
            name = task.get('name', 'N/A')
            priority = task.get('priority', 'N/A')
            
            report += f"- **{task_id}**: {name} (Prioridade: {priority})\n"
    
    # Próximas tarefas (não iniciadas com dependências satisfeitas)
    if not_started_tasks:
        report += "### ⏳ Próximas Tarefas Disponíveis\n\n"
        
        # Verificar quais tarefas têm dependências satisfeitas
        completed_ids = {t.get('id') for t in completed_tasks}
        
        for task in not_started_tasks:
            task_id = task.get('id', 'N/A')
            name = task.get('name', 'N/A')
            dependencies = task.get('dependencies', [])
            priority = task.get('priority', 'N/A')
            effort_hours = task.get('effort_hours', 'N/A')
            
            # Verificar se dependências estão satisfeitas
            deps_satisfied = all(dep in completed_ids for dep in dependencies)
            
            if deps_satisfied:
                report += f"- **{task_id}**: {name}\n"
                report += f"  - ✅ Pronto para iniciar (Prioridade: {priority})\n"
                report += f"  - Estimativa: {effort_hours}h\n"
                if dependencies:
                    report += f"  - Dependências: {', '.join(dependencies)} ✅\n"
                report += "\n"
    
    # Tarefas bloqueadas
    blocked_or_waiting = [t for t in not_started_tasks 
                         if not all(dep in {task.get('id') for task in completed_tasks} 
                                   for dep in t.get('dependencies', []))]
    
    if blocked_or_waiting:
        report += "### ⏸️ Tarefas Bloqueadas/Aguardando\n\n"
        
        for task in blocked_or_waiting:
            task_id = task.get('id', 'N/A')
            name = task.get('name', 'N/A')
            dependencies = task.get('dependencies', [])
            
            report += f"- **{task_id}**: {name}\n"
            if dependencies:
                completed_ids = {t.get('id') for t in completed_tasks}
                pending_deps = [dep for dep in dependencies if dep not in completed_ids]
                if pending_deps:
                    report += f"  - ⏳ Aguardando: {', '.join(pending_deps)}\n"
            report += "\n"
    
    # Verificação de ambiente
    report += "## 🔧 Status do Ambiente\n\n"
    
    # Verificar arquivos Python
    python_files = [
        "src/domain/entities/text.py",
        "src/domain/entities/classification.py", 
        "src/domain/entities/analysis_result.py",
        "src/domain/entities/user.py",
        "src/utils/text_processor.py"
    ]
    
    report += "### Backend Python\n"
    for file in python_files:
        status = "✅" if check_file_exists(file) else "❌"
        report += f"- {status} `{file}`\n"
    
    # Verificar dependências
    report += "\n### Dependências\n"
    pyproject_exists = check_file_exists("pyproject.toml")
    uv_lock_exists = check_file_exists("uv.lock")
    
    report += f"- {'✅' if pyproject_exists else '❌'} Python environment (pyproject.toml)\n"
    report += f"- {'✅' if uv_lock_exists else '❌'} Dependencies locked (uv.lock)\n"
    report += f"- {'❌' if not check_file_exists('package.json') else '✅'} Node.js environment (package.json)\n"
    report += f"- {'❌'} Docker environment (pendente)\n"
    
    return report


def main():
    """Função principal."""
    print("🔍 Gerando relatório de status do VeritasAI...")
    
    # Carregar tarefas
    tasks = load_tasks()
    
    if not tasks:
        print("❌ Nenhuma tarefa encontrada")
        return
    
    print(f"📋 Encontradas {len(tasks)} tarefas")
    
    # Gerar relatório
    report = generate_report(tasks)
    
    # Salvar relatório
    output_file = Path("STATUS_REPORT.md")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"✅ Relatório salvo em: {output_file}")
    
    # Mostrar resumo no console
    stats = analyze_tasks(tasks)
    print(f"\n📊 Resumo:")
    print(f"   Total: {stats['total']} tarefas")
    print(f"   Concluídas: {stats['completed']} ({stats['completion_rate']:.1f}%)")
    print(f"   Em progresso: {stats['in_progress']}")
    print(f"   Não iniciadas: {stats['not_started']}")


if __name__ == "__main__":
    main()
