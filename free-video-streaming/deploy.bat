@echo off
echo.
echo ========================================
echo   免费视频流媒体 - 部署工具
echo ========================================
echo.
echo 选择部署方案：
echo.
echo 1. Vercel（推荐，国内访问快且稳定）
echo 2. GitHub Pages（国内可访问）
echo 3. 启动本地服务器
echo.
set /p choice="请输入选项 (1-3): "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto github
if "%choice%"=="3" goto local
goto end

:vercel
echo.
echo === Vercel 部署指南 ===
echo.
echo 1. 访问 https://vercel.com 并使用GitHub登录
echo 2. 点击 "New Project"
echo 3. 导入GitHub仓库或直接上传文件夹
echo 4. 自动部署并获得访问地址
echo 5. 将地址分享给朋友
echo.
echo 优点：免费、国内有CDN、访问速度快且稳定
echo.
pause
goto end

:github
echo.
echo === GitHub Pages 部署指南 ===
echo.
echo 1. 访问 https://github.com 并登录
echo 2. 创建新仓库，命名为 free-video-streaming
echo 3. 上传所有文件
echo 4. 在仓库 Settings ^> Pages 中启用
echo 5. 访问 https://你的用户名.github.io/free-video-streaming
echo.
echo 优点：免费、国内可访问、稳定
echo.
pause
goto end

:local
echo.
echo 正在启动本地服务器...
python proxy.py
goto end

:end