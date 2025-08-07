const { app, BrowserWindow, Menu, ipcMain, dialog, clipboard } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const WebTorrent = require('webtorrent')
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === 'true' || process.env.VITE_DEV_SERVER_URL;

const TASKS_FILE = path.join(os.homedir(), 'Downloads', 'MagnetDownloads', 'tasks.json');

// 加载任务
function loadTasksFromFile() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载任务文件失败:', e);
  }
  return [];
}

// 保存任务
function saveTasksToFile(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存任务文件失败:', e);
  }
}

// 优化后的下载管理器
const downloadManager = {
  torrents: new Map(),
  downloadPath: path.join(os.homedir(), 'Downloads', 'MagnetDownloads'),

  ensureDownloadPath() {
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true })
    }
  },

  // 添加下载任务
  addTorrent(magnetLink, taskId, isResumed = false) {
    this.ensureDownloadPath();
    const client = new WebTorrent();
    const torrent = client.add(magnetLink, { path: this.downloadPath });
    const task = {
      client,
      torrent,
      taskId,
      magnetLink,
      status: 'downloading',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      timeRemaining: 0,
      peers: 0,
      error: null,
      isResumed
    };
    this.torrents.set(taskId, task);
    this._bindTorrentEvents(taskId, task);
    this._persistTasks();
    return taskId;
  },

  // 添加torrent文件下载任务
  addTorrentFile(filePath, taskId, isResumed = false) {
    this.ensureDownloadPath();
    const client = new WebTorrent();
    const torrent = client.add(filePath, { path: this.downloadPath });
    const task = {
      client,
      torrent,
      taskId,
      magnetLink: `file://${filePath}`, // 用于显示和持久化
      filePath: filePath, // 保存文件路径
      status: 'downloading',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      timeRemaining: 0,
      peers: 0,
      error: null,
      isResumed
    };
    this.torrents.set(taskId, task);
    this._bindTorrentEvents(taskId, task);
    this._persistTasks();
    return taskId;
  },

  // 绑定事件
  _bindTorrentEvents(taskId, task) {
    const { torrent } = task;
    const getSafeTask = () => ({
      taskId: task.taskId,
      magnetLink: task.magnetLink,
      status: task.status,
      progress: task.progress,
      downloadSpeed: task.downloadSpeed,
      uploadSpeed: task.uploadSpeed,
      timeRemaining: task.timeRemaining,
      peers: task.peers,
      error: task.error,
      isResumed: !!task.isResumed
    });
    torrent.on('download', () => {
      task.progress = Math.round(torrent.progress * 100);
      task.downloadSpeed = torrent.downloadSpeed;
      task.uploadSpeed = torrent.uploadSpeed;
      task.peers = torrent.numPeers;
      task.timeRemaining = torrent.timeRemaining / 1000;
      this._persistTasks();
      if (mainWindow) {
        mainWindow.webContents.send('torrent-progress', getSafeTask());
      }
    });
    torrent.on('done', () => {
      task.status = 'completed';
      task.progress = 100;
      this._persistTasks();
      if (mainWindow) {
        mainWindow.webContents.send('torrent-completed', getSafeTask());
      }
    });
    torrent.on('error', (err) => {
      task.status = 'error';
      task.error = err.message;
      this._persistTasks();
      if (mainWindow) {
        mainWindow.webContents.send('torrent-error', getSafeTask());
      }
    });
  },

  // 暂停下载
  pauseTorrent(taskId) {
    const task = this.torrents.get(taskId);
    if (task && task.status === 'downloading') {
      task.client.destroy();
      task.status = 'paused';
      task.client = null;
      task.torrent = null;
      this._persistTasks();
      if (mainWindow) {
        mainWindow.webContents.send('torrent-paused', {
          taskId: task.taskId,
          magnetLink: task.magnetLink,
          status: task.status,
          progress: task.progress,
          downloadSpeed: task.downloadSpeed,
          uploadSpeed: task.uploadSpeed,
          timeRemaining: task.timeRemaining,
          peers: task.peers,
          error: task.error,
          isResumed: !!task.isResumed
        });
      }
    }
  },

  // 恢复下载
  resumeTorrent(taskId) {
    const task = this.torrents.get(taskId);
    if (task && task.status === 'paused') {
      const client = new WebTorrent();
      const torrent = client.add(task.magnetLink, { path: this.downloadPath });
      task.client = client;
      task.torrent = torrent;
      task.status = 'downloading';
      task.error = null;
      task.isResumed = true;
      this._bindTorrentEvents(taskId, task);
      this._persistTasks();
      if (mainWindow) {
        mainWindow.webContents.send('torrent-resumed', {
          taskId: task.taskId,
          magnetLink: task.magnetLink,
          status: task.status,
          progress: task.progress,
          downloadSpeed: task.downloadSpeed,
          uploadSpeed: task.uploadSpeed,
          timeRemaining: task.timeRemaining,
          peers: task.peers,
          error: task.error,
          isResumed: !!task.isResumed
        });
      }
    }
  },

  // 删除下载任务
  removeTorrent(taskId) {
    const task = this.torrents.get(taskId);
    if (task) {
      if (task.client) task.client.destroy();
      this.torrents.delete(taskId);
      this._persistTasks();
    }
  },

  // 获取所有任务
  getAllTasks() {
    return Array.from(this.torrents.values()).map(task => ({
      taskId: task.taskId,
      magnetLink: task.magnetLink,
      status: task.status,
      progress: task.progress,
      downloadSpeed: task.downloadSpeed,
      uploadSpeed: task.uploadSpeed,
      timeRemaining: task.timeRemaining,
      peers: task.peers,
      error: task.error,
      isResumed: !!task.isResumed
    }));
  },

  // 批量操作
  pauseAll() {
    this.torrents.forEach((task, taskId) => {
      this.pauseTorrent(taskId);
    });
  },

  resumeAll() {
    this.torrents.forEach((task, taskId) => {
      this.resumeTorrent(taskId);
    });
  },

  // 持久化所有任务
  _persistTasks() {
    const tasks = Array.from(this.torrents.values()).map(task => ({
      taskId: task.taskId,
      magnetLink: task.magnetLink,
      status: task.status,
      progress: task.progress,
      isResumed: !!task.isResumed
    }));
    saveTasksToFile(tasks);
  },

  // 恢复所有持久化任务
  restoreAllTasks() {
    this.ensureDownloadPath();
    const tasks = loadTasksFromFile();
    tasks.forEach(task => {
      // 只恢复未完成的任务
      if (task.status === 'downloading' || task.status === 'paused') {
        this.addTorrent(task.magnetLink, task.taskId, true);
        if (task.status === 'paused') {
          this.pauseTorrent(task.taskId);
        }
      }
    });
  }
}

