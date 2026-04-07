param(
  [string]$OutRoot = "release_share"
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$outRootAbs = Join-Path $root $OutRoot
$pkgName = "GWS_STL_Analysis_QuickShare"
$pkgDir = Join-Path $outRootAbs $pkgName
$zipPath = Join-Path $outRootAbs "$pkgName.zip"

if (Test-Path $pkgDir) {
  Remove-Item -LiteralPath $pkgDir -Recurse -Force
}
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null

$filesToCopy = @(
  "app_launcher.html",
  "diameter_portal.html",
  "diameter-portal.css",
  "diameter-portal.js",
  "index.html",
  "styles.css",
  "viewer.js",
  "fit-worker.js",
  "three.module.js",
  "OrbitControls.js",
  "README.md",
  "AI_GUIDE.md",
  "AI_RUNBOOK.md",
  "PACKAGING.md",
  "709-04-72J-21 -VF-877-13-17  Datum DX- Mean.gws",
  "709-04-72J-21 - VF-877-13-17  Trident Helix Actual - Filtered.gws",
  "VF-877-13-17.stl"
)

foreach ($f in $filesToCopy) {
  $src = Join-Path $root $f
  if (Test-Path $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $pkgDir $f) -Force
  }
}

$bat = @"
@echo off
setlocal
cd /d "%~dp0"
start "" "http://localhost:8000/app_launcher.html"
python -m http.server 8000
"@

$ps1 = @"
Set-Location -LiteralPath `$PSScriptRoot
Start-Process "http://localhost:8000/app_launcher.html"
python -m http.server 8000
"@

$readme = @"
Quick-Share Runtime
===================

1) Preferred: run Start_Viewers.ps1
2) Alternate: run Start_Viewers.bat

This launches a local web server and opens app_launcher.html,
where you can choose Diameter Analysis Portal or GWS vs STL Fit Viewer.

Requirement: Python 3.10+ installed.
"@

Set-Content -LiteralPath (Join-Path $pkgDir "Start_Viewers.bat") -Value $bat -NoNewline
Set-Content -LiteralPath (Join-Path $pkgDir "Start_Viewers.ps1") -Value $ps1 -NoNewline
Set-Content -LiteralPath (Join-Path $pkgDir "QUICKSTART.txt") -Value $readme -NoNewline

if (-not (Test-Path $outRootAbs)) {
  New-Item -ItemType Directory -Path $outRootAbs -Force | Out-Null
}

Compress-Archive -Path (Join-Path $pkgDir "*") -DestinationPath $zipPath -Force

Write-Host "Share package folder: $pkgDir"
Write-Host "Share package zip:    $zipPath"
