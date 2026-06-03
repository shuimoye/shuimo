# 免费视频流媒体网页应用

一个免费观看网上影视剧的单机网页应用，仅供学习使用。

## 功能特性

- 视频搜索：搜索多个免费视频资源网站
- 视频播放：支持在线播放视频
- 视频下载：支持下载视频到本地
- 跨平台：支持安卓手机和Windows用户
- 分享功能：支持分享给朋友

## 部署方案（国内用户推荐）

### 方案1：Vercel（推荐，国内访问快）

1. 访问 https://vercel.com 并使用GitHub登录
2. 点击 "New Project"
3. 导入GitHub仓库或直接上传文件夹
4. 自动部署并获得访问地址（如 `https://xxx.vercel.app`）
5. 将地址分享给朋友

**优点：** 免费、国内有CDN、访问速度快、支持自定义域名

### 方案2：Cloudflare Pages（国内有CDN）

1. 访访 https://pages.cloudflare.com
2. 使用GitHub登录
3. 选择仓库并部署
4. 获得访问地址（如 `https://xxx.pages.dev`）

**优点：** 免费、全球CDN、国内访问快

### 方案3：GitHub Pages（国内访问稳定）

1. 访问 https://github.com 并登录
2. 创建新仓库，命名为 `free-video-streaming`
3. 上传所有文件
4. 在仓库 Settings > Pages 中启用
5. 访问 `https://你的用户名.github.io/free-video-streaming`

**优点：** 免费、稳定、国内可访问

## 快速部署

### Windows用户：
```bash
# 双击 deploy.bat
```

### Mac/Linux用户：
```bash
chmod +x deploy.sh
./deploy.sh
```

## 本地使用

### 启动本地服务器：
```bash
# Windows用户：双击 start.bat
# Mac/Linux用户：
python3 proxy.py
```

然后访问 http://localhost:8080

## 使用说明

1. 在搜索框中输入视频名称
2. 点击搜索按钮
3. 从搜索结果中选择要观看的视频
4. 选择剧集开始播放

## 支持的视频源

- 黑木耳资源
- 非凡资源
- 红牛资源

## 项目结构

```
free-video-streaming/
├── index.html          # 主页面
├── proxy.py            # 本地代理服务器
├── start.bat           # Windows启动脚本
├── start.sh            # Mac/Linux启动脚本
├── deploy.bat          # Windows部署脚本
├── deploy.sh           # Mac/Linux部署脚本
├── vercel.json         # Vercel配置
├── README.md           # 项目说明
├── css/                # 样式文件
├── js/                 # JavaScript文件
└── assets/             # 资源文件
```

## 免责声明

本应用仅供学习交流使用，所有视频资源均来自互联网，本站不存储任何视频内容。请勿将本应用用于商业用途，如有侵权请联系删除。

## 技术栈

- HTML5
- CSS3
- JavaScript (原生)
- Python (本地代理服务器)