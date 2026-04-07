# Packaging Guide

This repository supports two distribution modes.

## Mode 1: Quick-Share ZIP (fastest)

Creates a runnable share folder that recipients can start with a script.

Build command:

```powershell
./build-share-package.ps1
```

Output:

- `release_share/GWS_STL_Analysis_QuickShare/`
- `release_share/GWS_STL_Analysis_QuickShare.zip`

Recipient run options:

- `Start_Viewers.bat`
- `Start_Viewers.ps1`

Requirements on recipient machine:

- Python 3.10+ (standard library only)

## Mode 2: Desktop Installer (.exe via Electron)

Requirements on build machine:

- Node.js LTS (includes npm)

Commands:

```powershell
npm install
npm run build:win
```

Installer outputs are written to `dist/`.

## Mode 3: Portable Desktop EXE (Electron)

If you prefer a portable EXE over an installer:

```powershell
npm install
npm run build:portable
```

Output is written to `dist/`.

## Notes

- Local example geometry files that must stay local-only are listed in `.gitignore`.
- The Electron package starts at `app_launcher.html`, where users can open either app.