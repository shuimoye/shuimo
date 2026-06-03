#!/bin/bash

echo ""
echo "========================================"
echo "  免费视频流媒体 - 部署工具"
echo "========================================"
echo ""
echo "选择部署方式："
echo ""
echo "1. 部署到Netlify（推荐，最简单）"
echo "2. 部署到GitHub Pages"
echo "3. 启动本地服务器"
echo ""
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "正在部署到Netlify..."
        echo ""
        
        # 检查是否安装了netlify-cli
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=.
        else
            echo "未安装netlify-cli，请按以下步骤手动部署："
            echo ""
            echo "1. 访问 https://app.netlify.com/drop"
            echo "2. 登录或注册账号"
            echo "3. 将当前文件夹拖拽到页面上"
            echo "4. 等待部署完成"
            echo ""
            echo "或者安装netlify-cli后重新运行此脚本："
            echo "npm install -g netlify-cli"
        fi
        ;;
    2)
        echo ""
        echo "请按以下步骤部署到GitHub Pages："
        echo ""
        echo "1. 访问 https://github.com 并登录"
        echo "2. 创建新仓库，命名为 free-video-streaming"
        echo "3. 上传所有文件"
        echo "4. 在仓库设置中启用GitHub Pages"
        echo "5. 访问 https://你的用户名.github.io/free-video-streaming"
        echo ""
        ;;
    3)
        echo ""
        echo "正在启动本地服务器..."
        python3 proxy.py
        ;;
    *)
        echo "无效选项"
        ;;
esac