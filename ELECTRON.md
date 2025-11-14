# MDL Electron - Building Installers

This document explains how to build installable packages for MDL across different operating systems.

## Prerequisites

- Node.js 18+ installed
- npm installed
- All dependencies installed: `npm install`

## Development

Run the Electron app in development mode:

```bash
npm run electron:dev
```

This will:
1. Compile TypeScript to JavaScript
2. Start the Electron app with DevTools enabled
3. Load the MDL dashboard at http://localhost:3000/dashboard

## Building Installers

### Build for Current Platform

```bash
npm run electron:build
```

This creates an installer for your current operating system in the `release/` directory.

### Build for All Platforms

```bash
npm run electron:build:all
```

**Note:** Building for all platforms from a single OS has limitations:
- **macOS**: Can build for macOS, Windows, and Linux
- **Windows**: Can build for Windows and Linux (not macOS)
- **Linux**: Can build for Linux only

### Build for Specific Platforms

#### macOS (DMG and ZIP)
```bash
npm run electron:build:mac
```

Creates:
- `MDL-1.0.0.dmg` - macOS installer
- `MDL-1.0.0-mac.zip` - Portable macOS app
- Universal binary for Intel (x64) and Apple Silicon (arm64)

#### Windows (NSIS and Portable)
```bash
npm run electron:build:win
```

Creates:
- `MDL Setup 1.0.0.exe` - Windows installer (NSIS)
- `MDL 1.0.0.exe` - Portable Windows executable
- 64-bit and 32-bit versions

#### Linux (AppImage, DEB, RPM)
```bash
npm run electron:build:linux
```

Creates:
- `MDL-1.0.0.AppImage` - Universal Linux app
- `mdl_1.0.0_amd64.deb` - Debian/Ubuntu package
- `mdl-1.0.0.x86_64.rpm` - Red Hat/Fedora package

## Output Directory

All built installers are placed in the `release/` directory with the following structure:

```
release/
├── mac/
│   ├── MDL.app
│   ├── MDL-1.0.0.dmg
│   └── MDL-1.0.0-mac.zip
├── win-unpacked/
│   └── MDL.exe
├── MDL Setup 1.0.0.exe
├── MDL 1.0.0.exe
├── linux-unpacked/
│   └── mdl
├── MDL-1.0.0.AppImage
├── mdl_1.0.0_amd64.deb
└── mdl-1.0.0.x86_64.rpm
```

## Configuration

The build configuration is in `package.json` under the `build` key:

- **appId**: `com.mdl.metrics`
- **productName**: `MDL`
- **Icon locations**: `assets/icon.{png,icns,ico}`
- **Output directory**: `release/`

## Customizing Icons

To use custom icons:

1. Create a 1024x1024 PNG icon
2. Generate platform-specific formats:
   - **macOS**: Convert to `.icns` format
   - **Windows**: Convert to `.ico` format
   - **Linux**: Use `.png` at 512x512 or higher

You can use online tools or:

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./path/to/icon.png --output=./assets --flatten
```

## Code Signing (Optional)

### macOS Code Signing

Set environment variables:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-certificate-password
```

### Windows Code Signing

Set environment variables:
```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your-certificate-password
```

Then run the build command.

## Publishing

electron-builder supports automatic publishing to:
- GitHub Releases
- S3
- Bintray
- Generic servers

Configure in `package.json` under `build.publish`.

## Troubleshooting

### "Cannot find module 'electron'"
```bash
npm install
```

### Build fails with permission errors
```bash
sudo chown -R $(whoami) release/
```

### macOS: "App is damaged and can't be opened"
This happens with unsigned apps. Users need to:
1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog

Or disable Gatekeeper (not recommended):
```bash
xattr -cr /Applications/MDL.app
```

### Linux: AppImage won't run
Make it executable:
```bash
chmod +x MDL-1.0.0.AppImage
```

## Distribution

### macOS (.dmg)
- Users drag the app to Applications folder
- Double-click to run

### Windows (.exe)
- Users run the installer
- Follow installation wizard
- Or use portable version (no installation required)

### Linux
- **AppImage**: Make executable and run
- **DEB**: `sudo dpkg -i mdl_1.0.0_amd64.deb`
- **RPM**: `sudo rpm -i mdl-1.0.0.x86_64.rpm`

## File Sizes

Approximate installer sizes:
- macOS DMG: ~150-200 MB
- Windows NSIS: ~100-150 MB
- Linux AppImage: ~150-200 MB

The apps include:
- Electron runtime
- Chromium
- Node.js
- Your application code
- All dependencies

## Auto-Update (Advanced)

To enable auto-updates:

1. Add `electron-updater` dependency
2. Configure update server in `package.json`
3. Implement update check in `electron.js`
4. Publish releases with proper semver

See: https://www.electron.build/auto-update

## Resources

- [electron-builder Documentation](https://www.electron.build/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Code Signing Guide](https://www.electron.build/code-signing)
