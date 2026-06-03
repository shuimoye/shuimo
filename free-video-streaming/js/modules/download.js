/**
 * 下载模块
 * 处理视频下载功能
 */

class DownloadModule {
    constructor() {
        this.currentDownload = null;
        this.downloadHistory = [];
    }
    
    /**
     * 获取下载链接
     * @param {string} videoUrl - 视频URL
     * @returns {Promise<string>} 下载链接
     */
    async getDownloadUrl(videoUrl) {
        try {
            console.log(`获取下载链接: ${videoUrl}`);
            
            // 如果是直接链接，直接返回
            if (this.isDirectLink(videoUrl)) {
                return videoUrl;
            }
            
            // 尝试从页面提取视频链接
            const extractedUrl = await this.extractVideoUrl(videoUrl);
            if (extractedUrl) {
                return extractedUrl;
            }
            
            // 返回原始链接
            return videoUrl;
            
        } catch (error) {
            console.error('获取下载链接失败:', error);
            throw error;
        }
    }
    
    /**
     * 检查是否为直接链接
     * @param {string} url - URL
     * @returns {boolean} 是否为直接链接
     */
    isDirectLink(url) {
        const directExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m3u8'];
        const lowerUrl = url.toLowerCase();
        return directExtensions.some(ext => lowerUrl.includes(ext));
    }
    
    /**
     * 从页面提取视频URL
     * @param {string} pageUrl - 页面URL
     * @returns {Promise<string|null>} 视频URL
     */
    async extractVideoUrl(pageUrl) {
        try {
            // 使用跨域模块获取页面内容
            const response = await corsModule.fetchWithCORS(pageUrl);
            const html = await response.text();
            
            // 解析HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 查找视频元素
            const videoElement = doc.querySelector('video');
            if (videoElement) {
                const src = videoElement.getAttribute('src');
                if (src) {
                    return this.resolveUrl(pageUrl, src);
                }
                
                // 查找source元素
                const sourceElement = videoElement.querySelector('source');
                if (sourceElement) {
                    const src = sourceElement.getAttribute('src');
                    if (src) {
                        return this.resolveUrl(pageUrl, src);
                    }
                }
            }
            
            // 查找视频链接
            const videoLinks = this.findVideoLinks(doc);
            if (videoLinks.length > 0) {
                return videoLinks[0];
            }
            
            return null;
            
        } catch (error) {
            console.error('提取视频URL失败:', error);
            return null;
        }
    }
    
