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
