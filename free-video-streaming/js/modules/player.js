/**
 * 播放模块
 * 管理视频播放功能，支持mp4和m3u8格式
 */

class PlayerModule {
    constructor() {
        this.videoElement = null;
        this.container = null;
        this.isPlaying = false;
        this.volume = 1;
        this.currentTime = 0;
        this.duration = 0;
        this.qualities = [];
        this.currentQuality = '';
        this.error = null;
        this.hls = null;
    }
    
    /**
     * 初始化播放器
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     */
    initPlayer(container, options = {}) {
        this.container = container;
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建视频元素
        this.videoElement = document.createElement('video');
        this.videoElement.className = 'video-player-element';
        this.videoElement.controls = true; // 使用原生控制栏
        this.videoElement.preload = 'auto';
        this.videoElement.playsInline = true;
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        this.videoElement.style.width = '100%';
        this.videoElement.style.maxHeight = '70vh';
        this.videoElement.style.backgroundColor = '#000';
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 添加到容器
        container.appendChild(this.videoElement);
        
        console.log('播放器初始化完成');
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        if (!this.videoElement) return;
        
        // 播放事件
        this.videoElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.dispatchEvent('play');
        });
        
        // 暂停事件
        this.videoElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.dispatchEvent('pause');
        });
        
        // 时间更新事件
        this.videoElement.addEventListener('timeupdate', () => {
            this.currentTime = this.videoElement.currentTime;
            this.dispatchEvent('timeupdate', { currentTime: this.currentTime });
        });
        
        // 加载元数据事件
        this.videoElement.addEventListener('loadedmetadata', () => {
            this.duration = this.videoElement.duration;
            this.dispatchEvent('loadedmetadata', { duration: this.duration });
        });
        
        // 结束事件
        this.videoElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.dispatchEvent('ended');
        });
        
        // 错误事件
        this.videoElement.addEventListener('error', (e) => {
            this.error = this.videoElement.error;
            this.handleVideoError(this.error);
            this.dispatchEvent('error', { error: this.error });
        });
    }
    
    /**
     * 播放视频
     * @param {string} videoUrl - 视频URL
     */
    play(videoUrl) {
        if (!this.videoElement) {
            console.error('播放器未初始化');
            return;
        }
        
        console.log(`播放视频: ${videoUrl}`);
        
        // 销毁之前的HLS实例
        this.destroyHls();
        
        // 检测视频类型
        if (this.isM3u8Url(videoUrl)) {
            this.playHls(videoUrl);
        } else {
            this.playDirect(videoUrl);
        }
    }
    
    /**
     * 检测是否是m3u8链接
     * @param {string} url - 视频URL
     * @returns {boolean} 是否是m3u8链接
     */
    isM3u8Url(url) {
        return url && (url.includes('.m3u8') || url.includes('m3u8'));
    }
    
    /**
     * 直接播放（mp4等格式）
     * @param {string} videoUrl - 视频URL
     */
    playDirect(videoUrl) {
        // 处理URL，可能需要代理
        const proxyUrl = this.getProxyUrl(videoUrl);
        
        this.videoElement.src = proxyUrl;
        this.videoElement.load();
        
        const playPromise = this.videoElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('播放失败:', error);
                // 尝试不使用代理直接播放
                this.videoElement.src = videoUrl;
                this.videoElement.load();
                this.videoElement.play().catch(e => {
                    console.error('直接播放也失败:', e);
                    this.showPlayError();
                });
            });
        }
    }
    
    /**
     * 播放HLS流（m3u8格式）
     * @param {string} videoUrl - m3u8视频URL
     */
    playHls(videoUrl) {
        // 检查浏览器是否原生支持HLS
        if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari原生支持
            this.videoElement.src = videoUrl;
            this.videoElement.load();
            this.videoElement.play().catch(error => {
                console.error('Safari HLS播放失败:', error);
                this.showPlayError();
            });
        } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            // 使用HLS.js播放
            console.log('使用HLS.js播放');
            this.hls = new Hls({
                xhrSetup: (xhr, url) => {
                    // 设置跨域
                    xhr.withCredentials = false;
                }
            });
            
            this.hls.loadSource(videoUrl);
            this.hls.attachMedia(this.videoElement);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest解析完成');
                this.videoElement.play().catch(error => {
                    console.error('HLS播放失败:', error);
                });
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS错误:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('网络错误，尝试恢复...');
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('媒体错误，尝试恢复...');
                            this.hls.recoverMediaError();
                            break;
                        default:
                            this.destroyHls();
                            this.showPlayError();
                            break;
                    }
                }
            });
        } else {
            // 不支持HLS，尝试使用代理转换
            console.log('浏览器不支持HLS，尝试其他方式');
            this.tryAlternativePlay(videoUrl);
        }
    }
    
    /**
     * 尝试替代播放方式
     * @param {string} videoUrl - 视频URL
     */
    async tryAlternativePlay(videoUrl) {
        // 尝试使用代理服务器转换格式
        const proxyUrl = this.getProxyUrl(videoUrl);
        
        this.videoElement.src = proxyUrl;
        this.videoElement.load();
        
        try {
            await this.videoElement.play();
        } catch (error) {
            console.error('替代播放方式失败:', error);
            this.showPlayError();
        }
    }
    
    /**
     * 获取代理URL
     * @param {string} url - 原始URL
     * @returns {string} 代理URL
     */
    getProxyUrl(url) {
        // 检测是否使用本地代理服务器
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '8080') {
            // 使用本地代理
            return `/proxy/${encodeURIComponent(url)}`;
        }
        
        // 使用CORS代理
        return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
    
    /**
     * 显示播放错误提示
     */
    showPlayError() {
        if (this.container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            `;
            errorDiv.innerHTML = `
                <p>视频播放失败</p>
                <p style="font-size: 12px; margin-top: 10px;">请尝试其他视频源或刷新页面</p>
            `;
            this.container.style.position = 'relative';
            this.container.appendChild(errorDiv);
            
            // 3秒后自动移除
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 3000);
        }
    }
    
    /**
     * 处理视频错误
     * @param {MediaError} error - 错误对象
     */
    handleVideoError(error) {
        let errorMessage = '视频播放失败';
        
        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    errorMessage = '视频播放被中止';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    errorMessage = '网络错误，请检查网络连接';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    errorMessage = '视频解码失败';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = '视频格式不支持';
                    break;
            }
        }
        
        console.error(`视频错误: ${errorMessage}`);
    }
    
    /**
     * 销毁HLS实例
     */
    destroyHls() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }
    
    /**
     * 暂停播放
     */
    pause() {
        if (this.videoElement) {
            this.videoElement.pause();
        }
    }
    
    /**
     * 切换播放状态
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            if (this.videoElement.src) {
                this.videoElement.play();
            }
        }
    }
    
    /**
     * 跳转进度
     * @param {number} time - 时间（秒）
     */
    seekTo(time) {
        if (this.videoElement) {
            this.videoElement.currentTime = Math.max(0, Math.min(time, this.duration));
        }
    }
    
    /**
     * 设置音量
     * @param {number} volume - 音量 0-1
     */
    setVolume(volume) {
        if (this.videoElement) {
            this.videoElement.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    /**
     * 切换静音
     */
    toggleMute() {
        if (this.videoElement) {
            this.videoElement.muted = !this.videoElement.muted;
        }
    }
    
    /**
     * 切换全屏
     */
    toggleFullscreen() {
        if (!this.container) return;
        
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.error);
        } else {
            this.container.requestFullscreen().catch(console.error);
        }
    }
    
    /**
     * 派发事件
     * @param {string} eventName - 事件名称
     * @param {Object} detail - 事件详情
     */
    dispatchEvent(eventName, detail = {}) {
        if (this.container) {
            const event = new CustomEvent(`player:${eventName}`, { detail });
            this.container.dispatchEvent(event);
        }
    }
    
    /**
     * 获取播放状态
     * @returns {Object} 播放状态
     */
    getPlayState() {
        return {
            url: this.videoElement ? this.videoElement.src : '',
            currentTime: this.currentTime,
            duration: this.duration,
            playing: this.isPlaying,
            volume: this.volume,
            error: this.error ? this.error.message : ''
        };
    }
    
    /**
     * 销毁播放器
     */
    destroy() {
        this.destroyHls();
        
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.load();
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.videoElement = null;
        this.container = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        
        console.log('播放器已销毁');
    }
}

// 创建全局播放模块实例
const playerModule = new PlayerModule();

// 导出播放模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayerModule, playerModule };
}