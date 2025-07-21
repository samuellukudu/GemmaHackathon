import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  exportData: (format: string) => ipcRenderer.invoke('fs:export-data', format),
  importData: (path: string) => ipcRenderer.invoke('fs:import-data', path),
  
  // App settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  
  // Native OS
  showNotification: (options: any) => ipcRenderer.invoke('os:show-notification', options),
  openExternal: (url: string) => ipcRenderer.invoke('os:open-external', url),
  
  // Data management
  createBackup: () => ipcRenderer.invoke('data:backup'),
  restoreBackup: (path: string) => ipcRenderer.invoke('data:restore', path),
  exportProgress: (topicId: string) => ipcRenderer.invoke('data:export-progress', topicId)
});