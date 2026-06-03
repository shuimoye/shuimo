@echo off
echo.
echo ========================================
echo   免费视频流媒体 - 部署工具
echo ========================================
echo.
echo 选择部署方式：
echo.
echo 1. 部署到Netlify（推荐，最简单）
echo 2. 部署到GitHub Pages
echo 3. 启动本地服务器
echo.
set /p choice="请输入选项 (1-3): "

if "%choice%"=="1" goto netlify
if "%choice%"=="2" goto github
if "%choice%"=="3" goto local
goto end

:netlify
echo.
echo 正在部署到Netlify...
echo.
echo 请按以下步骤手动部署：
echo.
echo 1. 访问 https://app.netlify.com/drop
echo 2. 登录或注册账号
echo 3. 将当前文件夹拖拽到页面上
echo 4. 等待部署完成
echo.
echo 部署完成后，将获得的访问地址分享给朋友
echo.
pause
goto end

:github
echo.
echo 请按以下步骤部署到GitHub Pages：
echo.
echo 1. 访问 https://github.com 并登录
echo 2. 创建新仓库，命名为 free-video-streaming
echo 3. 上传所有文件
echo 4. 在仓库设置中启用GitHub Pages
echo 5. 访问 https://你的用户名.github.io/free-video-streaming
echo.
pause
goto end

:local
echo.
echo 正在启动本地服务器...
python proxy.py
goto end

:end