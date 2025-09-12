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

def main():
    frontend_dir = Path(__file__).parent.parent
    output_file = frontend_dir / 'scripts' / 'frontend_snapshot.txt'
    
    (frontend_dir / 'scripts').mkdir(exist_ok=True)
    
    print(f"Scanning: {frontend_dir}")
    
    all_files = []
    
    for file_path in frontend_dir.rglob('*'):
        if not file_path.is_file():
            continue
            
        path_str = str(file_path)
        
        # HARD STOP: If node_modules is anywhere in the path, skip it
        if 'node_modules' in path_str:
            continue
            
        # Skip other unwanted directories/files
        unwanted = ['.next', 'dist', 'build', '.git', 'coverage', '.cache', 'scripts']
        if any(unwanted_dir in path_str for unwanted_dir in unwanted):
            continue
            
        # Skip unwanted files
        if file_path.name in ['frontend_snapshot.txt', 'front_export.py', '.DS_Store']:
            continue
            
        # Only include these file types
        if file_path.suffix in ['.ts', '.tsx', '.js', '.jsx', '.css']:
            all_files.append(file_path)
        elif file_path.name in ['package.json', 'tsconfig.json', 'tailwind.config.js', 'next.config.js', 'next.config.ts']:
            all_files.append(file_path)
    
    print(f"Found {len(all_files)} files")
    
    # Double check - this should be empty
    node_check = [f for f in all_files if 'node_modules' in str(f)]
    if node_check:
        print(f"ERROR: Still found node_modules files: {node_check[:3]}")
        return
    
    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"# TOTETAXI FRONTEND EXPORT\n")
        f.write(f"# Generated: {datetime.now()}\n")
        f.write(f"# Files: {len(all_files)}\n\n")
        
        for file_path in sorted(all_files):
            rel_path = file_path.relative_to(frontend_dir)
            f.write(f"# ==== {rel_path} ====\n\n")
            f.write("```\n")
            f.write(get_file_content(file_path))
            f.write("\n```\n\n")
    
    print(f"Done: {output_file}")

if __name__ == "__main__":
    main()