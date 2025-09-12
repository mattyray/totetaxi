#!/usr/bin/env python3
"""
ToteTaxi Frontend Export - Code Files Only
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
    """Only include essential code files"""
    rel_path = file_path.relative_to(base_dir)
    path_str = str(rel_path)
    
    # Skip everything we don't need
    skip_patterns = [
        'node_modules/', '.next/', 'dist/', 'build/', '.git/', 
        'coverage/', '.cache/', 'frontend_snapshot.txt', 'front_export.py',
        'scripts/', '.DS_Store', '*.log', '.eslintcache',
        'README.md', 'CHANGELOG.md'  # Skip documentation
    ]
    
    if any(pattern in path_str for pattern in skip_patterns):
        return False
    
    # SECURITY: Exclude all .env files except .env.example
    if file_path.name.startswith('.env') and not file_path.name.endswith('.example'):
        return False
    
    # Include essential public assets only
    if 'public/' in path_str:
        essential_public = {'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', 'logo.svg', 'logo.png'}
        return file_path.name in essential_public
    
    # Only include essential files
    essential_extensions = {'.ts', '.tsx', '.js', '.jsx', '.css'}
    essential_configs = {
        # Core configs
        'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next.config.js',
        'tailwind.config.js', 'postcss.config.js', 'postcss.config.mjs',
        # Deployment configs
        '.eslintrc.json', '.eslintrc.js', '.gitignore', 'vercel.json', 'netlify.toml',
        # Environment templates (safe)
        '.env.example', '.env.local.example',
        # Next.js middleware
        'middleware.ts', 'middleware.js'
    }
    
    return (
        file_path.suffix in essential_extensions or 
        file_path.name in essential_configs
    )

def main():
    frontend_dir = Path(__file__).parent.parent
    output_file = frontend_dir / 'scripts' / 'frontend_snapshot.txt'
    
    (frontend_dir / 'scripts').mkdir(exist_ok=True)
    
    print(f"Exporting ToteTaxi frontend code files...")
    
    # Get all relevant files
    all_files = []
    for file_path in frontend_dir.rglob('*'):
        if file_path.is_file() and should_include_file(file_path, frontend_dir):
            all_files.append(file_path)
    
    all_files.sort()
    
    print(f"Found {len(all_files)} essential code files")
    
    # Security check: verify no actual .env files are included
    env_files = [f for f in all_files if f.name.startswith('.env')]
    if env_files:
        print("Environment files included:")
        for env_file in env_files:
            print(f"  - {env_file.relative_to(frontend_dir)}")
            if not env_file.name.endswith('.example'):
                raise Exception(f"SECURITY ERROR: Actual .env file detected: {env_file.name}")
    
    # Generate snapshot
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# TOTETAXI FRONTEND - CODE FILES ONLY\n")
        f.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# Files: {len(all_files)} essential code files\n")
        f.write("# Stack: Next.js 15 + TypeScript + Tailwind v3 + TanStack Query v5\n")
        f.write("# Security: All .env files excluded except .example templates\n\n")
        
        for file_path in all_files:
            rel_path = file_path.relative_to(frontend_dir)
            f.write(f"# ==== {rel_path} ====\n\n")
            
            # Simple syntax highlighting
            if file_path.suffix in ['.ts', '.tsx']:
                f.write("```typescript\n")
            elif file_path.suffix in ['.js', '.jsx']:
                f.write("```javascript\n")
            elif file_path.suffix == '.css':
                f.write("```css\n")
            elif file_path.suffix == '.json':
                f.write("```json\n")
            else:
                f.write("```\n")
            
            content = get_file_content(file_path)
            f.write(content)
            if not content.endswith('\n'):
                f.write('\n')
            f.write("```\n\n")
    
    print(f"Exported to: {output_file}")
    print("Includes: src/ code, deployment configs, essential public assets")
    print("Security: All environment variables safely excluded")

if __name__ == "__main__":
    main()