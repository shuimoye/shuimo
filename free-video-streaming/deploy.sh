#!/bin/bash

echo ""
echo "========================================"
echo "  免费视频流媒体 - 一键部署工具"
echo "========================================"
echo ""
echo "选择最简单的部署方式："
echo ""
echo "1. 生成zip文件（用于Tiiny.host）"
echo "2. 启动本地服务器"
echo ""
read -p "请输入选项 (1-2): " choice

case $choice in
    1)
        echo ""
        echo "正在生成zip文件..."
        
        # 创建zip文件
        cd ..
        zip -r free-video-streaming.zip free-video-streaming/ \
            -x "free-video-streaming/.git/*" \
            -x "free-video-streaming/proxy.py" \
            -x "free-video-streaming/start.bat" \
            -x "free-video-streaming/start.sh" \
            -x "free-video-streaming/deploy.bat" \
            -x "free-video-streaming/deploy.sh" \
            -x "free-video-streaming/vercel.json" \
            -x "free-video-streaming/netlify.toml"
        cd free-video-streaming
        
        echo ""
        echo "✅ zip文件已生成：../free-video-streaming.zip"
        echo ""
        echo "部署步骤："
        echo "1. 访问 https://tiiny.host"
        echo "2. 上传 free-video-streaming.zip"
        echo "3. 获得访问地址"
        echo "4. 分享给朋友"
        echo ""
        ;;
    2)
        echo ""
        echo "正在启动本地服务器..."
        python3 proxy.py
        ;;
    *)
        echo "无效选项"
        ;;
esac

read -p "按回车键退出..."