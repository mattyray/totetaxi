#!/usr/bin/env python3
"""
ToteTaxi Backend Export - Code Files Only
"""
import os
from pathlib import Path
from datetime import datetime

def get_file_content(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"# Error reading file: {e}"

def should_include_file(file_path, base_dir):
    """Smart file inclusion rules for ToteTaxi Backend - Code Only"""
    rel_path = file_path.relative_to(base_dir)
    path_str = str(rel_path)
    
    # Skip patterns - SECURITY: Handle .env files separately
    skip_patterns = [
        '__pycache__', '.pyc', '.git/', '.pytest_cache/', 'htmlcov/',
        'staticfiles/', 'media/', 'logs/', '.coverage', 'db.sqlite3',
        'back_export.txt', 'totetaxi_backend_snapshot.txt',
        '.DS_Store', '*.swp', '*.swo',
        'README.md', 'CHANGELOG.md'  # Skip documentation files
    ]
    
    if any(pattern in path_str for pattern in skip_patterns):
        return False
    
    # SECURITY: Skip .env files (contain secrets)
    if file_path.name.startswith('.env'):
        return False
    
    # Include patterns - Code files only
    include_extensions = {'.py', '.txt', '.yml', '.yaml', '.toml', '.sh', '.ini', '.conf'}
    include_files = {
        'Dockerfile', 'Dockerfile.dev', '.dockerignore', '.gitignore', 
        'manage.py', 'docker-compose.yml', 'docker-compose.prod.yml',
        'gunicorn.conf.py', 'pytest.ini', 'requirements.txt'
    }
    
    return (
        file_path.suffix in include_extensions or 
        file_path.name in include_files
    )

def categorize_file(file_path, base_dir):
    """Auto-categorize files for ToteTaxi structure"""
    rel_path = file_path.relative_to(base_dir)
    path_str = str(rel_path)
    
    # Configuration files (root level)
    if (rel_path.parent == Path('.') or 
        file_path.name in ['manage.py', 'requirements.txt', 'gunicorn.conf.py', 'pytest.ini']):
        return 'config'
    
    # ToteTaxi Django apps - UPDATED to 6 apps only
    totetaxi_apps = [
        'accounts/', 'bookings/', 'customers/', 
        'logistics/', 'payments/', 'services/'
    ]
    if any(f'apps/{app}' in path_str for app in totetaxi_apps):
        return 'apps'
    
    # Django project settings (config/ directory)
    if 'config/' in path_str:
        return 'project'
    
    # Scripts directory
    if 'scripts/' in path_str:
        return 'scripts'
    
    # Everything else
    return 'other'

def main():
    backend_dir = Path(__file__).parent.parent
    output_file = backend_dir / 'scripts' / 'back_export.txt'
    
    print(f"🔍 Auto-discovering ToteTaxi backend files in: {backend_dir}")
    
    # Auto-discover all relevant files
    all_files = []
    for file_path in backend_dir.rglob('*'):
        if file_path.is_file() and should_include_file(file_path, backend_dir):
            all_files.append(file_path)
    
    # Categorize files
    categories = {
        'config': [],
        'project': [],
        'apps': [],
        'scripts': [],
        'other': []
    }
    
    for file_path in all_files:
        category = categorize_file(file_path, backend_dir)
        categories[category].append(file_path)
    
    # Sort within categories
    for category in categories:
        categories[category].sort()
    
    print(f"📊 Found {len(all_files)} files:")
    for cat, files in categories.items():
        if files:
            print(f"  - {cat}: {len(files)} files")
    
    # Generate snapshot
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# TOTETAXI - BACKEND CODE SNAPSHOT\n")
        f.write("# AUTO-GENERATED - CODE FILES ONLY\n")
        f.write(f"# Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# Total files: {len(all_files)}\n")
        f.write("# 🔒 SECURITY: .env files excluded (contain secrets)\n")
        f.write("# 📋 INCLUDES: All Django apps, migrations, configuration\n")
        f.write("# Apps: accounts (STAFF), bookings, customers, logistics, payments, services\n")  # UPDATED
        f.write("# Tech Stack: Django 5.2.5, DRF 3.16.1, PostgreSQL, Redis, Celery\n")
        f.write("# Integration: S3 storage, SES email, mocked Stripe/Onfleet\n\n\n")
        
        # Output by category
        section_names = {
            'config': 'CONFIGURATION & ROOT FILES',
            'project': 'DJANGO PROJECT SETTINGS (config/)',
            'apps': 'DJANGO APPLICATIONS (apps/)',
            'scripts': 'SCRIPTS & UTILITIES',
            'other': 'OTHER FILES'
        }
        
        for category, section_name in section_names.items():
            if categories[category]:
                f.write("# " + "="*25 + f" {section_name} " + "="*25 + "\n\n\n")
                
                for file_path in categories[category]:
                    rel_path = file_path.relative_to(backend_dir)
                    f.write(f"# ==== {rel_path} ====\n\n")
                    
                    # Smart syntax highlighting
                    if file_path.suffix == '.py':
                        f.write("```python\n")
                    elif file_path.suffix in ['.yml', '.yaml']:
                        f.write("```yaml\n")
                    elif file_path.suffix == '.toml':
                        f.write("```toml\n")
                    elif file_path.suffix == '.sh':
                        f.write("```bash\n")
                    elif file_path.name in ['Dockerfile', 'Dockerfile.dev']:
                        f.write("```dockerfile\n")
                    elif file_path.suffix == '.ini':
                        f.write("```ini\n")
                    else:
                        f.write("```\n")
                    
                    content = get_file_content(file_path)
                    f.write(content)
                    if not content.endswith('\n'):
                        f.write('\n')
                    f.write("```\n\n")
    
    print(f"✅ Auto-generated ToteTaxi backend snapshot: {output_file}")
    print("🔒 SECURITY: .env files excluded (contain secrets)")
    print("📋 INCLUDES: All 6 Django apps with migrations")  # UPDATED
    print("🏗️  STRUCTURE: accounts (staff), bookings, customers, logistics, payments, services")  # UPDATED
    print("🐳 DOCKER: Configuration and compose files included")
    print("📁 CODE ONLY: Documentation files excluded")

if __name__ == "__main__":
    main()