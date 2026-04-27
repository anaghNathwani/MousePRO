'use strict';

const { app, BrowserWindow, Menu, shell, nativeTheme, ipcMain, dialog, systemPreferences } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3101;

let nextServerProcess = null;

// ─── Helper binary path ────────────────────────────────────────────────────

function helperPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'MousePROHelper');
  }
  return path.join(__dirname, '..', 'helper', 'MousePROHelper');
}

function helperExists() {
  try { fs.accessSync(helperPath(), fs.constants.X_OK); return true; }
  catch { return false; }
}

function mousecapeInstalled() {
  return fs.existsSync('/Applications/Mousecape.app');
}

// ─── Wait for Next.js to respond ──────────────────────────────────────────

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    const try_ = (remaining) => {
      http.get(url, () => resolve())
        .on('error', () => {
          if (remaining <= 0) return reject(new Error(`Server at ${url} never responded`));
          setTimeout(() => try_(remaining - 1), 500);
        });
    };
    try_(attempts);
  });
}

// ─── Start Next.js in production ──────────────────────────────────────────

function startProductionServer() {
  const appRoot = path.join(process.resourcesPath, 'app');
  const nextBin = path.join(appRoot, 'node_modules', '.bin', 'next');

  nextServerProcess = spawn(nextBin, ['start', '--port', String(PORT)], {
    cwd: appRoot,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  nextServerProcess.stdout.on('data', (d) => console.log('[next]', d.toString().trim()));
  nextServerProcess.stderr.on('data', (d) => console.error('[next]', d.toString().trim()));
}

// ─── Mousecape library helpers ─────────────────────────────────────────────

const MOUSECAPE_APP = '/Applications/Mousecape.app';

// Mousecape stores capes in different places depending on sandboxing
const MOUSECAPE_LIBRARY_CANDIDATES = [
  path.join(os.homedir(), 'Library', 'Application Support', 'Mousecape'),
  path.join(os.homedir(), 'Library', 'Containers', 'com.alexzielenski.Mousecape',
    'Data', 'Library', 'Application Support', 'Mousecape'),
];

function findMousecapeLibrary() {
  for (const p of MOUSECAPE_LIBRARY_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  // If neither exists yet but Mousecape is installed, use the first candidate
  // and create it so we can write there.
  if (fs.existsSync(MOUSECAPE_APP)) {
    fs.mkdirSync(MOUSECAPE_LIBRARY_CANDIDATES[0], { recursive: true });
    return MOUSECAPE_LIBRARY_CANDIDATES[0];
  }
  return null;
}

// Minimal plist parser — good enough for the .cape format we generate and read
function parseCape(xml) {
  const capeName = (xml.match(/<key>Cape Name<\/key>\s*<string>([\s\S]*?)<\/string>/) ?? [])[1]?.trim() ?? 'Unnamed';

  const cursors = [];
  // Each cursor is a <dict> inside the <key>Cursors</key> <array>
  const cursorsSection = (xml.match(/<key>Cursors<\/key>\s*<array>([\s\S]*?)<\/array>/) ?? [])[1] ?? '';
  const dicts = cursorsSection.match(/<dict>[\s\S]*?<\/dict>/g) ?? [];

  for (const dict of dicts) {
    const name = (dict.match(/<key>Name<\/key>\s*<string>([\s\S]*?)<\/string>/) ?? [])[1]?.trim();
    const hotspotX = parseFloat((dict.match(/<key>HotSpotX<\/key>\s*<real>([\d.]+)<\/real>/) ?? [])[1] ?? '0');
    const hotspotY = parseFloat((dict.match(/<key>HotSpotY<\/key>\s*<real>([\d.]+)<\/real>/) ?? [])[1] ?? '0');

    // Collect representations
    const repSection = (dict.match(/<key>Representations<\/key>\s*<array>([\s\S]*?)<\/array>/) ?? [])[1] ?? '';
    const repDicts = repSection.match(/<dict>[\s\S]*?<\/dict>/g) ?? [];

    const sizes = [];
    for (const rep of repDicts) {
      const scale = parseFloat((rep.match(/<key>Scale<\/key>\s*<real>([\d.]+)<\/real>/) ?? [])[1] ?? '1');
      const pngData = (rep.match(/<key>PNG Data<\/key>\s*<data>([\s\S]*?)<\/data>/) ?? [])[1]?.replace(/\s/g, '');
      if (pngData) {
        // scale 1 = 32px, scale 2 = 64px (standard Mousecape sizes)
        sizes.push({ size: scale === 2 ? 64 : 32, data: pngData });
      }
    }

    if (name && sizes.length > 0) {
      cursors.push({ name, hotspot: { x: hotspotX, y: hotspotY }, sizes, preview: sizes[0].data });
    }
  }

  return { name: capeName, cursors };
}

// ─── Mousecape IPC handlers ────────────────────────────────────────────────

ipcMain.handle('mousecape:status', async () => {
  const installed = fs.existsSync(MOUSECAPE_APP);
  const libraryPath = findMousecapeLibrary();

  const sets = [];
  if (libraryPath) {
    const files = fs.readdirSync(libraryPath).filter((f) => f.endsWith('.cape'));
    for (const file of files) {
      const filePath = path.join(libraryPath, file);
      try {
        const xml = fs.readFileSync(filePath, 'utf8');
        const parsed = parseCape(xml);
        sets.push({
          id: file,
          name: parsed.name,
          path: filePath,
          // Send only the first cursor's preview image to keep payload small
          preview: parsed.cursors[0]?.preview ?? null,
          cursorCount: parsed.cursors.length,
        });
      } catch { /* skip malformed files */ }
    }
  }

  return { installed, libraryPath, sets };
});

ipcMain.handle('mousecape:push', async (_event, { capeXML, name }) => {
  const libraryPath = findMousecapeLibrary();
  const safeName = name.replace(/[^a-z0-9_-]/gi, '_');

  if (libraryPath) {
    const capePath = path.join(libraryPath, `${safeName}.cape`);
    fs.writeFileSync(capePath, capeXML, 'utf8');
    // Open the file in Mousecape so it registers and shows in its list
    await execAsync(`open -a '${MOUSECAPE_APP}' '${capePath}'`).catch(() => {});
    return { success: true, method: 'library', capePath };
  }

  // No library — open from temp
  const tmpPath = path.join(os.tmpdir(), `${safeName}.cape`);
  fs.writeFileSync(tmpPath, capeXML, 'utf8');
  await execAsync(`open -a '${MOUSECAPE_APP}' '${tmpPath}'`).catch(() => {});
  return { success: true, method: 'open', capePath: tmpPath };
});

ipcMain.handle('mousecape:remove', async (_event, { capePath }) => {
  try {
    fs.unlinkSync(capePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('mousecape:launch', async () => {
  await execAsync(`open -a '${MOUSECAPE_APP}'`).catch(() => {});
  return { success: true };
});

ipcMain.handle('mousecape:read-set', async (_event, { capePath }) => {
  try {
    const xml = fs.readFileSync(capePath, 'utf8');
    return { success: true, ...parseCape(xml) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── IPC: cursor application ────────────────────────────────────────────────

ipcMain.handle('cursor:check', async () => {
  const hasHelper = helperExists();
  const hasMousecape = mousecapeInstalled();
  // Ask Electron directly — this is the only reliable way to check AX trust
  // on macOS (subprocess checks are ignored by the OS).
  const accessibilityTrusted = systemPreferences.isTrustedAccessibilityClient(false);
  return { hasHelper, hasMousecape, accessibilityTrusted };
});

ipcMain.handle('cursor:request-permission', async () => {
  // Passing true triggers the macOS permission dialog from the Electron
  // process, which is what macOS requires — child processes cannot prompt.
  const granted = systemPreferences.isTrustedAccessibilityClient(true);
  return { granted };
});

ipcMain.handle('cursor:apply', async (_event, { imageBase64, hotspotX, hotspotY, size }) => {
  // Write PNG to a temp file
  const tmpDir = os.tmpdir();
  const tmpImg = path.join(tmpDir, `mousepro-cursor-${Date.now()}.png`);

  try {
    fs.writeFileSync(tmpImg, Buffer.from(imageBase64, 'base64'));

    // ── Method 1: native Swift helper ─────────────────────────────────────
    if (helperExists()) {
      try {
        const { stdout, stderr } = await execAsync(
          `"${helperPath()}" "${tmpImg}" ${hotspotX} ${hotspotY} ${size}`
        );
        const out = (stdout + stderr).trim();

        if (out.startsWith('ok:native')) {
          return { success: true, method: 'native', detail: 'Applied system-wide via CGS API' };
        }
        if (out.startsWith('ok:process')) {
          return { success: true, method: 'process', detail: 'Applied to MousePRO window (grant Accessibility for system-wide)' };
        }
        if (out.startsWith('error:accessibility')) {
          return { success: false, reason: 'accessibility', detail: 'Grant Accessibility permission in System Settings → Privacy & Security → Accessibility' };
        }
        throw new Error(out);
      } catch (e) {
        if (e.message.includes('accessibility')) {
          return { success: false, reason: 'accessibility', detail: 'Grant Accessibility permission in System Settings → Privacy & Security → Accessibility' };
        }
        // Helper failed — fall through to Mousecape
      }
    }

    // ── Method 2: Mousecape ──────────────────────────────────────────────
    if (mousecapeInstalled()) {
      // Write a minimal .cape plist and open it in Mousecape
      const capePath = path.join(tmpDir, `mousepro-${Date.now()}.cape`);
      const cape = buildCapeXML({ imageBase64, hotspotX, hotspotY, size });
      fs.writeFileSync(capePath, cape, 'utf8');

      await execAsync(`open -a '/Applications/Mousecape.app' '${capePath}'`);
      return { success: true, method: 'mousecape', detail: 'Opened in Mousecape — click Apply in Mousecape to activate' };
    }

    // ── No method available ──────────────────────────────────────────────
    return {
      success: false,
      reason: 'no-method',
      detail: 'Build the native helper (helper/build.sh on macOS) or install Mousecape',
    };
  } finally {
    try { fs.unlinkSync(tmpImg); } catch { /* ignore */ }
  }
});

ipcMain.handle('cursor:reset', async () => {
  if (!helperExists()) return { success: false };
  // Apply the default arrow cursor by pointing at the system cursor file
  const systemCursor = '/System/Library/Frameworks/ApplicationServices.framework/Versions/A/Frameworks/HIServices.framework/Versions/A/Resources/cursors/arrow/cursor.pdf';
  if (fs.existsSync(systemCursor)) {
    try {
      await execAsync(`"${helperPath()}" "${systemCursor}" 0 0 32`);
      return { success: true };
    } catch { /* fall through */ }
  }
  return { success: false };
});

// ─── Build .cape XML for Mousecape ─────────────────────────────────────────

function buildCapeXML({ imageBase64, hotspotX, hotspotY, size }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Cape Name</key><string>MousePRO Export</string>
  <key>Cape Author</key><string>MousePRO</string>
  <key>Cape Version</key><integer>2</integer>
  <key>MinimumVersion</key><integer>2</integer>
  <key>Cursors</key>
  <array>
    <dict>
      <key>Name</key><string>Custom Cursor</string>
      <key>Identifier</key><string>com.mousepro.custom.${Date.now()}</string>
      <key>HotSpotX</key><real>${hotspotX}</real>
      <key>HotSpotY</key><real>${hotspotY}</real>
      <key>PointsWide</key><real>${size}</real>
      <key>PointsHigh</key><real>${size}</real>
      <key>FrameCount</key><integer>1</integer>
      <key>FrameDuration</key><real>1</real>
      <key>Representations</key>
      <array>
        <dict>
          <key>Scale</key><real>1</real>
          <key>PNG Data</key>
          <data>${imageBase64}</data>
        </dict>
      </array>
    </dict>
  </array>
</dict>
</plist>`;
}

// ─── Create main window ────────────────────────────────────────────────────

async function createWindow() {
  nativeTheme.themeSource = 'dark';

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 620,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#060610',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      header {
        padding-left: 80px !important;
        -webkit-app-region: drag;
      }
      header button,
      header a,
      header input,
      header label,
      header select {
        -webkit-app-region: no-drag;
      }
    `);
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (!isDev) startProductionServer();

  try {
    await waitForServer(`http://localhost:${PORT}`);
  } catch (err) {
    console.error(err.message);
  }

  win.loadURL(`http://localhost:${PORT}`);
  return win;
}

// ─── macOS-native menu bar ─────────────────────────────────────────────────

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Image…',
          accelerator: 'CmdOrCtrl+O',
          click: (_, win) => win?.webContents.executeJavaScript(
            'document.querySelector(\'input[type="file"]\')?.click()'
          ),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        ...(isDev ? [{ role: 'toggleDevTools', accelerator: 'F12' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  buildMenu();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (nextServerProcess) nextServerProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextServerProcess) nextServerProcess.kill();
});
