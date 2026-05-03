# Database Setup Script for PowerShell

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Database Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if PHP is available
try {
    $phpVersion = php --version 2>&1
    Write-Host "✓ PHP found: $($phpVersion.Split([Environment]::NewLine)[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ PHP is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PHP or add it to your system PATH" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Running database setup..." -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$phpScript = Join-Path $scriptPath "SETUP_DATABASE.php"

if (-not (Test-Path $phpScript)) {
    Write-Host "❌ Setup script not found: $phpScript" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Run the PHP setup script
& php $phpScript

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Setup failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✓ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Backend:  cd backend && php artisan serve" -ForegroundColor Yellow
Write-Host "2. Frontend: cd frontend && npm run dev" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
