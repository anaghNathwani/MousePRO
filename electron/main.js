'use strict';

const { app, BrowserWindow, Menu, shell, nativeTheme } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3101;

let nextServerProcess = null;

// ─── Wait for Next.js to respond ────────────────────────────────────────────

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

// ─── Start Next.js in production ────────────────────────────────────────────

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

// ─── Create main window ──────────────────────────────────────────────────────

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

  // Inject CSS to:
  //  1. Make the header draggable (native window drag)
  //  2. Push content right of the macOS traffic lights
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

  // Route external links to the default browser
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

// ─── macOS-native menu bar ───────────────────────────────────────────────────

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

// ─── Lifecycle ───────────────────────────────────────────────────────────────

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
