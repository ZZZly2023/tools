# 安装指南

## 📦 安装包说明

本项目支持以下平台的安装包：

### macOS
- **文件格式**: `.dmg`
- **支持架构**: Intel (x64) 和 Apple Silicon (arm64)
- **系统要求**: macOS 10.12 或更高版本

### Windows
- **文件格式**: `.exe`
- **支持架构**: x64 (64位)
- **系统要求**: Windows 10 或更高版本

### Linux
- **文件格式**: `.AppImage` 和 `.deb`
- **支持架构**: x64 (64位)
- **系统要求**: Ubuntu 18.04+ 或其他主流 Linux 发行版

## 🚀 安装步骤

### macOS 安装

1. 下载 `Vite React Electron App-1.0.0-arm64.dmg` 文件
2. 双击打开 DMG 文件
3. 将应用拖拽到 Applications 文件夹
4. 从 Applications 文件夹启动应用

**注意**: 首次启动时，macOS 可能会提示"无法验证开发者"。请：
1. 打开"系统偏好设置" > "安全性与隐私"
2. 点击"仍要打开"按钮
3. 确认打开应用

### Windows 安装

1. 下载 `Vite React Electron App Setup 1.0.0.exe` 文件
2. 双击运行安装程序
3. 按照安装向导的提示完成安装
4. 从开始菜单或桌面快捷方式启动应用

### Linux 安装

#### AppImage 方式（推荐）
1. 下载 `vite-react-electron-app_1.0.0_amd64.AppImage` 文件
2. 给文件添加执行权限：
   ```bash
   chmod +x vite-react-electron-app_1.0.0_amd64.AppImage
   ```
3. 双击运行或使用命令行启动：
   ```bash
   ./vite-react-electron-app_1.0.0_amd64.AppImage
   ```

#### DEB 包方式
1. 下载 `.deb` 文件
2. 使用包管理器安装：
   ```bash
   sudo dpkg -i vite-react-electron-app_1.0.0_amd64.deb
   ```
3. 从应用程序菜单启动

## 🔧 功能特性

安装完成后，您可以享受以下功能：

- 🚀 **快速启动**: 基于 Vite 的极速开发体验
- 🎨 **现代化界面**: 美观的渐变背景和毛玻璃效果
- 🔧 **系统集成**: 完整的桌面应用体验
- 📁 **文件操作**: 支持文件选择和保存
- 💬 **消息对话框**: 原生系统对话框
- ℹ️ **系统信息**: 显示详细的系统信息

## 🛠️ 开发模式

如果您是开发者，也可以从源码运行：

```bash
# 克隆项目
git clone <repository-url>
cd vite-react-electron-app

# 安装依赖
npm install

# 启动开发模式
npm run electron-dev
```

## 📞 技术支持

如果您在安装或使用过程中遇到问题，请：

1. 检查系统要求是否满足
2. 查看控制台错误信息
3. 联系技术支持团队

## 🔄 更新

应用支持自动更新功能。当有新版本时，应用会自动提示您更新。

---

**版本**: 1.0.0  
**更新时间**: 2025年8月 