    /**
     * 查找视频链接
     * @param {Document} doc - DOM文档
     * @returns {Array<string>} 视频链接列表
     */
    findVideoLinks(doc) {
        const links = [];
        
        // 查找所有链接
        const allLinks = doc.querySelectorAll('a[href]');
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && this.isDirectLink(href)) {
                links.push(href);
            }
        });
        
        // 查找视频源
        const videoSources = doc.querySelectorAll('source[src]');
        videoSources.forEach(source => {
            const src = source.getAttribute('src');
            if (src) {
                links.push(src);
            }
        });
        
        return links;
    }
    
    /**
     * 解析URL
     * @param {string} baseUrl - 基础URL
     * @param {string} relativeUrl - 相对URL
     * @returns {string} 完整URL
     */
    resolveUrl(baseUrl, relativeUrl) {
        try {
            return new URL(relativeUrl, baseUrl).href;
        } catch (error) {
            return relativeUrl;
        }
    }
    
    /**
     * 开始下载
     * @param {string} url - 下载URL
     * @param {string} filename - 文件名
     * @returns {Promise<void>}
     */
    async startDownload(url, filename) {
        try {
            console.log(`开始下载: ${filename}`);
            
            // 获取下载链接
            const downloadUrl = await this.getDownloadUrl(url);
            
            // 创建下载信息
            this.currentDownload = {
                url: downloadUrl,
                filename: filename || this.generateFilename(url),
                startTime: Date.now(),
                progress: 0,
                status: 'downloading'
            };
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.currentDownload.filename;
            link.style.display = 'none';
            
            // 添加到页面并触发点击
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 模拟下载进度
            this.simulateProgress();
            
            // 添加到历史记录
            this.addToHistory(this.currentDownload);
            
            console.log('下载已开始');
            
        } catch (error) {
            console.error('下载失败:', error);
            if (this.currentDownload) {
                this.currentDownload.status = 'error';
                this.currentDownload.error = error.message;
            }
            throw error;
        }
    }
    
    /**
     * 生成文件名
     * @param {string} url - URL
     * @returns {string} 文件名
     */
    generateFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            
            if (filename && filename.includes('.')) {
                return filename;
            }
            
            return `video_${Date.now()}.mp4`;
            
        } catch (error) {
            return `video_${Date.now()}.mp4`;
        }
    }
    
    /**
     * 模拟下载进度
     */
    simulateProgress() {
        if (!this.currentDownload) return;
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                if (this.currentDownload) {
                    this.currentDownload.progress = 100;
                    this.currentDownload.status = 'completed';
                    this.currentDownload.endTime = Date.now();
                }
                
                this.showProgress(100);
                this.showDownloadStatus('下载完成');
            } else {
                if (this.currentDownload) {
                    this.currentDownload.progress = progress;
                }
                this.showProgress(progress);
                this.showDownloadStatus(`下载中... ${Math.round(progress)}%`);
            }
        }, 200);
    }
    
    /**
     * 显示下载进度
     * @param {number} progress - 进度百分比
     */
    showProgress(progress) {
        const progressFill = document.getElementById('downloadProgress');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }
    
    /**
     * 显示下载状态
     * @param {string} status - 状态信息
     */
    showDownloadStatus(status) {
        const statusElement = document.getElementById('downloadStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    /**
     * 取消下载
     */
    cancelDownload() {
        if (this.currentDownload) {
            this.currentDownload.status = 'cancelled';
            this.currentDownload = null;
            console.log('下载已取消');
        }
    }
    
    /**
     * 添加到历史记录
     * @param {Object} download - 下载信息
     */
    addToHistory(download) {
        this.downloadHistory.unshift({
            ...download,
            timestamp: Date.now()
        });
        
        // 限制历史记录大小
        if (this.downloadHistory.length > 50) {
            this.downloadHistory = this.downloadHistory.slice(0, 50);
        }
    }
    
    /**
     * 获取下载历史
     * @returns {Array} 下载历史
     */
    getHistory() {
        return this.downloadHistory;
    }
    
    /**
     * 清空下载历史
     */
    clearHistory() {
        this.downloadHistory = [];
    }
    
    /**
     * 获取当前下载状态
     * @returns {Object|null} 当前下载状态
     */
    getCurrentDownload() {
        return this.currentDownload;
    }
    
    /**
     * 使用Blob下载
     * @param {string} url - 视频URL
     * @param {string} filename - 文件名
     * @returns {Promise<void>}
     */
    async downloadWithBlob(url, filename) {
        try {
            console.log(`使用Blob下载: ${filename}`);
            
            // 获取视频内容
            const response = await corsModule.fetchWithCORS(url);
            const blob = await response.blob();
            
            // 创建Blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || this.generateFilename(url);
            link.style.display = 'none';
            
            // 添加到页面并触发点击
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 释放Blob URL
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            
            console.log('Blob下载完成');
            
        } catch (error) {
            console.error('Blob下载失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取下载进度（如果浏览器支持）
     * @param {string} url - 下载URL
     * @returns {Promise<void>}
     */
    async downloadWithProgress(url, filename) {
        try {
            const response = await corsModule.fetchWithCORS(url);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const contentLength = response.headers.get('content-length');
            const total = parseInt(contentLength, 10);
            
            if (!total || isNaN(total)) {
                // 无法获取内容长度，使用普通下载
                return this.startDownload(url, filename);
            }
            
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                chunks.push(value);
                receivedLength += value.length;
                
                // 更新进度
                const progress = (receivedLength / total) * 100;
                this.showProgress(progress);
                this.showDownloadStatus(`下载中... ${Math.round(progress)}%`);
            }
            
            // 合并chunks
            const blob = new Blob(chunks);
            
            // 创建下载链接
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || this.generateFilename(url);
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 释放Blob URL
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            
            this.showProgress(100);
            this.showDownloadStatus('下载完成');
            
            console.log('带进度的下载完成');
            
        } catch (error) {
            console.error('带进度的下载失败:', error);
            throw error;
        }
    }
}

// 创建全局下载模块实例
const downloadModule = new DownloadModule();

// 导出下载模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DownloadModule, downloadModule };
}