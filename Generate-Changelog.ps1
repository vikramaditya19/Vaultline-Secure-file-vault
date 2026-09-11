# Convenient PowerShell script to generate changelog
# Usage: .\Generate-Changelog.ps1

python scripts/generate_changelog.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changelog updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📖 View it with: Get-Content CHANGELOG.md"
} else {
    Write-Host "❌ Failed to generate changelog" -ForegroundColor Red
}
