'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Check helper binary + Accessibility permission status
  checkCursorSupport: () => ipcRenderer.invoke('cursor:check'),

  // Prompt macOS to show the Accessibility permission dialog
  requestAccessibility: () => ipcRenderer.invoke('cursor:request-permission'),

  // Apply a cursor system-wide
  // imageBase64: base64-encoded PNG string (no data: prefix)
  // hotspotX/Y: pixel coordinates
  // size: target pixel size (32 recommended)
  applyCursor: (imageBase64, hotspotX, hotspotY, size) =>
    ipcRenderer.invoke('cursor:apply', { imageBase64, hotspotX, hotspotY, size }),

  // Reset to the macOS default arrow cursor
  resetCursor: () => ipcRenderer.invoke('cursor:reset'),
});
