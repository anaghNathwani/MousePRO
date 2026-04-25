'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal safe API to the renderer if needed
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
