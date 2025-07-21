# Electron Desktop App Development Plan

## Overview
This document outlines the comprehensive plan for converting the existing Next.js web application into an offline-capable desktop application using Electron. The app is an AI-powered learning platform with explanations, flashcards, and quizzes that currently uses IndexedDB for offline storage.

## Current Architecture Analysis

### Existing Features
- **Next.js 15** with React 19 and TypeScript
- **Offline-first design** with IndexedDB storage
- **PWA capabilities** with manifest.json
- **UI Components**: Radix UI components with Tailwind CSS
- **Core Features**:
  - AI-powered explanations
  - Interactive flashcards
  - Quiz system with scoring
  - Progress tracking
  - Offline data management
  - User statistics and streaks

### Current Offline Infrastructure
- **IndexedDB wrapper** (`lib/db.ts`) for local storage
- **OfflineManager** (`lib/offline-manager.ts`) for sync management
- **API client** with offline fallbacks
- **Custom hooks** for data management

## Phase 1: Project Setup and Configuration

### 1.1 Electron Project Structure
```
frontend/
├── electron/
│   ├── main/
│   │   ├── main.ts                 # Main process entry point
│   │   ├── preload.ts              # Preload script for security
│   │   └── ipc-handlers.ts         # IPC communication handlers
│   ├── renderer/                   # Next.js app (existing)
│   ├── shared/
│   │   ├── types.ts               # Shared TypeScript types
│   │   └── constants.ts           # Shared constants
│   └── assets/
│       ├── icons/                 # App icons for different platforms
│       └── splash/                # Splash screen assets
├── package.json                   # Updated with Electron dependencies
├── electron-builder.json          # Build configuration
└── .env.electron                  # Electron-specific environment variables
```

### 1.2 Dependencies to Add
```json
{
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "@types/electron": "^1.6.10",
    "concurrently": "^8.0.0",
    "wait-on": "^7.0.0",
    "cross-env": "^7.0.3"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "electron-updater": "^6.1.0",
    "electron-log": "^5.0.0"
  }
}
```

### 1.3 Package.json Scripts
```json
{
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:pack": "npm run build && electron-builder --dir",
    "electron:dist": "npm run build && electron-builder --publish=never",
    "electron:dist:win": "npm run build && electron-builder --win",
    "electron:dist:mac": "npm run build && electron-builder --mac",
    "electron:dist:linux": "npm run build && electron-builder --linux"
  }
}
```

## Phase 2: Core Electron Implementation

### 2.1 Main Process (main.ts)
**Responsibilities:**
- Create and manage application windows
- Handle app lifecycle events
- Manage IPC communication
- Handle file system operations
- Manage auto-updates
- Handle deep linking (if needed)

**Key Features:**
- Single instance lock
- Window state persistence
- Native menu integration
- System tray support (optional)
- Crash reporting

### 2.2 Preload Script (preload.ts)
**Security Bridge:**
- Expose safe APIs to renderer process
- Handle IPC communication
- Provide native OS integration
- Manage file system access
- Handle clipboard operations

### 2.3 IPC Handlers (ipc-handlers.ts)
**Communication Layer:**
- File system operations
- App settings management
- Data export/import
- Native dialog handling
- System information

## Phase 2.5: API Implementation Strategy

### 2.5.1 API Architecture Overview
The desktop app will implement a hybrid API approach that combines:
- **Local API Layer**: Electron IPC-based API for desktop-specific operations
- **Remote API Layer**: HTTP-based API for cloud sync and external services
- **Offline API Layer**: Local storage-based API for offline functionality

### 2.5.2 Local API Implementation (IPC-based)

#### Core IPC Channels
```typescript
// electron/shared/api-types.ts
export interface LocalAPI {
  // File System Operations
  'fs:read-file': (path: string) => Promise<string>
  'fs:write-file': (path: string, content: string) => Promise<void>
  'fs:export-data': (format: 'json' | 'csv' | 'pdf') => Promise<string>
  'fs:import-data': (path: string) => Promise<ImportResult>
  
  // App Settings
  'settings:get': (key: string) => Promise<any>
  'settings:set': (key: string, value: any) => Promise<void>
  'settings:get-all': () => Promise<AppSettings>
  
  // Native OS Integration
  'os:show-notification': (options: NotificationOptions) => Promise<void>
  'os:open-external': (url: string) => Promise<void>
  'os:get-system-info': () => Promise<SystemInfo>
  
  // Data Management
  'data:backup': () => Promise<BackupResult>
  'data:restore': (backupPath: string) => Promise<RestoreResult>
  'data:export-progress': (topicId: string) => Promise<string>
}
```

