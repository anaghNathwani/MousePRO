'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // ── System cursor ───────────────────────────────────────────────────────
  checkCursorSupport: () => ipcRenderer.invoke('cursor:check'),
  requestAccessibility: () => ipcRenderer.invoke('cursor:request-permission'),
  applyCursor: (imageBase64, hotspotX, hotspotY, size) =>
    ipcRenderer.invoke('cursor:apply', { imageBase64, hotspotX, hotspotY, size }),
  resetCursor: () => ipcRenderer.invoke('cursor:reset'),

  // ── Mousecape integration ───────────────────────────────────────────────
  mousecape: {
    // { installed, libraryPath, sets: [{id, name, path, cursors: [{name, preview}]}] }
    status: () => ipcRenderer.invoke('mousecape:status'),

    // Write a cursor to Mousecape's library and open it in Mousecape
    // Returns { success, method: 'library'|'open', capePath }
    push: (capeXML, name) => ipcRenderer.invoke('mousecape:push', { capeXML, name }),

    // Delete a .cape file from Mousecape's library by path
    remove: (capePath) => ipcRenderer.invoke('mousecape:remove', { capePath }),

    // Open Mousecape.app
    launch: () => ipcRenderer.invoke('mousecape:launch'),

    // Read full cursor data from a .cape file for importing into MousePRO
    // Returns { name, cursors: [{name, sizes: [{size, data}], hotspot}] }
    readSet: (capePath) => ipcRenderer.invoke('mousecape:read-set', { capePath }),
  },
});
