#!/bin/bash

# 设置Electron镜像源
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

echo "🚀 Vite + React + Electron 应用打包工具"
echo "=================================="

# 检查参数
if [ $# -eq 0 ]; then
    echo "请选择打包平台:"
    echo "1) macOS"
    echo "2) Windows"
    echo "3) Linux"
    echo "4) 所有平台"
    echo "5) 退出"
    read -p "请输入选择 (1-5): " choice
else
    choice=$1
fi

case $choice in
    1|mac|macos)
        echo "📦 开始打包 macOS 应用..."
        npm run dist:mac
        ;;
    2|win|windows)
        echo "📦 开始打包 Windows 应用..."
        npm run dist:win
        ;;
    3|linux)
        echo "📦 开始打包 Linux 应用..."
        npm run dist:linux
        ;;
    4|all)
        echo "📦 开始打包所有平台应用..."
        npm run dist:all
        ;;
    5|exit)
        echo "👋 退出打包工具"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 检查打包结果
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 打包完成！"
    echo "📁 安装包位置: dist-electron/"
    echo ""
    echo "📋 生成的文件:"
    ls -la dist-electron/*.{dmg,exe,AppImage,deb} 2>/dev/null || echo "未找到安装包文件"
else
    echo ""
    echo "❌ 打包失败，请检查错误信息"
    exit 1
fi 