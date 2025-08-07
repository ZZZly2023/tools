#!/bin/bash

# 设置Electron镜像源
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

echo "🚀 启动 Vite + React + Electron 开发环境..."

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 清理可能存在的进程
echo "🧹 清理现有进程..."
pkill -f "vite" 2>/dev/null || true
pkill -f "electron" 2>/dev/null || true

# 启动开发环境
echo "🔥 启动开发服务器和Electron应用..."
npm run electron-dev 