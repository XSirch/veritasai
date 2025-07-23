#!/usr/bin/env python3
import subprocess

def main():
    """Execute linting usando flake8, mypy e bandit."""
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
