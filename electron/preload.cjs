const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    version: process.versions.electron,
    savePdf: (options) => ipcRenderer.invoke('save-pdf', options)
});
