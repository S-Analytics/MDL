# Quick Start - MDL Desktop App

Get MDL running as a desktop application in 3 simple steps.

## Prerequisites

- Node.js 18+ installed
- npm installed

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages including Electron and electron-builder.

## Step 2: Run in Development Mode

```bash
npm run electron:dev
```

This will:
1. Compile TypeScript to JavaScript
2. Launch the MDL desktop application
3. Start the backend server automatically
4. Open with DevTools for development

**Expected result:** A window opens showing the MDL dashboard at http://localhost:3000/dashboard

## Step 3: Build Installer (Optional)

```bash
npm run electron:build
```

This creates an installable package in the `release/` directory.

**Time:** 5-10 minutes for the first build
**Output size:** ~150-200 MB

## 🎉 You're Done!

The MDL app is now running as a desktop application with:
- Full dashboard interface
- Metrics management (Add/Edit/Delete)
- Objectives & Key Results tracking
- Business domains management
- Import/Export capabilities
- Native menu and keyboard shortcuts

## Next Steps

### Customize the App

1. **Replace the icon:**
   ```bash
   ./scripts/generate-icons.sh path/to/your-logo.png
   npm run electron:build
   ```

2. **Update app details in package.json:**
   - `name`: App identifier
   - `version`: App version
   - `description`: App description
   - `build.appId`: Unique identifier
   - `build.productName`: Display name

### Distribute the App

After building, share the installer from `release/`:
- **macOS**: `MDL-1.0.0.dmg` or `MDL-1.0.0-mac.zip`
- **Windows**: `MDL Setup 1.0.0.exe` or `MDL 1.0.0.exe`
- **Linux**: `MDL-1.0.0.AppImage`, `.deb`, or `.rpm`

### Alternative: Run as Web Server

If you prefer the web server version:

```bash
npm start
```

Then open http://localhost:3000/dashboard in your browser.

## Troubleshooting

### "Cannot find module 'electron'"
```bash
npm install
```

### Port 3000 already in use
```bash
# Kill existing processes
pkill -f 'node dist/index.js'
```

### Build fails
```bash
# Clean and rebuild
rm -rf node_modules release dist
npm install
npm run electron:build
```

## Documentation

- [ELECTRON.md](ELECTRON.md) - Complete Electron documentation
- [BUILD.md](BUILD.md) - Building installers guide
- [ELECTRON_SUMMARY.md](ELECTRON_SUMMARY.md) - Technical summary
- [README.md](README.md) - Main project documentation

## Support

For issues or questions, check the documentation files above or the GitHub repository.

---

**Happy metrics management! 📊**
