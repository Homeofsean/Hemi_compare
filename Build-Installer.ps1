param(
  [switch]$SkipNodeCheck = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GWS STL Analysis Suite - Installer Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not $SkipNodeCheck) {
  $nodeVersion = $null
  try {
    $nodeVersion = node -v 2>$null
  }
  catch {
    # Node not installed
  }

  if (-not $nodeVersion) {
    Write-Host "Node.js not detected. Installing LTS..." -ForegroundColor Yellow
    
    # Try Chocolatey first
    $chocoPath = Get-Command choco -ErrorAction SilentlyContinue
    if ($chocoPath) {
      Write-Host "Found Chocolatey. Installing via choco..." -ForegroundColor Green
      choco install nodejs -y
    }
    else {
      Write-Host "Chocolatey not found." -ForegroundColor Yellow
      Write-Host ""
      Write-Host "To install Node.js manually:" -ForegroundColor Cyan
      Write-Host "1. Visit https://nodejs.org/en/download" -ForegroundColor Cyan
      Write-Host "2. Download LTS version" -ForegroundColor Cyan
      Write-Host "3. Run installer, then retry this script" -ForegroundColor Cyan
      Write-Host ""
      exit 1
    }
  }
  else {
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Checking npm..." -ForegroundColor Cyan
$npmVersion = $null
try {
  $npmVersion = npm -v 2>$null
}
catch {
  # npm not available
}

if (-not $npmVersion) {
  Write-Host "npm not found. Unable to proceed." -ForegroundColor Red
  exit 1
}

Write-Host "npm found: $npmVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
  Write-Host "npm install failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Building Windows Installer..." -ForegroundColor Cyan
npm run build:win

if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installer packages are in:" -ForegroundColor Cyan
Write-Host "  .\dist\" -ForegroundColor Yellow
Write-Host ""
Write-Host "Share the generated .exe files with your team." -ForegroundColor Green
Write-Host ""
