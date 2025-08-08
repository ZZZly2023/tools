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

  // 解析磁力链接元数据
  async parseMagnetMetadata(magnetLink) {
    return new Promise((resolve, reject) => {
      const client = new WebTorrent();
      const torrent = client.add(magnetLink);
      let isResolved = false;
      
      const cleanup = () => {
        if (!isResolved && client && !client.destroyed) {
          try {
            client.destroy();
          } catch (err) {
            console.log('Client already destroyed or error during destroy:', err.message);
          }
        }
      };
      
      torrent.on('metadata', () => {
        if (isResolved) return;
        isResolved = true;
        
        const files = torrent.files.map(file => ({
          name: file.name,
          path: file.path,
          length: file.length,
          size: this.formatFileSize(file.length)
        }));
        
        const info = {
          name: torrent.name,
          files: files,
          totalSize: this.formatFileSize(torrent.length),
          pieceLength: torrent.pieceLength,
          numPieces: torrent.pieces.length
        };
        
        cleanup();
        resolve(info);
      });
      
      torrent.on('error', (err) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(err);
      });
      
      // 设置超时
      setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(new Error('解析超时'));
      }, 30000); // 30秒超时
    });
  },

  // 解析种子文件元数据
  async parseTorrentFileMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const client = new WebTorrent();
      const torrent = client.add(filePath);
      let isResolved = false;
      
      const cleanup = () => {
        if (!isResolved && client && !client.destroyed) {
          try {
            client.destroy();
          } catch (err) {
            console.log('Client already destroyed or error during destroy:', err.message);
          }
        }
      };
      
      torrent.on('metadata', () => {
        if (isResolved) return;
        isResolved = true;
        
        const files = torrent.files.map(file => ({
          name: file.name,
          path: file.path,
          length: file.length,
          size: this.formatFileSize(file.length)
        }));
        
        const info = {
          name: torrent.name,
          files: files,
          totalSize: this.formatFileSize(torrent.length),
          pieceLength: torrent.pieceLength,
          numPieces: torrent.pieces.length
        };
        
        cleanup();
        resolve(info);
      });
      
      torrent.on('error', (err) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(err);
      });
      
      // 设置超时
      setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(new Error('解析超时'));
      }, 30000); // 30秒超时
    });
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 添加下载任务
  addTorrent(magnetLink, taskId, isResumed = false, selectedFiles = null) {
    this.ensureDownloadPath();
    const client = new WebTorrent();
    
    // 创建torrent选项
    const torrentOptions = { 
      path: this.downloadPath
    };
    
    const torrent = client.add(magnetLink, torrentOptions);
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
      isResumed,
      selectedFiles
    };
    this.torrents.set(taskId, task);
    this._bindTorrentEvents(taskId, task);
    this._persistTasks();
    return taskId;
  },

  // 添加torrent文件下载任务
  addTorrentFile(filePath, taskId, isResumed = false, selectedFiles = null) {
    this.ensureDownloadPath();
    const client = new WebTorrent();
    
    // 创建torrent选项
    const torrentOptions = { 
      path: this.downloadPath
    };
    
    const torrent = client.add(filePath, torrentOptions);
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
      isResumed,
      selectedFiles
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
      fileName: task.fileName || null, // 添加文件名
      status: task.status,
      progress: task.progress,
      downloadSpeed: task.downloadSpeed,
      uploadSpeed: task.uploadSpeed,
      timeRemaining: task.timeRemaining,
      peers: task.peers,
      error: task.error,
      isResumed: !!task.isResumed,
      completedTime: task.completedTime
    });

    // 监听元数据获取完成事件
    torrent.on('metadata', () => {
      // 获取文件名
      if (torrent.files && torrent.files.length > 0) {
        if (torrent.files.length === 1) {
          // 单个文件
          task.fileName = torrent.files[0].name;
        } else {
          // 多个文件，使用文件夹名
          task.fileName = torrent.name;
        }
      }

      // 应用选择性下载
      if (task.selectedFiles && task.selectedFiles.length > 0) {
        console.log(`开始应用选择性下载: 选择了 ${task.selectedFiles.length} 个文件`);
        console.log('选中的文件:', task.selectedFiles);
        
        // 先取消选择所有文件
        torrent.files.forEach(file => {
          file.select = false;
          file.priority = 0; // 设置最低优先级
          console.log(`取消选择文件: ${file.path}`);
        });
        
        // 只选择用户指定的文件
        torrent.files.forEach(file => {
          if (task.selectedFiles.includes(file.path)) {
            file.select = true;
            file.priority = 1; // 设置最高优先级
            console.log(`选择文件: ${file.path}`);
          }
        });
        
        // 尝试强制停止未选中的文件
        torrent.files.forEach(file => {
          if (!task.selectedFiles.includes(file.path)) {
            // 尝试停止这个文件的下载
            if (file.deselect) {
              file.deselect();
            }
          }
        });
        
        console.log(`应用选择性下载完成: 选择了 ${task.selectedFiles.length} 个文件`);
      } else {
        console.log('没有指定选择文件，下载所有文件');
      }

      this._persistTasks();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('torrent-metadata', getSafeTask());
      }
    });

    torrent.on('download', () => {
      // 计算选中文件的进度
      let totalProgress = 0;
      let selectedFileCount = 0;
      
      if (task.selectedFiles && task.selectedFiles.length > 0) {
        // 只计算选中文件的进度
        torrent.files.forEach(file => {
          if (task.selectedFiles.includes(file.path)) {
            totalProgress += file.progress;
            selectedFileCount++;
          }
        });
        task.progress = selectedFileCount > 0 ? Math.round((totalProgress / selectedFileCount) * 100) : 0;
      } else {
        // 如果没有指定选择文件，使用整体进度
        task.progress = Math.round(torrent.progress * 100);
      }
      
      task.downloadSpeed = torrent.downloadSpeed;
      task.uploadSpeed = torrent.uploadSpeed;
      task.peers = torrent.numPeers;
      task.timeRemaining = torrent.timeRemaining / 1000;
      this._persistTasks();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('torrent-progress', getSafeTask());
      }
    });
    torrent.on('done', () => {
      // 检查选中的文件是否都完成了
      let allSelectedFilesDone = true;
      
      if (task.selectedFiles && task.selectedFiles.length > 0) {
        // 检查选中的文件是否都完成了
        for (const filePath of task.selectedFiles) {
          const file = torrent.files.find(f => f.path === filePath);
          if (file && file.progress < 1) {
            allSelectedFilesDone = false;
            break;
          }
        }
        
        // 如果选中的文件都完成了，删除未选中的文件
        if (allSelectedFilesDone) {
          console.log('选中的文件已完成，清理未选中的文件...');
          torrent.files.forEach(file => {
            if (!task.selectedFiles.includes(file.path)) {
              // 删除未选中的文件
              const filePath = path.join(this.downloadPath, file.path);
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`删除未选中的文件: ${file.path}`);
                }
              } catch (err) {
                console.error(`删除文件失败: ${file.path}`, err);
              }
            }
          });
        }
      } else {
        // 如果没有指定选择文件，使用整体完成状态
        allSelectedFilesDone = torrent.progress === 1;
      }
      
      if (allSelectedFilesDone) {
        task.status = 'completed';
        task.progress = 100;
        task.completedTime = new Date().toISOString(); // 记录完成时间
        this._persistTasks();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('torrent-completed', getSafeTask());
        }
      }
    });
    torrent.on('error', (err) => {
      task.status = 'error';
      task.error = err.message;
      this._persistTasks();
      if (mainWindow && !mainWindow.isDestroyed()) {
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
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('torrent-paused', {
          taskId: task.taskId,
          magnetLink: task.magnetLink,
          fileName: task.fileName || null,
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
      if (mainWindow && !mainWindow.isDestroyed()) {
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
      fileName: task.fileName || null,
      status: task.status,
      progress: task.progress,
      downloadSpeed: task.downloadSpeed,
      uploadSpeed: task.uploadSpeed,
      timeRemaining: task.timeRemaining,
      peers: task.peers,
      error: task.error,
      isResumed: !!task.isResumed,
      completedTime: task.completedTime
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
      isResumed: !!task.isResumed,
      fileName: task.fileName || null
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
    // 检查mainWindow是否还存在且未被销毁
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopClipboardMonitoring();
      return;
    }
    
    const content = clipboard.readText()
    if (content && content !== lastClipboardContent) {
      lastClipboardContent = content
      
      // 检查是否是磁力链接
      if (content.startsWith('magnet:?xt=urn:btih:')) {
        if (mainWindow && !mainWindow.isDestroyed()) {
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
    console.log('主窗口已关闭')
    mainWindow = null
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
  console.log('应用即将退出，开始清理资源...')
  
  // 停止剪贴板监听
  stopClipboardMonitoring()
  
  // 清理所有下载任务
  downloadManager.torrents.forEach((task, taskId) => {
    console.log('清理下载任务:', taskId)
    downloadManager.removeTorrent(taskId)
  })
  
  // 确保mainWindow被正确关闭
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
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

// 解析磁力链接元数据
ipcMain.handle('parse-magnet-metadata', async (event, magnetLink) => {
  try {
    const metadata = await downloadManager.parseMagnetMetadata(magnetLink)
    return { success: true, metadata }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 解析种子文件元数据
ipcMain.handle('parse-torrent-file-metadata', async (event, filePath) => {
  try {
    const metadata = await downloadManager.parseTorrentFileMetadata(filePath)
    return { success: true, metadata }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 添加选择性下载任务
ipcMain.handle('add-selective-magnet-download', async (event, magnetLink, selectedFiles) => {
  try {
    const taskId = Date.now().toString()
    downloadManager.addTorrent(magnetLink, taskId, false, selectedFiles)
    return { success: true, taskId }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('add-selective-torrent-file-download', async (event, filePath, selectedFiles) => {
  try {
    const taskId = Date.now().toString()
    downloadManager.addTorrentFile(filePath, taskId, false, selectedFiles)
    return { success: true, taskId }
  } catch (error) {
    return { success: false, error: error.message }
  }
}) 