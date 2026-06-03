# 免费视频流媒体网页应用

一个免费观看网上影视剧的单机网页应用，仅供学习使用。

## 最简单的部署方法

### 方法1：Tiiny.host（最简单，无需注册）

1. 把 `free-video-streaming` 文件夹压缩成zip文件
2. 访问 https://tiiny.host
3. 上传zip文件
4. 获得访问地址
5. 分享给朋友

**优点：** 无需注册、一键上传、国内可访问

### 方法2：Netlify Drop（拖拽即可）

1. 访问 https://app.netlify.com/drop
2. 把 `free-video-streaming` 文件夹拖拽到页面上
3. 获得访问地址
4. 分享给朋友

**优点：** 无需注册、拖拽即可

### 方法3：Surge.sh（命令行一行部署）

```bash
# 安装surge
npm install -g surge

# 进入项目目录
cd free-video-streaming

# 一行命令部署
surge
```

**优点：** 命令行部署、快速

### 方法4：Vercel（国内访问最快）

1. 访问 https://vercel.com 并用GitHub登录
2. 点击 "New Project"
3. 上传文件夹
4. 自动部署

**优点：** 国内有CDN、访问最快

## 功能特性

- 视频搜索：搜索多个免费视频资源网站
- 视频播放：支持在线播放视频
- 视频下载：支持下载视频到本地
- 跨平台：支持安卓手机和Windows用户
- 分享功能：支持分享给朋友

## 本地使用

### Windows用户：
```bash
# 双击 start.bat
```

### Mac/Linux用户：
```bash
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

## 免责声明

本应用仅供学习交流使用，所有视频资源均来自互联网，本站不存储任何视频内容。请勿将本应用用于商业用途，如有侵权请联系删除。