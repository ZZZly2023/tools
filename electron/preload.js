const { contextBridge, ipcRenderer } = require('electron')

// 暴露受保护的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 示例：获取应用版本
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // 示例：显示消息对话框
  showMessage: (message) => ipcRenderer.invoke('show-message', message),
  
  // 示例：获取系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // 示例：文件操作
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  
  // 示例：窗口操作
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
})

// 监听来自主进程的消息
ipcRenderer.on('app-message', (event, message) => {
  console.log('收到主进程消息:', message)
  // 可以在这里触发自定义事件或更新UI
}) 