// 剪贴板监听
let clipboardInterval = null
let lastClipboardContent = ''

function startClipboardMonitoring() {
  clipboardInterval = setInterval(() => {
    const content = clipboard.readText()
    if (content && content !== lastClipboardContent) {
      lastClipboardContent = content
      
      // 检查是否是磁力链接
      if (content.startsWith('magnet:?xt=urn:btih:')) {
        if (mainWindow) {
          mainWindow.webContents.send('magnet-link-detected', content)
        }
      }
    }
  }, 1000) // 每秒检查一次
}

function stopClipboardMonitoring() {
  if (clipboardInterval) {
    clearInterval(clipboardInterval)
    clipboardInterval = null
  }
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: true, // 允许缩放
    maximizable: true, // 允许最大化
    minimizable: true,  // 允许最小化
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // 可选：应用图标
    show: false // 先隐藏窗口，等加载完成后再显示
  })

  // 加载应用
  if (isDev) {
    // 开发环境：加载本地开发服务器
    mainWindow.loadURL('http://localhost:5173')
    // 打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    // 在macOS上，当所有窗口都关闭时，应用通常会保持活跃状态
    // 除非用户明确退出应用
  })
}

// 添加 macOS 安全状态恢复支持
if (process.platform === 'darwin') {
  app.on('ready', () => {
    if (typeof app.setSupportsSecureRestorableState === 'function') {
      app.setSupportsSecureRestorableState(true)
    }
  })
}

// 应用启动时自动恢复任务
app.whenReady().then(() => {
  createWindow();
  downloadManager.restoreAllTasks();
  startClipboardMonitoring();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口都关闭时退出应用，除了在macOS上
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时清理资源
app.on('before-quit', () => {
  stopClipboardMonitoring()
  // 清理所有下载任务
  downloadManager.torrents.forEach((task, taskId) => {
    downloadManager.removeTorrent(taskId)
  })
})

// IPC处理器
ipcMain.handle('get-version', () => {
  return app.getVersion()
})

ipcMain.handle('show-message', async (event, message) => {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: '消息',
    message: message,
    buttons: ['确定']
  })
  return result
})

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node
  }
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '所有文件', extensions: ['*'] },
      { name: '文本文件', extensions: ['txt', 'md'] },
      { name: '图片文件', extensions: ['jpg', 'png', 'gif'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('save-file', async (event, content) => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: '文本文件', extensions: ['txt'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled) {
    const fs = require('fs')
    fs.writeFileSync(result.filePath, content, 'utf8')
    return result.filePath
  }
  return null
})

ipcMain.handle('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.minimize()
})

ipcMain.handle('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.handle('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.close()
})

// 下载相关的IPC处理器
ipcMain.handle('add-magnet-download', async (event, magnetLink) => {
  try {
    const taskId = Date.now().toString()
    downloadManager.addTorrent(magnetLink, taskId)
    return { success: true, taskId }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('add-torrent-file-download', async (event, filePath) => {
  try {
    const taskId = Date.now().toString()
    downloadManager.addTorrentFile(filePath, taskId)
    return { success: true, taskId }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('select-torrent-file', async () => {
  console.log('主进程收到 select-torrent-file 调用')
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Torrent 文件', extensions: ['torrent'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0]
  } catch (error) {
    return null
  }
})

ipcMain.handle('pause-download', async (event, taskId) => {
  try {
    downloadManager.pauseTorrent(taskId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('resume-download', async (event, taskId) => {
  try {
    downloadManager.resumeTorrent(taskId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('remove-download', async (event, taskId) => {
  try {
    downloadManager.removeTorrent(taskId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-downloads', async () => {
  return downloadManager.getAllTasks()
})

ipcMain.handle('pause-all-downloads', async () => {
  try {
    downloadManager.pauseAll()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('resume-all-downloads', async () => {
  try {
    downloadManager.resumeAll()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('open-download-folder', async () => {
  try {
    const { shell } = require('electron')
    await shell.openPath(downloadManager.downloadPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}) 