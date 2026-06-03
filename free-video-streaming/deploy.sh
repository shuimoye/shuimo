#!/bin/bash

echo ""
echo "========================================"
echo "  免费视频流媒体 - 部署工具"
echo "========================================"
echo ""
echo "选择部署方案："
echo ""
echo "1. Vercel（推荐，国内访问快）"
echo "2. GitHub Pages（国内访问稳定）"
echo "3. Gitee Pages（国内平台，速度最快）"
echo "4. Netlify（国外平台）"
echo "5. 启动本地服务器"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "=== Vercel 部署指南 ==="
        echo ""
        echo "1. 访问 https://vercel.com 并使用GitHub登录"
        echo "2. 点击 'New Project'"
        echo "3. 导入GitHub仓库或直接上传文件夹"
        echo "4. 自动部署并获得访问地址"
        echo "5. 将地址分享给朋友"
        echo ""
        echo "优点：免费、国内有CDN、访问速度快"
        echo ""
        ;;
    2)
        echo ""
        echo "=== GitHub Pages 部署指南 ==="
        echo ""
        echo "1. 访问 https://github.com 并登录"
        echo "2. 创建新仓库，命名为 free-video-streaming"
        echo "3. 上传所有文件"
        echo "4. 在仓库 Settings > Pages 中启用"
        echo "5. 访问 https://你的用户名.github.io/free-video-streaming"
        echo ""
        echo "优点：免费、稳定、国内可访问"
        echo ""
        ;;
    3)
        echo ""
        echo "=== Gitee Pages 部署指南 ==="
        echo ""
        echo "1. 访问 https://gitee.com 并注册账号（需实名认证）"
        echo "2. 创建新仓库，命名为 free-video-streaming"
        echo "3. 上传所有文件"
        echo "4. 在仓库设置中启用 Gitee Pages"
        echo "5. 访问 https://你的用户名.gitee.io/free-video-streaming"
        echo ""
        echo "优点：国内平台、速度最快、免费"
        echo ""
        ;;
    4)
        echo ""
        echo "=== Netlify 部署指南 ==="
        echo ""
        echo "1. 访问 https://app.netlify.com/drop"
        echo "2. 登录或注册账号"
        echo "3. 将当前文件夹拖拽到页面上"
        echo "4. 等待部署完成"
        echo "5. 将获得的访问地址分享给朋友"
        echo ""
        echo "注意：国内访问可能不稳定"
        echo ""
        ;;
    5)
        echo ""
        echo "正在启动本地服务器..."
        python3 proxy.py
        ;;
    *)
        echo "无效选项"
        ;;
esac

read -p "按回车键退出..."