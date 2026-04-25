import type { CursorProject } from './store';

// ─── Utility ────────────────────────────────────────────────────────────────

function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── CSS export ─────────────────────────────────────────────────────────────

export function exportToCSS(project: CursorProject): string {
  const size32 = project.sizes.find((s) => s.size === 32) ?? project.sizes[0];
  const size64 = project.sizes.find((s) => s.size === 64);

  const dataUrl32 = `data:image/png;base64,${size32.data}`;
  const dataUrl64 = size64 ? `data:image/png;base64,${size64.data}` : null;

  const { x, y } = project.hotspot;

  let css = `/* MousePRO — ${project.name} */\n\n`;

  css += `/* Standard resolution */\n`;
  css += `.cursor-${project.name.toLowerCase().replace(/\s+/g, '-')} {\n`;
  css += `  cursor: url('${dataUrl32}') ${x} ${y}, auto;\n`;
  css += `}\n\n`;

  if (dataUrl64) {
    css += `/* Retina / HiDPI — use image-set() */\n`;
    css += `.cursor-${project.name.toLowerCase().replace(/\s+/g, '-')} {\n`;
    css += `  cursor: url('${dataUrl32}') ${x} ${y}, auto;\n`;
    css += `  cursor: -webkit-image-set(\n`;
    css += `    url('${dataUrl32}') 1x,\n`;
    css += `    url('${dataUrl64}') 2x\n`;
    css += `  ) ${x} ${y}, auto;\n`;
    css += `}\n\n`;
  }

  css += `/* All generated sizes:\n`;
  for (const sz of project.sizes) {
    css += `   ${sz.size}×${sz.size}: data:image/png;base64,${sz.data.slice(0, 32)}…\n`;
  }
  css += `*/\n`;

  return css;
}

// ─── macOS Mousecape .cape format ────────────────────────────────────────────

