const { contextBridge, ipcRenderer } = require('electron')

console.log('preload.js 开始加载')

// 暴露受保护的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 现有API
  getVersion: () => ipcRenderer.invoke('get-version'),
  showMessage: (message) => ipcRenderer.invoke('show-message', message),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 下载相关API
  addMagnetDownload: (magnetLink) => ipcRenderer.invoke('add-magnet-download', magnetLink),
  addTorrentFileDownload: (filePath) => ipcRenderer.invoke('add-torrent-file-download', filePath),
  selectTorrentFile: () => ipcRenderer.invoke('select-torrent-file'),
  parseMagnetMetadata: (magnetLink) => ipcRenderer.invoke('parse-magnet-metadata', magnetLink),
  parseTorrentFileMetadata: (filePath) => ipcRenderer.invoke('parse-torrent-file-metadata', filePath),
  addSelectiveMagnetDownload: (magnetLink, selectedFiles) => ipcRenderer.invoke('add-selective-magnet-download', magnetLink, selectedFiles),
  addSelectiveTorrentFileDownload: (filePath, selectedFiles) => ipcRenderer.invoke('add-selective-torrent-file-download', filePath, selectedFiles),
  pauseDownload: (taskId) => ipcRenderer.invoke('pause-download', taskId),
  resumeDownload: (taskId) => ipcRenderer.invoke('resume-download', taskId),
  removeDownload: (taskId) => ipcRenderer.invoke('remove-download', taskId),
  getAllDownloads: () => ipcRenderer.invoke('get-all-downloads'),
  pauseAllDownloads: () => ipcRenderer.invoke('pause-all-downloads'),
  resumeAllDownloads: () => ipcRenderer.invoke('resume-all-downloads'),
  openDownloadFolder: () => ipcRenderer.invoke('open-download-folder'),
  
  // 事件监听
  onMagnetLinkDetected: (callback) => ipcRenderer.on('magnet-link-detected', callback),
  onTorrentProgress: (callback) => ipcRenderer.on('torrent-progress', callback),
  onTorrentCompleted: (callback) => ipcRenderer.on('torrent-completed', callback),
  onTorrentError: (callback) => ipcRenderer.on('torrent-error', callback),
  onTorrentPaused: (callback) => ipcRenderer.on('torrent-paused', callback),
  onTorrentMetadata: (callback) => ipcRenderer.on('torrent-metadata', callback),
  onTorrentResumed: (callback) => ipcRenderer.on('torrent-resumed', callback)
})

console.log('electronAPI 对象已创建，包含方法:', Object.keys(contextBridge.exposeInMainWorld))

// 监听来自主进程的消息
ipcRenderer.on('app-message', (event, message) => {
  console.log('收到主进程消息:', message)
  // 可以在这里触发自定义事件或更新UI
}) 