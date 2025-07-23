#!/usr/bin/env python3
import subprocess

def main():
    """Formata código usando black e isort."""
    print("Formatando código...")
    subprocess.run(["uv", "run", "black", "src", "tests", "scripts"])
    subprocess.run(["uv", "run", "isort", "src", "tests", "scripts"])
    print("Código formatado")

if __name__ == "__main__":
    main()
