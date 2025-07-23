#!/usr/bin/env python3
import subprocess
import sys

def main():
    """Execute testes usando uv."""
    cmd = ["uv", "run", "pytest"] + sys.argv[1:]
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
