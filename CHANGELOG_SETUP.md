# Changelog Setup Guide

Your project is now configured with automated changelog generation using a Python-based system.

## Quick Start

### Generate Changelog

Choose one of these methods:

**Option 1: NPM Script** (recommended)
```bash
npm run changelog
```

**Option 2: PowerShell**
```powershell
.\Generate-Changelog.ps1
```

**Option 3: Direct Python**
```bash
python scripts/generate_changelog.py
```

## Configuration

The changelog generation is configured in:
- `.gitjournal.toml` — Git journal configuration
- `scripts/generate_changelog.py` — Python changelog generator

## Commit Message Format

To take full advantage of changelog categorization, use this format in your commits:

```
[Category] Brief description of change

Optional detailed explanation

Fixes: #123
```

### Supported Categories

- **Added** — New features
- **Changed** — Changes to existing functionality
- **Deprecated** — Deprecated features
- **Removed** — Removed features
- **Fixed** — Bug fixes
- **Security** — Security improvements
- **Other** — Everything else (default)

### Examples

```
[Added] User authentication with JWT tokens
[Fixed] File upload progress bar not displaying
[Security] Add rate limiting to API endpoints
[Changed] Refactor file service to use async operations
```

## Output

The generated `CHANGELOG.md` contains:
- Commits grouped by category
- Commit hash (short form)
- Author name
- Commit date
- Total commit count

## Workflow Recommendations

1. **During development** — Use standardized commit messages with `[Category]` prefix
2. **Before release** — Run `npm run changelog` to generate current status
3. **On git push** — The changelog is automatically useful for PR reviews

## Integration with CI/CD

To automatically generate changelogs before releases, add to your CI/CD pipeline:

```yaml
- name: Generate Changelog
  run: npm run changelog
  
- name: Commit changelog
  run: |
    git config user.email "bot@example.com"
    git config user.name "Changelog Bot"
    git add CHANGELOG.md
    git commit -m "Update changelog" || true
```

## Troubleshooting

**Q: Script not found?**
A: Make sure you're in the project root directory.

**Q: Python not found?**
A: Ensure Python is installed and in your PATH.

**Q: Empty "Other" section?**
A: Your commits aren't using the `[Category]` format yet. Update future commits with the standardized format.

---

Generated: September 11, 2026
