#!/usr/bin/env python3
"""
ToteTaxi Full Codebase Export — Backend + Frontend
Outputs all relevant source code to a single text file.
Skips: migrations, tests, __init__.py, old scripts, auto-generated files.
"""
import os
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).parent

# Directories to skip entirely
SKIP_DIRS = {
    'node_modules', '.next', '__pycache__', '.git', '.pytest_cache',
    'htmlcov', 'coverage', '.cache', 'dist', 'build',
    'staticfiles', 'media', 'logs', '.mypy_cache', '.ruff_cache',
    'migrations', 'tests', 'e2e',
}

# Files to skip
SKIP_FILES = {
    '.DS_Store', 'Thumbs.db', '.coverage', 'db.sqlite3',
    'back_export.txt', 'frontend_snapshot.txt', 'export.txt',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'back_export.py', 'front_export.py', 'export_code.py',
    'validate_ses_setup.py', 'recreate_services.py',
    'conftest.py', 'instrumentation.ts',
}

# Extensions to include
BACKEND_EXTENSIONS = {'.py', '.sh', '.toml', '.md'}
FRONTEND_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.css', '.md'}

# Named config files to always include
CONFIG_FILES = {
    'Dockerfile', 'Dockerfile.prod',
    'requirements.txt', 'manage.py', 'fly.toml',
    'docker-compose.yml', 'docker-compose.prod.yml',
}

SYNTAX_MAP = {
    '.py': 'python', '.sh': 'bash', '.ts': 'typescript', '.tsx': 'tsx',
    '.js': 'javascript', '.jsx': 'jsx', '.css': 'css',
    '.yml': 'yaml', '.yaml': 'yaml', '.toml': 'toml',
    '.json': 'json',
    '.md': 'markdown',
}


def should_skip_dir(dir_name):
    return dir_name in SKIP_DIRS or dir_name.startswith('.')


def should_include(file_path, section):
    """Determine if a file should be included in the export."""
    name = file_path.name
    suffix = file_path.suffix

    if name in SKIP_FILES:
        return False

    # Never export .env files (secrets)
    if name.startswith('.env'):
        return False

    # Skip empty __init__.py files and test files
    if name == '__init__.py':
        return False
    if name.startswith('test_') or name.endswith('_test.py'):
        return False
    if name.endswith('.spec.ts') or name.endswith('.spec.tsx'):
        return False

    # Always include named config files
    if name in CONFIG_FILES:
        return True

    if section == 'backend':
        return suffix in BACKEND_EXTENSIONS
    elif section == 'frontend':
        if suffix in FRONTEND_EXTENSIONS:
            return True
        # Include key config files in frontend root
        if name in {'package.json', 'tsconfig.json', 'next.config.ts',
                     'tailwind.config.js', 'postcss.config.mjs'}:
            return True
        return False

    # Root-level files
    if suffix == '.md':
        return True
    return name in CONFIG_FILES


def collect_files(base_dir, section):
    """Walk a directory tree, respecting skip rules."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        dirs[:] = sorted(d for d in dirs if not should_skip_dir(d))

        for name in sorted(filenames):
            fp = Path(root) / name
            if should_include(fp, section):
                files.append(fp)
    return files


def get_content(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"# Error reading file: {e}"


def main():
    output_file = PROJECT_ROOT / 'export.txt'

    backend_dir = PROJECT_ROOT / 'backend'
    frontend_dir = PROJECT_ROOT / 'frontend'

    # Collect root-level config files
    root_files = []
    for fp in sorted(PROJECT_ROOT.iterdir()):
        if fp.is_file() and should_include(fp, 'root'):
            root_files.append(fp)

    backend_files = collect_files(backend_dir, 'backend')
    frontend_files = collect_files(frontend_dir, 'frontend')

    total = len(root_files) + len(backend_files) + len(frontend_files)
    print(f"Exporting {total} files ({len(backend_files)} backend, {len(frontend_files)} frontend, {len(root_files)} root)")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"# TOTETAXI — FULL CODEBASE EXPORT\n")
        f.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# Files: {total} ({len(backend_files)} backend, {len(frontend_files)} frontend, {len(root_files)} root)\n")
        f.write(f"# Excludes: .env, migrations, tests, __init__.py, node_modules\n\n")

        sections = [
            ('ROOT', root_files, PROJECT_ROOT),
            ('BACKEND', backend_files, PROJECT_ROOT),
            ('FRONTEND', frontend_files, PROJECT_ROOT),
        ]

        for section_name, files, base in sections:
            if not files:
                continue
            f.write(f"\n{'=' * 60}\n")
            f.write(f"  {section_name}\n")
            f.write(f"{'=' * 60}\n\n")

            for fp in files:
                rel = fp.relative_to(base)
                lang = SYNTAX_MAP.get(fp.suffix, '')
                f.write(f"# ──── {rel} ────\n\n")
                f.write(f"```{lang}\n")
                content = get_content(fp)
                f.write(content)
                if not content.endswith('\n'):
                    f.write('\n')
                f.write("```\n\n")

    size_kb = output_file.stat().st_size / 1024
    print(f"Done: {output_file} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
