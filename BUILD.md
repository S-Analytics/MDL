# Building Installers - Quick Guide

Building an installer can take 5-10 minutes depending on your system. It creates the following:

## For macOS (if building on macOS):
- `MDL-1.0.0.dmg` - Disk image installer (~150-200 MB)
- `MDL-1.0.0-mac.zip` - Portable zip version
- Universal binary supporting Intel and Apple Silicon

## For Windows (if building on Windows):
- `MDL Setup 1.0.0.exe` - NSIS installer
- `MDL 1.0.0.exe` - Portable version (no install required)

## For Linux (if building on Linux):
- `MDL-1.0.0.AppImage` - Universal Linux app
- `mdl_1.0.0_amd64.deb` - Debian/Ubuntu package
- `mdl-1.0.0.x86_64.rpm` - Red Hat/Fedora package

## Build Command

```bash
# Build for your current platform only
npm run electron:build

# The output will be in the release/ folder
```

## What Gets Packaged

The installer includes:
- The complete MDL application
- Built-in web server (Express)
- Electron framework + Chromium
- Node.js runtime
- All dependencies
- Sample data files
- Application icon

## Installation Size

The installed application will be approximately:
- macOS: 200-250 MB
- Windows: 150-200 MB
- Linux: 200-250 MB

This is normal for Electron apps as they bundle Chromium and Node.js.

## Note

For the first build, electron-builder may need to download platform-specific dependencies. This is a one-time download and will be cached for future builds.

## Testing the Built App

After building:

### macOS
```bash
open release/mac/MDL.app
```

### Windows
```bash
.\release\MDL.exe
```

### Linux
```bash
chmod +x release/MDL-1.0.0.AppImage
./release/MDL-1.0.0.AppImage
```
