#!/usr/bin/env python3
"""
Script para atualizar o status de uma tarefa no arquivo tasks.json.
"""

import json
import re
import sys
from pathlib import Path


def update_task_status(task_id: str, new_status: str):
    """Atualiza o status de uma tarefa no arquivo tasks.json."""
    tasks_file = Path(".vscode/tasks.json")
    
    if not tasks_file.exists():
        print(f"❌ Arquivo {tasks_file} não encontrado")
        return False
    
    # Ler o arquivo
    with open(tasks_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Procurar pela tarefa e atualizar o status
    pattern = rf'("id": "{task_id}".*?"status": ")([^"]+)(")'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print(f"❌ Tarefa {task_id} não encontrada")
        return False
    
    old_status = match.group(2)
    new_content = re.sub(pattern, rf'\g<1>{new_status}\g<3>', content, flags=re.DOTALL)
    
    # Salvar o arquivo atualizado
    with open(tasks_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Tarefa {task_id} atualizada: {old_status} → {new_status}")
    return True


def main():
    """Função principal."""
    if len(sys.argv) != 3:
        print("Uso: python update_status.py <TASK_ID> <STATUS>")
        print("Exemplo: python update_status.py VER-010 completed")
        print("Status válidos: not_started, in_progress, completed, blocked")
        return
    
    task_id = sys.argv[1]
    new_status = sys.argv[2]
    
    valid_statuses = ["not_started", "in_progress", "completed", "blocked"]
    if new_status not in valid_statuses:
        print(f"❌ Status inválido: {new_status}")
        print(f"Status válidos: {', '.join(valid_statuses)}")
        return
    
    if update_task_status(task_id, new_status):
        print("\n🔄 Gerando relatório de status atualizado...")
        
        # Executar o script de status
        import subprocess
        try:
            result = subprocess.run([
                sys.executable, "scripts/simple_status.py"
            ], capture_output=True, text=True, encoding='utf-8')
            
            if result.returncode == 0:
                # Salvar o output em CURRENT_STATUS.md
                with open("CURRENT_STATUS.md", 'w', encoding='utf-8') as f:
                    f.write(result.stdout)
                print("✅ Status atualizado em CURRENT_STATUS.md")
            else:
                print(f"⚠️ Erro ao gerar relatório: {result.stderr}")
                
        except Exception as e:
            print(f"⚠️ Erro ao executar script de status: {e}")


if __name__ == "__main__":
    main()
