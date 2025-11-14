# MDL Application Icons

This directory contains the application icons for the MDL Electron app.

## Icon Files

- `icon.svg` - Source vector icon (512x512)
- `icon.png` - Linux icon (512x512)
- `icon.icns` - macOS icon (to be generated)
- `icon.ico` - Windows icon (to be generated)

## Generating Platform-Specific Icons

### For macOS (.icns)
You can use the following tools:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- macOS built-in: `iconutil -c icns icon.iconset`
- Online tool: https://cloudconvert.com/png-to-icns

### For Windows (.ico)
You can use:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- Online tool: https://cloudconvert.com/png-to-ico
- ImageMagick: `convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico`

### Automated Generation
Install electron-icon-builder:
```bash
npm install -g electron-icon-builder
```

Then run:
```bash
electron-icon-builder --input=./assets/icon.png --output=./assets --flatten
```

This will generate both .icns and .ico files from the PNG source.

## Note
The current icons are placeholders. For production, create custom icons at 1024x1024 resolution and generate all platform-specific formats.
