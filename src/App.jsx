import React, { useState, useEffect } from 'react'
import './styles/components/App.less'

function App() {
  const [version, setVersion] = useState('')
  const [systemInfo, setSystemInfo] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 获取应用版本
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(ver => {
        setVersion(ver)
      }).catch(err => {
        console.error('获取版本失败:', err)
        setVersion('获取失败')
      })
    } else {
      setVersion('Electron API 不可用')
    }
  }, [])

  const handleShowMessage = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.showMessage('来自React的消息！')
      } catch (err) {
        console.error('显示消息失败:', err)
        setMessage('显示消息失败: ' + err.message)
      }
    } else {
      setMessage('Electron API 不可用')
    }
  }

  const handleGetSystemInfo = async () => {
    if (window.electronAPI) {
      try {
        const info = await window.electronAPI.getSystemInfo()
        setSystemInfo(JSON.stringify(info, null, 2))
      } catch (err) {
        console.error('获取系统信息失败:', err)
        setMessage('获取系统信息失败: ' + err.message)
      }
    } else {
      setMessage('Electron API 不可用')
    }
  }

  const handleSelectFile = async () => {
    if (window.electronAPI) {
      try {
        const filePath = await window.electronAPI.selectFile()
        if (filePath) {
          setMessage(`选择的文件: ${filePath}`)
        } else {
          setMessage('未选择文件')
        }
      } catch (err) {
        console.error('选择文件失败:', err)
        setMessage('选择文件失败: ' + err.message)
      }
    } else {
      setMessage('Electron API 不可用')
    }
  }

  const handleSaveFile = async () => {
    if (window.electronAPI) {
      try {
        const content = '这是从React应用保存的文件内容！\n时间: ' + new Date().toLocaleString()
        const filePath = await window.electronAPI.saveFile(content)
        if (filePath) {
          setMessage(`文件保存成功: ${filePath}`)
        } else {
          setMessage('文件保存已取消')
        }
      } catch (err) {
        console.error('保存文件失败:', err)
        setMessage('保存文件失败: ' + err.message)
      }
    } else {
      setMessage('Electron API 不可用')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Vite + React + Electron</h1>
        <p>现代化的桌面应用开发框架</p>
      </header>

      <main className="app-main">
        <div className="info-section">
          <h2>应用信息</h2>
          <p>版本: {version || '加载中...'}</p>
        </div>

        <div className="actions-section">
          <h2>功能演示</h2>
          <div className="button-group">
            <button onClick={handleShowMessage} className="btn btn-primary">
              显示消息对话框
            </button>
            <button onClick={handleGetSystemInfo} className="btn btn-secondary">
              获取系统信息
            </button>
            <button onClick={handleSelectFile} className="btn btn-success">
              选择文件
            </button>
            <button onClick={handleSaveFile} className="btn btn-warning">
              保存文件
            </button>
          </div>
        </div>

        {systemInfo && (
          <div className="system-info">
            <h3>系统信息</h3>
            <pre>{systemInfo}</pre>
          </div>
        )}

        {message && (
          <div className="message">
            <p>{message}</p>
          </div>
        )}

        <div className="features">
          <h2>技术特性</h2>
          <ul>
            <li>⚡ Vite - 极速的开发服务器和构建工具</li>
            <li>⚛️ React 18 - 现代化的UI库</li>
            <li>🖥️ Electron - 跨平台桌面应用框架</li>
            <li>🔒 安全的进程间通信</li>
            <li>📦 自动打包和分发</li>
          </ul>
        </div>
      </main>

      <footer className="app-footer">
        <p>使用 Vite + React + Electron 构建</p>
      </footer>
    </div>
  )
}

export default App 