#!/usr/bin/env python3
"""
Simple changelog generator from git commits.
Parses commits following the [Category] format or creates a simple chronological list.
"""

import subprocess
import re
from datetime import datetime
from collections import defaultdict

def get_git_commits():
    """Fetch all commits from git log."""
    try:
        result = subprocess.run(
            ['git', 'log', '--pretty=format:%H%n%an%n%aI%n%s%n---'],
            cwd='.',
            capture_output=True,
            text=True
        )
        return result.stdout.strip() if result.stdout.strip() else ""
    except Exception as e:
        print(f"Error fetching commits: {e}")
        return ""

def parse_commits(log_text):
    """Parse git log output into commit objects."""
    commits = []
    entries = log_text.split('---')
    
    for entry in entries:
        lines = entry.strip().split('\n')
        if len(lines) < 3:
            continue
        
        commits.append({
            'hash': lines[0][:7],
            'author': lines[1],
            'date': lines[2][:10],  # Just the date part (YYYY-MM-DD)
            'subject': lines[3] if len(lines) > 3 else 'Unknown'
        })
    
    return commits

def extract_category(subject):
    """Extract category from commit subject."""
    match = re.match(r'\[(\w+)\]\s*(.*)', subject)
    if match:
        return match.group(1), match.group(2)
    return 'Other', subject

def generate_changelog(output_file='CHANGELOG.md'):
    """Generate changelog from git commits."""
    log_text = get_git_commits()
    
    if not log_text:
        print("No commits found")
        return
    
    commits = parse_commits(log_text)
    
    if not commits:
        print("Could not parse commits")
        return
    
    # Group by category
    entries = defaultdict(list)
    for commit in commits:
        category, description = extract_category(commit['subject'])
        entries[category].append({
            'description': description,
            'hash': commit['hash'],
            'author': commit['author'],
            'date': commit['date']
        })
    
    # Generate markdown
    markdown = f"# Changelog\n\nGenerated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    markdown += f"_Total commits: {len(commits)}_\n\n"
    
    categories = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security', 'Other']
    
    for category in categories:
        if category in entries and entries[category]:
            markdown += f"## {category}\n\n"
            for entry in entries[category]:
                markdown += f"- {entry['description']}\n"
                markdown += f"  - Hash: `{entry['hash']}` | Author: {entry['author']} | Date: {entry['date']}\n"
            markdown += "\n"
    
    # Write to file
    with open(output_file, 'w') as f:
        f.write(markdown)
    
    print(f"✅ Changelog generated: {output_file}")
    print(f"📝 Total commits: {len(commits)}")
    cat_summary = ', '.join([f'{cat}: {len(entries[cat])}' for cat in categories if category in entries and entries[cat]])
    if cat_summary:
        print(f"📊 {cat_summary}")

if __name__ == '__main__':
    generate_changelog()