#### IPC Handler Implementation
```typescript
// electron/main/ipc-handlers.ts
import { ipcMain, dialog, shell, app } from 'electron'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'

export function setupIPCHandlers() {
  // File System Operations
  ipcMain.handle('fs:read-file', async (event, path: string) => {
    try {
      const content = await readFile(path, 'utf-8')
      return content
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`)
    }
  })

  ipcMain.handle('fs:write-file', async (event, path: string, content: string) => {
    try {
      await writeFile(path, content, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`)
    }
  })

  ipcMain.handle('fs:export-data', async (event, format: string) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Data',
      defaultPath: `ai-explainer-export.${format}`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    })
    
    if (filePath) {
      // Implementation for data export
      return filePath
    }
    throw new Error('Export cancelled')
  })

  // App Settings
  ipcMain.handle('settings:get', async (event, key: string) => {
    return app.getPath('userData') // Use electron-store for persistence
  })

  // Native OS Integration
  ipcMain.handle('os:show-notification', async (event, options) => {
    // Implementation for native notifications
  })

  ipcMain.handle('os:open-external', async (event, url: string) => {
    await shell.openExternal(url)
  })
}
```

### 2.5.3 Remote API Implementation

#### API Client Enhancement
```typescript
// lib/api-client-desktop.ts
import { invoke } from '@tauri-apps/api/tauri' // or electron IPC

export class DesktopAPIClient {
  private baseURL: string
  private isOnline: boolean = true

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    this.checkOnlineStatus()
  }

  private async checkOnlineStatus() {
    try {
      const response = await fetch(`${this.baseURL}/health`, { 
        method: 'GET',
        timeout: 5000 
      })
      this.isOnline = response.ok
    } catch {
      this.isOnline = false
    }
  }

  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isOnline) {
      return this.handleOfflineRequest<T>(endpoint, options)
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      return this.handleOfflineRequest<T>(endpoint, options)
    }
  }

  private async handleOfflineRequest<T>(
    endpoint: string, 
    options: RequestInit
  ): Promise<T> {
    // Implement offline fallback logic
    switch (endpoint) {
      case '/api/explanations':
        return this.getLocalExplanations()
      case '/api/flashcards':
        return this.getLocalFlashcards()
      case '/api/quiz':
        return this.getLocalQuiz()
      default:
        throw new Error('Endpoint not available offline')
    }
  }

  // Offline data retrieval methods
  private async getLocalExplanations() {
    // Query IndexedDB for cached explanations
  }

  private async getLocalFlashcards() {
    // Query IndexedDB for cached flashcards
  }

  private async getLocalQuiz() {
    // Query IndexedDB for cached quiz data
  }
}
```

### 2.5.4 Offline API Implementation

#### Enhanced OfflineManager
```typescript
// lib/offline-manager-desktop.ts
import { offlineDB } from './db'
import { invoke } from '@tauri-apps/api/tauri'

export class DesktopOfflineManager {
  private apiClient: DesktopAPIClient
  private syncQueue: SyncItem[] = []

  constructor() {
    this.apiClient = new DesktopAPIClient()
    this.setupSyncQueue()
  }

  // Enhanced sync capabilities
  async syncWithCloud() {
    if (!this.isOnline()) return

    const pendingItems = await this.getPendingSyncItems()
    
    for (const item of pendingItems) {
      try {
        await this.syncItem(item)
        await this.markItemSynced(item.id)
      } catch (error) {
        console.error('Sync failed for item:', item, error)
      }
    }
  }

  // File system integration
  async exportUserData(format: 'json' | 'csv' | 'pdf') {
    const data = await this.gatherUserData()
    
    switch (format) {
      case 'json':
        return await invoke('fs:write-file', {
          content: JSON.stringify(data, null, 2),
          format: 'json'
        })
      case 'csv':
        return await this.exportToCSV(data)
      case 'pdf':
        return await this.exportToPDF(data)
    }
  }

  async importUserData(filePath: string) {
    const content = await invoke('fs:read-file', { path: filePath })
    const data = JSON.parse(content)
    
    await this.validateImportData(data)
    await this.importData(data)
    
    return { success: true, importedItems: data.length }
  }

  // Backup and restore
  async createBackup() {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: app.getVersion(),
      data: await this.gatherUserData()
    }

    const backupPath = await invoke('fs:export-data', {
      content: JSON.stringify(backupData, null, 2),
      format: 'json',
      filename: `backup-${Date.now()}.json`
    })

    return backupPath
  }

  async restoreFromBackup(backupPath: string) {
    const backupData = await invoke('fs:read-file', { path: backupPath })
    const parsed = JSON.parse(backupData)
    
    await this.validateBackupData(parsed)
    await this.clearCurrentData()
    await this.importData(parsed.data)
    
    return { success: true, restoredItems: parsed.data.length }
  }

  private async gatherUserData() {
    const [topics, quizResults, userStats, explanations] = await Promise.all([
      offlineDB.getTopics(),
      offlineDB.getQuizResults(),
      offlineDB.getUserStats(),
      offlineDB.getAllExplanations()
    ])

    return {
      topics,
      quizResults,
      userStats,
      explanations,
      exportDate: new Date().toISOString()
    }
  }
}
```

### 2.5.5 API Integration Strategy

#### Preload Script API Exposure
```typescript
// electron/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

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
})
```

#### React Hook Integration
```typescript
// hooks/use-desktop-api.ts
import { useState, useEffect } from 'react'

declare global {
  interface Window {
    electronAPI: {
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      exportData: (format: string) => Promise<string>
      importData: (path: string) => Promise<any>
      getSetting: (key: string) => Promise<any>
      setSetting: (key: string, value: any) => Promise<void>
      showNotification: (options: any) => Promise<void>
      openExternal: (url: string) => Promise<void>
      createBackup: () => Promise<string>
      restoreBackup: (path: string) => Promise<any>
      exportProgress: (topicId: string) => Promise<string>
    }
  }
}

export function useDesktopAPI() {
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(!!window.electronAPI)
  }, [])

  const exportUserData = async (format: 'json' | 'csv' | 'pdf') => {
    if (!isElectron) {
      throw new Error('Export only available in desktop app')
    }
    return await window.electronAPI.exportData(format)
  }

  const importUserData = async (filePath: string) => {
    if (!isElectron) {
      throw new Error('Import only available in desktop app')
    }
    return await window.electronAPI.importData(filePath)
  }

  const createBackup = async () => {
    if (!isElectron) {
      throw new Error('Backup only available in desktop app')
    }
    return await window.electronAPI.createBackup()
  }

  const showNotification = async (title: string, body: string) => {
    if (!isElectron) return
    await window.electronAPI.showNotification({ title, body })
  }

  return {
    isElectron,
    exportUserData,
    importUserData,
    createBackup,
    showNotification,
    // ... other desktop-specific methods
  }
}
```

### 2.5.6 API Configuration Management

#### Environment-Specific Configuration
```typescript
// lib/config-desktop.ts
export const DesktopConfig = {
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 10000,
    retryAttempts: 3,
    offlineFallback: true
  },
  
  sync: {
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    batchSize: 50
  },
  
  storage: {
    maxBackupSize: 100 * 1024 * 1024, // 100MB
    backupRetention: 30, // days
    autoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  desktop: {
    enableSystemTray: true,
    enableGlobalShortcuts: true,
    enableNativeNotifications: true,
    enableAutoUpdates: true
  }
}
```

## Phase 3: Next.js Integration

### 3.1 Build Configuration
- **Static Export**: Configure Next.js for static export
- **Base Path**: Set appropriate base path for Electron
- **Asset Optimization**: Optimize for desktop performance
- **Environment Variables**: Handle Electron-specific configs

### 3.2 Next.js Configuration Updates
```javascript
// next.config.mjs
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Electron-specific optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  }
}
```

### 3.3 App Shell Modifications
- **Window Management**: Handle window resize, minimize, maximize
- **Native Integration**: Add native menu items
- **Offline Detection**: Enhanced offline detection for desktop
- **File System Access**: Add file import/export capabilities

## Phase 4: Enhanced Offline Capabilities

### 4.1 Data Persistence Strategy
- **Primary**: IndexedDB (existing)
- **Secondary**: Electron Store for app settings
- **Backup**: Local file system for data export
- **Sync**: Optional cloud sync when online

### 4.2 Enhanced OfflineManager
**New Features:**
- File system backup/restore
- Data export to JSON/CSV
- Import from external files
- Automatic backup scheduling
- Data integrity checks

### 4.3 File System Integration
- **Export Progress**: Save progress reports as PDF/HTML
- **Import Content**: Load external learning materials
- **Backup Management**: Automatic and manual backups
- **Data Migration**: Import from web version

## Phase 5: Desktop-Specific Features

### 5.1 Native OS Integration
- **System Tray**: Quick access to app features
- **Global Shortcuts**: Keyboard shortcuts for common actions
- **Native Notifications**: OS-level notifications
- **File Associations**: Open specific file types
- **Drag & Drop**: Import files via drag and drop

### 5.2 Enhanced UI/UX
- **Native Window Controls**: Custom title bar integration
- **Context Menus**: Right-click context menus
- **Keyboard Navigation**: Enhanced keyboard shortcuts
- **Accessibility**: Native accessibility features
- **High DPI Support**: Retina display optimization

### 5.3 Performance Optimizations
- **Memory Management**: Efficient memory usage
- **Startup Time**: Fast app startup
- **Background Processing**: Efficient background tasks
- **Resource Loading**: Optimized asset loading

## Phase 6: Build and Distribution

### 6.1 Electron Builder Configuration
```json
{
  "appId": "com.aiexplainer.desktop",
  "productName": "AI Explainer Desktop",
  "directories": {
    "output": "dist"
  },
  "files": [
    "out/**/*",
    "electron/main/**/*",
    "node_modules/**/*"
  ],
  "mac": {
    "category": "public.app-category.education",
    "icon": "assets/icons/icon.icns"
  },
  "win": {
    "icon": "assets/icons/icon.ico",
    "target": ["nsis", "portable"]
  },
  "linux": {
    "icon": "assets/icons/icon.png",
    "target": ["AppImage", "deb"]
  }
}
```

### 6.2 Code Signing
- **macOS**: Apple Developer Certificate
- **Windows**: Code signing certificate
- **Linux**: GPG signing (optional)

### 6.3 Auto-Updates
- **Update Server**: Set up update distribution
- **Update Channels**: Stable, beta, alpha channels
- **Update Notifications**: User-friendly update prompts
- **Rollback Capability**: Automatic rollback on failure

## Phase 7: Testing and Quality Assurance

### 7.1 Testing Strategy
- **Unit Tests**: Existing Jest tests
- **Integration Tests**: Electron-specific tests
- **E2E Tests**: Playwright for desktop automation
- **Cross-Platform Testing**: Windows, macOS, Linux
- **Performance Testing**: Memory and CPU usage

### 7.2 Quality Metrics
- **App Size**: Optimize bundle size
- **Startup Time**: Target < 3 seconds
- **Memory Usage**: Monitor memory consumption
- **Crash Rate**: Implement crash reporting
- **User Experience**: Usability testing

## Phase 8: Deployment and Distribution

### 8.1 Distribution Channels
- **Direct Download**: Website downloads
- **App Stores**: Microsoft Store, Mac App Store (optional)
- **Package Managers**: Chocolatey, Homebrew, Snap
- **Enterprise**: Corporate distribution

### 8.2 Release Management
- **Version Control**: Semantic versioning
- **Release Notes**: Automated changelog generation
- **Beta Testing**: Beta release program
- **Rollout Strategy**: Gradual rollout

## Implementation Timeline

### Week 1-2: Setup and Foundation
- [ ] Set up Electron project structure
- [ ] Configure build tools and dependencies
- [ ] Implement basic main process
- [ ] Create preload script

### Week 3-4: Core Integration
- [ ] Integrate Next.js with Electron
- [ ] Implement IPC communication
- [ ] Set up file system access
- [ ] Configure static export

### Week 5-6: Enhanced Features
- [ ] Implement native OS integration
- [ ] Add file import/export capabilities
- [ ] Enhance offline manager
- [ ] Add system tray support

### Week 7-8: Polish and Testing
- [ ] Performance optimization
- [ ] Cross-platform testing
- [ ] Bug fixes and refinements
- [ ] Documentation updates

### Week 9-10: Build and Deploy
- [ ] Configure electron-builder
- [ ] Set up auto-updates
- [ ] Code signing setup
- [ ] First release

## Risk Mitigation

### Technical Risks
- **Performance**: Monitor memory usage and optimize
- **Compatibility**: Test on multiple OS versions
- **Security**: Follow Electron security best practices
- **Updates**: Implement robust update mechanism

### Business Risks
- **User Adoption**: Maintain feature parity with web version
- **Maintenance**: Plan for ongoing desktop maintenance
- **Distribution**: Consider app store requirements
- **Support**: Plan for desktop-specific support

## Success Metrics

### Technical Metrics
- App startup time < 3 seconds
- Memory usage < 200MB baseline
- Crash rate < 1%
- Update success rate > 95%

### User Metrics
- User retention rate
- Feature adoption rate
- User satisfaction scores
- Support ticket volume

## Conclusion

This plan provides a comprehensive roadmap for converting the existing Next.js web application into a fully-featured desktop application using Electron. The approach leverages the existing offline infrastructure while adding desktop-specific capabilities and native OS integration.

The implementation prioritizes:
1. **Maintaining existing functionality** while adding desktop features
2. **Performance optimization** for desktop environments
3. **Cross-platform compatibility** across Windows, macOS, and Linux
4. **User experience** with native OS integration
5. **Reliability** with robust offline capabilities and auto-updates

The phased approach allows for iterative development and testing, ensuring a high-quality desktop application that meets user expectations and business requirements. 