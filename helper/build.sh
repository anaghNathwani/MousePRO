#!/usr/bin/env bash
# Build the MousePROHelper native binary.
# Run this on macOS (requires Xcode command-line tools: xcode-select --install).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SCRIPT_DIR/MousePROHelper"

echo "Building MousePROHelper..."

swiftc \
  -O \
  -target arm64-apple-macosx12.0 \
  -Xlinker -framework -Xlinker AppKit \
  -Xlinker -framework -Xlinker CoreGraphics \
  -Xlinker -framework -Xlinker Foundation \
  "$SCRIPT_DIR/MousePROHelper.swift" \
  -o "$OUT-arm64"

swiftc \
  -O \
  -target x86_64-apple-macosx12.0 \
  -Xlinker -framework -Xlinker AppKit \
  -Xlinker -framework -Xlinker CoreGraphics \
  -Xlinker -framework -Xlinker Foundation \
  "$SCRIPT_DIR/MousePROHelper.swift" \
  -o "$OUT-x86_64"

# Create universal binary
lipo -create "$OUT-arm64" "$OUT-x86_64" -output "$OUT"
rm "$OUT-arm64" "$OUT-x86_64"

chmod +x "$OUT"
echo "✓ Built universal binary: $OUT"
echo ""
echo "Next steps:"
echo "  1. Sign if distributing: codesign --sign - --entitlements helper/entitlements.plist $OUT"
echo "  2. Copy into electron-builder resources: already configured in package.json"
echo "  3. Run: npm run electron-dev"