export function exportToMousecape(project: CursorProject): string {
  const representations: string[] = [];

  const size32 = project.sizes.find((s) => s.size === 32) ?? project.sizes[0];
  const size64 = project.sizes.find((s) => s.size === 64);

  representations.push(`        <dict>
          <key>Scale</key>
          <real>1</real>
          <key>Size</key>
          <string>{32, 32}</string>
          <key>PNG Data</key>
          <data>${size32.data}</data>
        </dict>`);

  if (size64) {
    representations.push(`        <dict>
          <key>Scale</key>
          <real>2</real>
          <key>Size</key>
          <string>{32, 32}</string>
          <key>PNG Data</key>
          <data>${size64.data}</data>
        </dict>`);
  }

  const id = `com.mousepro.cursor.${project.id}`;

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Cape Name</key>
  <string>${xmlEscape(project.name)}</string>
  <key>Cape Author</key>
  <string>MousePRO</string>
  <key>Cape Description</key>
  <string>Created with MousePRO — Advanced Cursor Studio</string>
  <key>Cape Version</key>
  <integer>2</integer>
  <key>MinimumVersion</key>
  <integer>2</integer>
  <key>Cursors</key>
  <array>
    <dict>
      <key>Name</key>
      <string>${xmlEscape(project.name)}</string>
      <key>Identifier</key>
      <string>${id}</string>
      <key>HotSpotX</key>
      <real>${project.hotspot.x}</real>
      <key>HotSpotY</key>
      <real>${project.hotspot.y}</real>
      <key>PointsWide</key>
      <real>32</real>
      <key>PointsHigh</key>
      <real>32</real>
      <key>FrameCount</key>
      <integer>${project.frameCount}</integer>
      <key>FrameDuration</key>
      <real>${project.frameDuration / 1000}</real>
      <key>Representations</key>
      <array>
${representations.join('\n')}
      </array>
    </dict>
  </array>
</dict>
</plist>`;

  return plist;
}

// ─── Windows .cur format ─────────────────────────────────────────────────────

export function exportToWindowsCur(project: CursorProject): Buffer {
  const size32 = project.sizes.find((s) => s.size === 32) ?? project.sizes[0];
  const pngData = base64ToBuffer(size32.data);

  // ICONDIR (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // Reserved
  header.writeUInt16LE(2, 2);  // Type: 2 = CUR
  header.writeUInt16LE(1, 4);  // Count: 1 image

  // ICONDIRENTRY (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);                         // Width
  entry.writeUInt8(32, 1);                         // Height
  entry.writeUInt8(0, 2);                          // Color count (0 = 256+)
  entry.writeUInt8(0, 3);                          // Reserved
  entry.writeUInt16LE(project.hotspot.x, 4);       // Hotspot X
  entry.writeUInt16LE(project.hotspot.y, 6);       // Hotspot Y
  entry.writeUInt32LE(pngData.length, 8);          // Bytes in resource
  entry.writeUInt32LE(22, 12);                     // Offset: 6 (header) + 16 (entry)

  return Buffer.concat([header, entry, pngData]);
}

// ─── X11 / Xcursor format (Linux) ────────────────────────────────────────────

export function exportToX11Info(project: CursorProject): string {
  return `# X11 Cursor Theme — ${project.name}
# Generated by MousePRO

[cursor]
name = ${project.name.toLowerCase().replace(/\s+/g, '_')}
hotspot_x = ${project.hotspot.x}
hotspot_y = ${project.hotspot.y}
delay = ${project.frameDuration}

# Installation:
# 1. Create ~/.icons/${project.name}/cursors/
# 2. Run: convert cursor-32.png cursor-32.xcur
#    (requires imagemagick and xcursorgen)
# 3. Copy .xcur files to the cursors directory
# 4. Restart your desktop session
`;
}

// ─── SVG cursor ──────────────────────────────────────────────────────────────

export function exportToSVGCursor(project: CursorProject): string {
  const size32 = project.sizes.find((s) => s.size === 32) ?? project.sizes[0];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="32" height="32" viewBox="0 0 32 32">
  <!-- MousePRO cursor: ${xmlEscape(project.name)} -->
  <!-- Hotspot: ${project.hotspot.x}, ${project.hotspot.y} -->
  <image width="32" height="32" xlink:href="data:image/png;base64,${size32.data}"/>
</svg>`;
}

// ─── README.md for ZIP ───────────────────────────────────────────────────────

export function generateReadme(project: CursorProject): string {
  return `# ${project.name} — Cursor Package

Created with **MousePRO** — Advanced Cursor Studio

## Hotspot
X: ${project.hotspot.x}, Y: ${project.hotspot.y}

## Contents

| File | Description |
|------|-------------|
| cursor-16.png | 16×16 cursor |
| cursor-24.png | 24×24 cursor |
| cursor-32.png | 32×32 cursor (standard) |
| cursor-48.png | 48×48 cursor |
| cursor-64.png | 64×64 cursor (2× Retina) |
| cursor-128.png | 128×128 cursor (4× Retina) |
| cursor.cur | Windows cursor file |
| cursor.cape | Mousecape (macOS) cursor file |
| cursor.css | CSS cursor snippet |
| cursor.svg | SVG cursor |
| x11-info.txt | Linux/X11 installation info |

## Installation

### macOS (Mousecape)
1. Install [Mousecape](https://github.com/alexzielenski/Mousecape)
2. Drag \`cursor.cape\` into Mousecape
3. Double-click to apply

### Windows
1. Right-click the Desktop → Personalize → Mouse Cursor
2. Click "Browse" and select \`cursor.cur\`

### Web / CSS
Add this to your stylesheet:
\`\`\`css
.my-element {
  cursor: url('cursor-32.png') ${project.hotspot.x} ${project.hotspot.y}, auto;
}
\`\`\`

### Linux (X11)
See \`x11-info.txt\` for detailed instructions.
`;
}
