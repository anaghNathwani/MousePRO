# MousePRO — Advanced Cursor Studio

A macOS desktop app for creating and applying custom cursors. Drop any image, get a pixel-perfect cursor at every size, preview it live, and apply it system-wide — no Mousecape required.

---

## Features

- **Upload anything** — PNG, JPG, GIF, WEBP, SVG, ICO up to 20MB
- **7 sizes auto-generated** — 16px through 256px in one upload
- **Smart processing** — background removal, edge sharpening, color tinting
- **GIF animation support** — extracts frames and preserves timing for animated cursors
- **Auto hotspot detection** — finds the tip of arrow-shaped cursors automatically
- **Interactive hotspot editor** — click the canvas to reposition, or use sliders
- **Live in-browser preview** — cursor actually applies via CSS as you move your mouse; 5 background modes + trail effect
- **Apply to system** — replaces the cursor system-wide using the same private CGS API as Mousecape; falls back to Mousecape if installed
- **5 export formats** — ZIP package, macOS `.cape`, Windows `.cur`, CSS snippet, SVG

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
git clone https://github.com/anaghnathwani/mousepro
cd mousepro
npm install
npm run electron-dev
```

This starts Next.js and the Electron window simultaneously. The app opens as a native macOS window with traffic light controls and a draggable title bar.

---

## Apply to System

MousePRO can replace your cursor system-wide without needing Mousecape. It works in three tiers:

| Tier | Requirement | What happens |
|------|-------------|--------------|
| **Native** | Helper binary built + Accessibility permission | Calls `CGSSetConnectionProperty` — cursor changes instantly everywhere |
| **Mousecape** | Mousecape.app in `/Applications` | Writes a `.cape` file and opens it in Mousecape automatically |
| **Fallback** | Neither | Clear instructions shown inline |

### Building the native helper (recommended)

The helper is a small Swift CLI tool that calls the private CoreGraphics API macOS uses internally for cursor replacement. Build it once on your Mac:

```bash
cd helper
bash build.sh
```

This compiles a universal binary (Apple Silicon + Intel) at `helper/MousePROHelper`. The app detects it automatically on next launch.

After building, open **System Settings → Privacy & Security → Accessibility** and add MousePRO. The app will prompt you for this automatically when you first click "Apply to System".

### Resetting to the default cursor

After applying a custom cursor, a **Reset to default** button appears beneath the Apply button. Click it to restore the macOS arrow cursor.

---

## Building a distributable `.app`

```bash
npm run electron-build
```

Produces a universal `.dmg` (arm64 + x86_64) in `dist/`. The native helper binary is bundled automatically if it exists at `helper/MousePROHelper`.

To sign the helper before distributing:

```bash
codesign --sign - --entitlements helper/entitlements.plist helper/MousePROHelper
```

---

## Export Formats

| Format | File | Use case |
|--------|------|----------|
| **ZIP package** | `.zip` | Everything — all sizes, all formats, README |
| **macOS Mousecape** | `.cape` | Import into Mousecape for system-wide application |
| **Windows cursor** | `.cur` | Native Windows cursor with embedded hotspot |
| **CSS snippet** | `.css` | Drop into any web project; includes `image-set()` for Retina |
| **SVG cursor** | `.svg` | Vector wrapper with hotspot comment |

---

## Processing Options

Found in the sidebar under **Processing Options**:

| Option | What it does |
|--------|-------------|
| **Remove Background** | Flood-fills from image edges to detect and erase solid backgrounds |
| **Sharpen Edges** | Applies Lanczos3 + unsharp mask — improves clarity at small sizes |
| **Normalize Alpha** | Adjusts contrast and brightness of the alpha channel |
| **Tint Color** | Applies a color tint across the cursor image |

Options apply to new uploads. Re-upload an image to reprocess it with different settings.

---

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run electron-dev` | Start Electron app with hot reload |
| `npm run dev` | Next.js only (browser, no Electron) |
| `npm run build` | Build Next.js for production |
| `npm run electron-build` | Build Next.js + package `.dmg` |

---

## Tech Stack

- **Electron 31** — macOS app shell, IPC, native helper invocation
- **Next.js 14** — UI and API routes (runs inside Electron)
- **Sharp** — Server-side image processing and resizing
- **Framer Motion** — Animations
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **Swift** — Native cursor helper (`helper/MousePROHelper.swift`)
