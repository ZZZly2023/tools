import React, { useState, useEffect } from 'react'
import '../styles/components/DownloadManager.less'

const DownloadManager = () => {
  const [downloads, setDownloads] = useState([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [magnetLink, setMagnetLink] = useState('')
  const [showMagnetDialog, setShowMagnetDialog] = useState(false)
  const [detectedMagnet, setDetectedMagnet] = useState('')
  const [showFileSelector, setShowFileSelector] = useState(false)
  const [fileMetadata, setFileMetadata] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 加载所有下载任务
  const loadDownloads = async () => {
    if (window.electronAPI) {
      const tasks = await window.electronAPI.getAllDownloads()
      setDownloads(tasks)
    }
  }

  // 添加下载任务
  const addDownload = async (link) => {
    if (window.electronAPI) {
      try {
        await parseMagnetMetadata(link)
        setMagnetLink('')
        setShowAddDialog(false)
        setShowMagnetDialog(false)
      } catch (error) {
        alert('添加下载失败: ' + error.message)
      }
    }
  }

  // 添加torrent文件下载任务
  const addTorrentFileDownload = async (filePath) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.addTorrentFileDownload(filePath)
      if (result.success) {
        loadDownloads()
      } else {
        alert('添加torrent文件下载失败: ' + result.error)
      }
    }
  }

  // 选择torrent文件
  const selectTorrentFile = async () => {
    console.log('点击了选择torrent文件按钮')
    if (window.electronAPI) {
      console.log('window.electronAPI 存在')
      await selectTorrentFileDownload()
    } else {
      console.log('window.electronAPI 不存在')
    }
  }

  // 暂停下载
  const pauseDownload = async (taskId) => {
    if (window.electronAPI) {
      await window.electronAPI.pauseDownload(taskId)
      loadDownloads()
    }
  }

  // 恢复下载
  const resumeDownload = async (taskId) => {
    if (window.electronAPI) {
      await window.electronAPI.resumeDownload(taskId)
      loadDownloads()
    }
  }

  // 删除下载
  const removeDownload = async (taskId) => {
    if (window.electronAPI) {
      await window.electronAPI.removeDownload(taskId)
      loadDownloads()
    }
  }

  // 批量暂停
  const pauseAll = async () => {
    if (window.electronAPI) {
      await window.electronAPI.pauseAllDownloads()
      loadDownloads()
    }
  }

  // 批量恢复
  const resumeAll = async () => {
    if (window.electronAPI) {
      await window.electronAPI.resumeAllDownloads()
      loadDownloads()
    }
  }

  // 打开下载文件夹
  const openDownloadFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openDownloadFolder()
    }
  }

  // 格式化速度
  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (seconds) => {
    if (seconds === 0 || !seconds) return '--'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 获取状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading': return '#4facfe'
      case 'completed': return '#00ff88'
      case 'paused': return '#ffa500'
      case 'error': return '#ff4757'
      default: return '#666'
    }
  }

  // 获取状态文本
  const getStatusText = (status) => {
    switch (status) {
      case 'downloading': return '下载中'
      case 'completed': return '已完成'
      case 'paused': return '已暂停'
      case 'error': return '下载失败'
      default: return '未知'
    }
  }

  // 选择.torrent文件下载
  const selectTorrentFileDownload = async () => {
    try {
      const filePath = await window.electronAPI.selectTorrentFile()
      if (filePath) {
        setIsLoading(true)
        const result = await window.electronAPI.parseTorrentFileMetadata(filePath)
        if (result.success) {
          setFileMetadata({
            ...result.metadata,
            source: 'file',
            filePath: filePath
          })
          setSelectedFiles(result.metadata.files.map(file => file.path)) // 默认全选
          setShowFileSelector(true)
        } else {
          alert('解析种子文件失败: ' + result.error)
        }
      }
    } catch (error) {
      console.error('选择种子文件失败:', error)
      alert('选择种子文件失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 解析磁力链接元数据
  const parseMagnetMetadata = async (magnetLink) => {
    try {
      setIsLoading(true)
      const result = await window.electronAPI.parseMagnetMetadata(magnetLink)
      if (result.success) {
        setFileMetadata({
          ...result.metadata,
          source: 'magnet',
          magnetLink: magnetLink
        })
        setSelectedFiles(result.metadata.files.map(file => file.path)) // 默认全选
        setShowFileSelector(true)
      } else {
        alert('解析磁力链接失败: ' + result.error)
      }
    } catch (error) {
      console.error('解析磁力链接失败:', error)
      alert('解析磁力链接失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 确认选择性下载
  const confirmSelectiveDownload = async () => {
    try {
      setIsLoading(true)
      let result
      
      if (fileMetadata.source === 'magnet') {
        result = await window.electronAPI.addSelectiveMagnetDownload(fileMetadata.magnetLink, selectedFiles)
      } else {
        result = await window.electronAPI.addSelectiveTorrentFileDownload(fileMetadata.filePath, selectedFiles)
      }
      
      if (result.success) {
        setShowFileSelector(false)
        setFileMetadata(null)
        setSelectedFiles([])
        // 重新加载下载列表
        const allDownloads = await window.electronAPI.getAllDownloads()
        setDownloads(allDownloads)
      } else {
        alert('添加下载任务失败: ' + result.error)
      }
    } catch (error) {
      console.error('确认下载失败:', error)
      alert('确认下载失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 切换文件选择状态
  const toggleFileSelection = (filePath) => {
    setSelectedFiles(prev => 
      prev.includes(filePath) 
        ? prev.filter(path => path !== filePath)
        : [...prev, filePath]
    )
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedFiles.length === fileMetadata.files.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(fileMetadata.files.map(file => file.path))
    }
  }

  useEffect(() => {
    // 加载初始下载列表
    const loadDownloads = async () => {
      try {
        const allDownloads = await window.electronAPI.getAllDownloads();
        setDownloads(allDownloads);
      } catch (error) {
        console.error('加载下载列表失败:', error);
      }
    };

    loadDownloads();

    // 监听磁力链接检测
    window.electronAPI.onMagnetLinkDetected((event, magnetLink) => {
      setDetectedMagnet(magnetLink);
      setShowMagnetDialog(true);
    });

    // 监听下载进度更新
    window.electronAPI.onTorrentProgress((event, download) => {
      setDownloads(prev => prev.map(d => 
        d.taskId === download.taskId ? { ...d, ...download } : d
      ));
    });

    // 监听下载完成
    window.electronAPI.onTorrentCompleted((event, download) => {
      setDownloads(prev => prev.map(d => 
        d.taskId === download.taskId ? { ...d, ...download } : d
      ));
    });

    // 监听下载错误
    window.electronAPI.onTorrentError((event, download) => {
      setDownloads(prev => prev.map(d => 
        d.taskId === download.taskId ? { ...d, ...download } : d
      ));
    });

    // 监听下载暂停
    window.electronAPI.onTorrentPaused((event, download) => {
      setDownloads(prev => prev.map(d => 
        d.taskId === download.taskId ? { ...d, ...download } : d
      ));
    });

    // 监听元数据获取完成（文件名）
    window.electronAPI.onTorrentMetadata((event, download) => {
      setDownloads(prev => prev.map(d => 
        d.taskId === download.taskId ? { ...d, ...download } : d
      ));
    });

    // 监听下载恢复
    window.electronAPI.onTorrentResumed((event, download) => {
      setDownloads(prev => prev.map(d => 
        d.taskId === download.taskId ? { ...d, ...download } : d
      ));
    });
  }, []);

  return (
    <div className="download-manager">
      <div className="download-header">
        <h2>磁力下载管理器</h2>
        <div className="header-actions">
          <button 
            className="btn-action" 
            onClick={() => setShowAddDialog(true)}
          >
            添加磁力链接
          </button>
          <button 
            className="btn-action" 
            onClick={selectTorrentFile}
          >
            选择.torrent文件
          </button>
          <button 
            className="btn-action" 
            onClick={openDownloadFolder}
          >
            打开下载文件夹
          </button>
        </div>
      </div>

      <div className="batch-actions">
        <button 
          className="btn btn-warning" 
          onClick={pauseAll}
          disabled={downloads.length === 0}
        >
          批量暂停
        </button>
        <button 
          className="btn btn-success" 
          onClick={resumeAll}
          disabled={downloads.length === 0}
        >
          批量恢复
        </button>
      </div>

      <div className="download-list">
        {downloads.length === 0 ? (
          <div className="empty-state">
            <p>暂无下载任务</p>
            <p>点击"添加磁力链接"开始下载</p>
          </div>
        ) : (
          downloads.map((download) => (
            <div key={download.taskId} className={`download-item ${download.status === 'completed' ? 'completed' : ''}`}>
              <div className="download-info">
                <div className="download-header">
                  <span className="download-name">
                    {download.fileName ? download.fileName : download.magnetLink.substring(0, 50) + '...'}
                  </span>
                  <span 
                    className="download-status"
                    style={{ color: getStatusColor(download.status) }}
                  >
                    {download.status === 'completed' ? 
                      `✅ 下载完成 (${download.completedTime ? new Date(download.completedTime).toLocaleString() : '未知'})` : 
                      getStatusText(download.status)
                    }
                  </span>
                  {download.isResumed && (
                    <span className="download-resume-tip">（断点续传）</span>
                  )}
                </div>
                
                <div className="download-progress">
                  {download.status !== 'completed' && (
                    <>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${download.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{download.progress}%</span>
                    </>
                  )}
                </div>

                {download.status !== 'completed' && (
                  <div className="download-stats">
                    <span>下载速度: {formatSpeed(download.downloadSpeed)}</span>
                    <span>上传速度: {formatSpeed(download.uploadSpeed)}</span>
                    <span>连接数: {download.peers}</span>
                    <span>剩余时间: {formatTime(download.timeRemaining)}</span>
                  </div>
                )}

                {download.error && (
                  <div className="download-error">
                    错误: {download.error}
                  </div>
                )}
              </div>

              <div className="download-actions">
                {download.status === 'downloading' && (
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => pauseDownload(download.taskId)}
                  >
                    暂停
                  </button>
                )}
                
                {download.status === 'paused' && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => resumeDownload(download.taskId)}
                  >
                    恢复
                  </button>
                )}
                
                {download.status === 'error' && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => resumeDownload(download.taskId)}
                  >
                    重试
                  </button>
                )}
                
                {download.status === 'completed' && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={openDownloadFolder}
                  >
                    打开文件夹
                  </button>
                )}
                
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => removeDownload(download.taskId)}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加磁力链接对话框 */}
      {showAddDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>添加磁力链接</h3>
            <input
              type="text"
              placeholder="请输入磁力链接"
              value={magnetLink}
              onChange={(e) => setMagnetLink(e.target.value)}
              className="magnet-input"
            />
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    setShowAddDialog(false)
                    await parseMagnetMetadata(magnetLink)
                  } catch (error) {
                    console.error('解析磁力链接失败:', error)
                    alert('解析磁力链接失败: ' + error.message)
                  }
                }}
                disabled={!magnetLink.trim()}
              >
                选择文件下载
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddDialog(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 检测到磁力链接对话框 */}
      {showMagnetDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>检测到磁力链接</h3>
            <p>是否要下载以下磁力链接？</p>
            <div className="magnet-link">
              {detectedMagnet.substring(0, 100)}...
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    setShowMagnetDialog(false)
                    await parseMagnetMetadata(detectedMagnet)
                  } catch (error) {
                    console.error('解析磁力链接失败:', error)
                    alert('解析磁力链接失败: ' + error.message)
                  }
                }}
              >
                选择文件下载
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowMagnetDialog(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件选择对话框 */}
      {showFileSelector && fileMetadata && (
        <div className="modal-overlay">
          <div className="modal file-selector-modal">
            <h3>选择要下载的文件</h3>
            <div className="file-info">
              <p><strong>名称:</strong> {fileMetadata.name}</p>
              <p><strong>总大小:</strong> {fileMetadata.totalSize}</p>
              <p><strong>文件数量:</strong> {fileMetadata.files.length}</p>
            </div>
            
            <div className="file-selector-header">
              <label className="select-all-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFiles.length === fileMetadata.files.length}
                  onChange={toggleSelectAll}
                />
                全选/取消全选
              </label>
              <span className="selected-count">
                已选择 {selectedFiles.length} / {fileMetadata.files.length} 个文件
              </span>
            </div>
            
            <div className="file-list">
              {fileMetadata.files.map((file, index) => (
                <div key={index} className="file-item">
                  <label className="file-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.path)}
                      onChange={() => toggleFileSelection(file.path)}
                    />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{file.size}</span>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={confirmSelectiveDownload}
                disabled={selectedFiles.length === 0 || isLoading}
              >
                {isLoading ? '处理中...' : '开始下载'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowFileSelector(false)
                  setFileMetadata(null)
                  setSelectedFiles([])
                }}
                disabled={isLoading}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadManager 