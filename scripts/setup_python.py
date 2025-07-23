#!/usr/bin/env python3
"""
Setup script para ambiente Python do VeritasAI usando uv
"""

import subprocess
import sys
import os
from pathlib import Path
import shutil


def run_command(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Execute um comando e retorna o resultado."""
    print(f"🔧 Executando: {' '.join(cmd)}")
    return subprocess.run(cmd, check=check, capture_output=True, text=True)


def check_uv_installed() -> bool:
    """Verifica se uv está instalado."""
    try:
        result = run_command(["uv", "--version"], check=False)
        if result.returncode == 0:
            print(f"✅ uv encontrado: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ uv não encontrado")
    return False


def install_uv():
    """Instala uv se não estiver disponível."""
    print("📦 Instalando uv...")
    
    # Tentar instalar via pip primeiro
    try:
        run_command([sys.executable, "-m", "pip", "install", "uv"])
        print("✅ uv instalado via pip")
        return
    except subprocess.CalledProcessError:
        pass
    
    # Tentar instalar via curl (Unix/Linux/macOS)
    if os.name != 'nt':
        try:
            run_command(["curl", "-LsSf", "https://astral.sh/uv/install.sh", "|", "sh"])
            print("✅ uv instalado via script")
            return
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
    
    # Instruções manuais
    print("❌ Não foi possível instalar uv automaticamente")
    print("📖 Instale manualmente:")
    print("   - pip install uv")
    print("   - ou visite: https://docs.astral.sh/uv/getting-started/installation/")
    sys.exit(1)


def setup_python_environment():
    """Configura o ambiente Python usando uv."""
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    print("🐍 Configurando ambiente Python com uv...")
    
    # Verificar se uv está instalado
    if not check_uv_installed():
        install_uv()
    
    # Sincronizar dependências
    print("📦 Sincronizando dependências...")
    try:
        run_command(["uv", "sync"])
        print("✅ Dependências sincronizadas")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao sincronizar dependências: {e}")
        print("🔄 Tentando com pip como fallback...")
        fallback_pip_install()
    
    # Instalar pre-commit hooks
    print("🪝 Configurando pre-commit hooks...")
    try:
        run_command(["uv", "run", "pre-commit", "install"])
        print("✅ Pre-commit hooks instalados")
    except subprocess.CalledProcessError:
        print("⚠️ Falha ao instalar pre-commit hooks")
    
    # Verificar instalação
    print("🧪 Verificando instalação...")
    try:
        result = run_command(["uv", "run", "pytest", "--version"])
        print(f"✅ pytest: {result.stdout.strip()}")
        
        result = run_command(["uv", "run", "black", "--version"])
        print(f"✅ black: {result.stdout.strip()}")
        
        print("✅ Ambiente Python configurado com sucesso!")
        
    except subprocess.CalledProcessError:
        print("⚠️ Algumas ferramentas podem não estar funcionando corretamente")


def fallback_pip_install():
    """Fallback para pip se uv falhar."""
    print("📦 Instalando dependências com pip...")
    
    # Criar requirements.txt temporário do pyproject.toml
    try:
        run_command([sys.executable, "-m", "pip", "install", "build"])
        run_command([sys.executable, "-m", "pip", "install", "-e", "."])
        print("✅ Dependências instaladas via pip")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar com pip: {e}")
        sys.exit(1)


def create_dev_scripts():
    """Cria scripts de desenvolvimento."""
    scripts_dir = Path("scripts")
    scripts_dir.mkdir(exist_ok=True)
    
    # Script para executar testes
    test_script = scripts_dir / "test.py"
    test_script.write_text("""#!/usr/bin/env python3
import subprocess
import sys

def main():
    \"\"\"Execute testes usando uv.\"\"\"
    cmd = ["uv", "run", "pytest"] + sys.argv[1:]
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
""", encoding='utf-8')
    
    # Script para formatação de código
    format_script = scripts_dir / "format.py"
    format_script.write_text("""#!/usr/bin/env python3
import subprocess

def main():
    \"\"\"Formata código usando black e isort.\"\"\"
    print("Formatando código...")
    subprocess.run(["uv", "run", "black", "src", "tests", "scripts"])
    subprocess.run(["uv", "run", "isort", "src", "tests", "scripts"])
    print("Código formatado")

if __name__ == "__main__":
    main()
""", encoding='utf-8')
    
    # Script para linting
    lint_script = scripts_dir / "lint.py"
    lint_script.write_text("""#!/usr/bin/env python3
import subprocess

def main():
    \"\"\"Execute linting usando flake8, mypy e bandit.\"\"\"
    print("Executando linting...")

    print("flake8...")
    subprocess.run(["uv", "run", "flake8", "src", "tests"])

    print("mypy...")
    subprocess.run(["uv", "run", "mypy", "src"])

    print("bandit...")
    subprocess.run(["uv", "run", "bandit", "-r", "src"])

    print("Linting concluído")

if __name__ == "__main__":
    main()
""", encoding='utf-8')
    
    # Tornar scripts executáveis
    for script in [test_script, format_script, lint_script]:
        script.chmod(0o755)
    
    print("✅ Scripts de desenvolvimento criados")


def main():
    """Função principal."""
    print("🚀 Setup do ambiente Python para VeritasAI")
    print("=" * 50)
    
    try:
        setup_python_environment()
        create_dev_scripts()
        
        print("\n🎉 Setup concluído com sucesso!")
        print("\n📋 Comandos disponíveis:")
        print("  uv run pytest                 # Executar testes")
        print("  uv run black src tests        # Formatar código")
        print("  uv run flake8 src tests       # Linting")
        print("  uv run mypy src               # Type checking")
        print("  uv add <package>               # Adicionar dependência")
        print("  uv remove <package>            # Remover dependência")
        print("  uv sync                        # Sincronizar dependências")
        
    except KeyboardInterrupt:
        print("\n❌ Setup cancelado pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro durante setup: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
