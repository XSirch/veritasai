#!/usr/bin/env python3
"""
VeritasAI Roadmap Manager
Ferramenta para gerenciar e reportar o progresso do desenvolvimento
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
import argparse


class RoadmapManager:
    """Gerenciador do roadmap de desenvolvimento do VeritasAI."""
    
    def __init__(self, roadmap_path: str = ".docs/DEVELOPMENT_ROADMAP.json"):
        self.roadmap_path = Path(roadmap_path)
        self.roadmap_data = self.load_roadmap()
    
    def load_roadmap(self) -> Dict[str, Any]:
        """Carrega dados do roadmap."""
        try:
            with open(self.roadmap_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"❌ Arquivo {self.roadmap_path} não encontrado")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Erro ao parsear JSON: {e}")
            sys.exit(1)
    
    def save_roadmap(self):
        """Salva alterações no roadmap."""
        with open(self.roadmap_path, 'w', encoding='utf-8') as f:
            json.dump(self.roadmap_data, f, indent=2, ensure_ascii=False)
    
    def show_project_overview(self):
        """Exibe visão geral do projeto."""
        project = self.roadmap_data['project']
        print("🚀 VeritasAI - Visão Geral do Projeto")
        print("=" * 50)
        print(f"📋 Nome: {project['name']}")
        print(f"📅 Duração: {project['duration_weeks']} semanas")
        print(f"🏃 Sprints: {project['total_sprints']}")
        print(f"⏱️ Horas estimadas: {project['estimated_hours']}h")
        print(f"👥 Tamanho da equipe: {project['team_size']}")
        print(f"📆 Início: {project['start_date']}")
        print(f"🏁 Fim: {project['end_date']}")
        print()
    
    def show_sprint_summary(self):
        """Exibe resumo dos sprints."""
        print("📊 Resumo dos Sprints")
        print("=" * 50)
        
        for sprint_id, sprint in self.roadmap_data['sprints'].items():
            print(f"🔄 {sprint['name']} ({sprint['weeks']})")
            print(f"   📅 {sprint['dates']}")
            print(f"   🎯 {sprint['focus']}")
            print(f"   📍 Milestones: {', '.join(sprint['milestones'])}")
            print(f"   ⏱️ {sprint['estimated_hours']}h")
            print()
    
    def show_milestones(self):
        """Exibe detalhes dos milestones."""
        print("🎯 Milestones do Projeto")
        print("=" * 50)
        
        for milestone_id, milestone in self.roadmap_data['milestones'].items():
            print(f"📍 {milestone_id}: {milestone['name']}")
            print(f"   Sprint: {milestone['sprint']}")
            print(f"   📝 {milestone['description']}")
            print("   ✅ Critérios:")
            for criteria in milestone['criteria']:
                print(f"      • {criteria}")
            print()
    
    def show_tasks_by_sprint(self, sprint_num: int = None):
        """Exibe tarefas por sprint."""
        if sprint_num:
            tasks = [t for t in self.roadmap_data['tasks'] if t['sprint'] == sprint_num]
            print(f"📋 Tarefas do Sprint {sprint_num}")
        else:
            tasks = self.roadmap_data['tasks']
            print("📋 Todas as Tarefas")
        
        print("=" * 50)
        
        for task in tasks:
            status_icon = {
                'not_started': '⭕',
                'in_progress': '🔄',
                'completed': '✅',
                'blocked': '🚫',
                'review': '👀'
            }.get(task['status'], '❓')
            
            priority_icon = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🟢'
            }.get(task['priority'], '⚪')
            
            print(f"{status_icon} {task['id']}: {task['name']}")
            print(f"   {priority_icon} Prioridade: {task['priority']} | "
                  f"⏱️ {task['effort_hours']}h | "
                  f"📊 {task['story_points']} pts | "
                  f"👤 {task['assignee']}")
            print(f"   📍 Milestone: {task['milestone']}")
            
            if task['dependencies']:
                print(f"   🔗 Dependências: {', '.join(task['dependencies'])}")
            
            print()
    
    def show_team_workload(self):
        """Exibe distribuição de trabalho por membro da equipe."""
        print("👥 Distribuição de Trabalho")
        print("=" * 50)
        
        workload = {}
        for task in self.roadmap_data['tasks']:
            assignee = task['assignee']
            if assignee not in workload:
                workload[assignee] = {
                    'tasks': 0,
                    'hours': 0,
                    'story_points': 0,
                    'task_list': []
                }
            
            workload[assignee]['tasks'] += 1
            workload[assignee]['hours'] += task['effort_hours']
            workload[assignee]['story_points'] += task['story_points']
            workload[assignee]['task_list'].append(task['id'])
        
        for assignee, data in workload.items():
            role_info = self.roadmap_data.get('team_roles', {}).get(assignee, {})
            role_name = role_info.get('name', assignee)
            
            print(f"👤 {role_name} ({assignee})")
            print(f"   📋 Tarefas: {data['tasks']}")
            print(f"   ⏱️ Horas: {data['hours']}h")
            print(f"   📊 Story Points: {data['story_points']}")
            print(f"   🔗 IDs: {', '.join(data['task_list'])}")
            print()
    
    def update_task_status(self, task_id: str, new_status: str):
        """Atualiza status de uma tarefa."""
        valid_statuses = ['not_started', 'in_progress', 'completed', 'blocked', 'review']
        
        if new_status not in valid_statuses:
            print(f"❌ Status inválido. Use: {', '.join(valid_statuses)}")
            return
        
        for task in self.roadmap_data['tasks']:
            if task['id'] == task_id:
                old_status = task['status']
                task['status'] = new_status
                self.save_roadmap()
                print(f"✅ Tarefa {task_id} atualizada: {old_status} → {new_status}")
                return
        
        print(f"❌ Tarefa {task_id} não encontrada")
    
    def generate_progress_report(self):
        """Gera relatório de progresso."""
        print("📊 Relatório de Progresso")
        print("=" * 50)
        
        total_tasks = len(self.roadmap_data['tasks'])
        status_count = {}
        
        for task in self.roadmap_data['tasks']:
            status = task['status']
            status_count[status] = status_count.get(status, 0) + 1
        
        print(f"📋 Total de tarefas: {total_tasks}")
        print()
        
        for status, count in status_count.items():
            percentage = (count / total_tasks) * 100
            status_name = {
                'not_started': 'Não iniciadas',
                'in_progress': 'Em progresso',
                'completed': 'Concluídas',
                'blocked': 'Bloqueadas',
                'review': 'Em revisão'
            }.get(status, status)
            
            print(f"{status_name}: {count} ({percentage:.1f}%)")
        
        print()
        
        # Progresso por sprint
        sprint_progress = {}
        for task in self.roadmap_data['tasks']:
            sprint = task['sprint']
            if sprint not in sprint_progress:
                sprint_progress[sprint] = {'total': 0, 'completed': 0}
            
            sprint_progress[sprint]['total'] += 1
            if task['status'] == 'completed':
                sprint_progress[sprint]['completed'] += 1
        
        print("📈 Progresso por Sprint:")
        for sprint in sorted(sprint_progress.keys()):
            data = sprint_progress[sprint]
            percentage = (data['completed'] / data['total']) * 100 if data['total'] > 0 else 0
            print(f"   Sprint {sprint}: {data['completed']}/{data['total']} ({percentage:.1f}%)")


def main():
    """Função principal."""
    parser = argparse.ArgumentParser(description='VeritasAI Roadmap Manager')
    parser.add_argument('command', choices=[
        'overview', 'sprints', 'milestones', 'tasks', 'team', 'progress', 'update'
    ], help='Comando a executar')
    
    parser.add_argument('--sprint', type=int, help='Número do sprint (para comando tasks)')
    parser.add_argument('--task-id', help='ID da tarefa (para comando update)')
    parser.add_argument('--status', help='Novo status (para comando update)')
    
    args = parser.parse_args()
    
    manager = RoadmapManager()
    
    if args.command == 'overview':
        manager.show_project_overview()
    elif args.command == 'sprints':
        manager.show_sprint_summary()
    elif args.command == 'milestones':
        manager.show_milestones()
    elif args.command == 'tasks':
        manager.show_tasks_by_sprint(args.sprint)
    elif args.command == 'team':
        manager.show_team_workload()
    elif args.command == 'progress':
        manager.generate_progress_report()
    elif args.command == 'update':
        if not args.task_id or not args.status:
            print("❌ Para update, forneça --task-id e --status")
            sys.exit(1)
        manager.update_task_status(args.task_id, args.status)


if __name__ == "__main__":
    main()
