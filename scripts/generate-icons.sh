#!/bin/bash
# Icon generation helper script
# This script helps generate platform-specific icons from a single source image

set -e

echo "MDL Icon Generator"
echo "=================="
echo ""

# Check if source image is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/generate-icons.sh <source-image.png>"
    echo ""
    echo "The source image should be at least 1024x1024 pixels."
    echo ""
    echo "Example:"
    echo "  ./scripts/generate-icons.sh my-logo.png"
    exit 1
fi

SOURCE_IMAGE="$1"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image '$SOURCE_IMAGE' not found!"
    exit 1
fi

# Check if we have the necessary tools
HAS_CONVERT=false
HAS_SIPS=false
HAS_ICONUTIL=false

if command -v convert &> /dev/null; then
    HAS_CONVERT=true
    echo "✓ ImageMagick (convert) found"
fi

if command -v sips &> /dev/null; then
    HAS_SIPS=true
    echo "✓ sips found (macOS)"
fi

if command -v iconutil &> /dev/null; then
    HAS_ICONUTIL=true
    echo "✓ iconutil found (macOS)"
fi

echo ""

# Create assets directory if it doesn't exist
mkdir -p assets

# Generate PNG icon
echo "Generating PNG icon for Linux..."
if [ "$HAS_CONVERT" = true ]; then
    convert "$SOURCE_IMAGE" -resize 512x512 assets/icon.png
    echo "✓ Created assets/icon.png"
elif [ "$HAS_SIPS" = true ]; then
    sips -z 512 512 "$SOURCE_IMAGE" --out assets/icon.png &> /dev/null
    echo "✓ Created assets/icon.png"
else
    cp "$SOURCE_IMAGE" assets/icon.png
    echo "⚠ Copied source image (install ImageMagick for proper resizing)"
fi

# Generate Windows ICO
echo ""
echo "Generating Windows ICO..."
if [ "$HAS_CONVERT" = true ]; then
    convert "$SOURCE_IMAGE" -define icon:auto-resize=256,128,96,64,48,32,16 assets/icon.ico
    echo "✓ Created assets/icon.ico"
else
    echo "⚠ Skipped: Install ImageMagick to generate .ico files"
    echo "  You can use: https://cloudconvert.com/png-to-ico"
fi

# Generate macOS ICNS
echo ""
echo "Generating macOS ICNS..."
if [ "$HAS_ICONUTIL" = true ]; then
    # Create iconset directory
    mkdir -p assets/icon.iconset
    
    # Generate all required sizes for macOS
    SIZES=(16 32 64 128 256 512)
    for size in "${SIZES[@]}"; do
        size2x=$((size * 2))
        if [ "$HAS_SIPS" = true ]; then
            sips -z $size $size "$SOURCE_IMAGE" --out "assets/icon.iconset/icon_${size}x${size}.png" &> /dev/null
            sips -z $size2x $size2x "$SOURCE_IMAGE" --out "assets/icon.iconset/icon_${size}x${size}@2x.png" &> /dev/null
        elif [ "$HAS_CONVERT" = true ]; then
            convert "$SOURCE_IMAGE" -resize ${size}x${size} "assets/icon.iconset/icon_${size}x${size}.png"
            convert "$SOURCE_IMAGE" -resize ${size2x}x${size2x} "assets/icon.iconset/icon_${size}x${size}@2x.png"
        fi
    done
    
    # Convert iconset to icns
    iconutil -c icns assets/icon.iconset -o assets/icon.icns
    rm -rf assets/icon.iconset
    echo "✓ Created assets/icon.icns"
elif [ "$HAS_CONVERT" = true ]; then
    # Fallback: use ImageMagick (may not work perfectly)
    convert "$SOURCE_IMAGE" -resize 512x512 assets/icon.icns
    echo "⚠ Created assets/icon.icns (may need proper iconutil conversion)"
else
    echo "⚠ Skipped: macOS iconutil not available"
    echo "  Run this script on macOS or use: https://cloudconvert.com/png-to-icns"
fi

echo ""
echo "✅ Icon generation complete!"
echo ""
echo "Generated files in assets/:"
ls -lh assets/icon.* 2>/dev/null || true
echo ""
echo "You can now build your Electron app:"
echo "  npm run electron:build"
