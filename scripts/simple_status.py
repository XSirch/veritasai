#!/usr/bin/env python3
"""
Script simples para verificar status das tarefas implementadas.
"""

import re
from pathlib import Path
from datetime import datetime


def check_task_status():
    """Verifica o status das tarefas no arquivo tasks.json."""
    tasks_file = Path(".vscode/tasks.json")
    
    if not tasks_file.exists():
        print("❌ Arquivo .vscode/tasks.json não encontrado")
        return
    
    with open(tasks_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Tarefas que implementamos
    implemented_tasks = {
        'VER-007': 'Implementar estrutura base das entidades',
        'VER-009': 'Implementar TextProcessor'
    }
    
    # Próximas tarefas disponíveis
    next_tasks = {
        'VER-010': 'Implementar KeywordExtractor',
        'VER-011': 'Implementar GoogleFactCheckService',
        'VER-012': 'Implementar GroqLLMService'
    }
    
    print("# VeritasAI - Status Atualizado")
    print(f"**Gerado em**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    print("## ✅ Tarefas Implementadas")
    print()
    
    for task_id, task_name in implemented_tasks.items():
        # Procurar pelo status da tarefa
        pattern = rf'"id": "{task_id}".*?"status": "([^"]+)"'
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            status = match.group(1)
            status_icon = "✅" if status == "completed" else "🔄" if status == "in_progress" else "⏳"
            print(f"- {status_icon} **{task_id}**: {task_name}")
            print(f"  - Status: {status}")
            
            # Verificar arquivos relacionados
            if task_id == "VER-007":
                files = [
                    "src/domain/entities/text.py",
                    "src/domain/entities/classification.py", 
                    "src/domain/entities/analysis_result.py",
                    "src/domain/entities/user.py",
                    "src/domain/value_objects/text_hash.py",
                    "src/domain/value_objects/confidence_score.py",
                    "src/domain/value_objects/api_key.py"
                ]
                existing = [f for f in files if Path(f).exists()]
                print(f"  - Arquivos: {len(existing)}/{len(files)} implementados")
                
            elif task_id == "VER-009":
                files = ["src/utils/text_processor.py"]
                existing = [f for f in files if Path(f).exists()]
                print(f"  - Arquivos: {len(existing)}/{len(files)} implementados")
            
            print()
        else:
            print(f"- ❓ **{task_id}**: {task_name} (não encontrado)")
            print()
    
    print("## 🔄 Próximas Tarefas Disponíveis")
    print()
    
    for task_id, task_name in next_tasks.items():
        pattern = rf'"id": "{task_id}".*?"status": "([^"]+)"'
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            status = match.group(1)
            
            # Verificar dependências
            deps_pattern = rf'"id": "{task_id}".*?"dependencies": \[(.*?)\]'
            deps_match = re.search(deps_pattern, content, re.DOTALL)
            
            dependencies = []
            if deps_match:
                deps_str = deps_match.group(1)
                dependencies = [dep.strip().strip('"') for dep in deps_str.split(',') if dep.strip().strip('"')]
            
            # Verificar se dependências estão satisfeitas
            deps_satisfied = True
            for dep in dependencies:
                dep_pattern = rf'"id": "{dep}".*?"status": "([^"]+)"'
                dep_match = re.search(dep_pattern, content, re.DOTALL)
                if not dep_match or dep_match.group(1) != "completed":
                    deps_satisfied = False
                    break
            
            status_icon = "🟢" if deps_satisfied else "🟡"
            availability = "Pronto para iniciar" if deps_satisfied else "Aguardando dependências"
            
            print(f"- {status_icon} **{task_id}**: {task_name}")
            print(f"  - Status: {availability}")
            if dependencies:
                deps_status = [f"{dep} ✅" if re.search(rf'"id": "{dep}".*?"status": "completed"', content, re.DOTALL) 
                              else f"{dep} ⏳" for dep in dependencies]
                print(f"  - Dependências: {', '.join(deps_status)}")
            print()
    
    print("## 🔧 Ambiente Atual")
    print()
    
    # Verificar arquivos Python implementados
    python_files = [
        "src/domain/entities/text.py",
        "src/domain/entities/classification.py", 
        "src/domain/entities/analysis_result.py",
        "src/domain/entities/user.py",
        "src/domain/value_objects/text_hash.py",
        "src/domain/value_objects/confidence_score.py",
        "src/domain/value_objects/api_key.py",
        "src/utils/text_processor.py"
    ]
    
    existing_files = [f for f in python_files if Path(f).exists()]
    print(f"### Backend Python: {len(existing_files)}/{len(python_files)} arquivos")
    for file in python_files:
        status = "✅" if Path(file).exists() else "❌"
        print(f"- {status} `{file}`")
    
    print()
    print("### Dependências")
    print(f"- {'✅' if Path('pyproject.toml').exists() else '❌'} Python environment")
    print(f"- {'✅' if Path('uv.lock').exists() else '❌'} Dependencies locked")
    print(f"- {'❌' if not Path('package.json').exists() else '✅'} Node.js environment")
    print(f"- ❌ Docker environment (pendente)")
    
    print()
    print("## 📋 Recomendação")
    print()
    print("**Próxima tarefa sugerida**: VER-010 (KeywordExtractor)")
    print("- ✅ Dependências satisfeitas (VER-009 completo)")
    print("- ✅ Pode ser implementado apenas com Python")
    print("- ✅ Não requer Node.js ou Docker")


if __name__ == "__main__":
    check_task_status()
