import React, { useState, useEffect } from 'react'
import './styles/components/App.less'
import DownloadManager from './components/DownloadManager'

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
        <h1>🚀 磁力下载器</h1>
        <p>基于 Vite + React + Electron 的现代化下载工具</p>
      </header>

      <main className="app-main">
        <DownloadManager />
      </main>

      <footer className="app-footer">
        <p>使用 Vite + React + Electron + WebTorrent 构建</p>
      </footer>
    </div>
  )
}

export default App 