@echo off
echo.
echo ========================================
echo   免费视频流媒体 - 一键部署工具
echo ========================================
echo.
echo 选择最简单的部署方式：
echo.
echo 1. 生成zip文件（用于Tiiny.host）
echo 2. 启动本地服务器
echo.
set /p choice="请输入选项 (1-2): "

if "%choice%"=="1" goto zip
if "%choice%"=="2" goto local
goto end

:zip
echo.
echo 正在生成zip文件...
cd ..
powershell -Command "Compress-Archive -Path 'free-video-streaming\*' -DestinationPath 'free-video-streaming.zip' -Force"
cd free-video-streaming

echo.
echo ✅ zip文件已生成：free-video-streaming.zip
echo.
echo 部署步骤：
echo 1. 访访 https://tiiny.host
echo 2. 上传 free-video-streaming.zip
echo 3. 获得访问地址
echo 4. 分享给朋友
echo.
pause
goto end

:local
echo.
echo 正在启动本地服务器...
python proxy.py
goto end

:end