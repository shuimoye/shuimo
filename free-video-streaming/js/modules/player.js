/**
 * 播放模块
 * 支持iframe嵌入和DPlayer直接播放
 */

class PlayerModule {
    constructor() {
        this.container = null;
        this.dp = null; // DPlayer实例
        this.isPlaying = false;
        this.currentSourceIndex = 0;
        this.sources = [];
        this.playMode = 'iframe'; // 'iframe' 或 'dplayer'
    }
    
    /**
     * 初始化播放器
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     */
    initPlayer(container, options = {}) {
        this.container = container;
        container.innerHTML = '';
        
        // 创建播放器容器
        const playerContainer = document.createElement('div');
        playerContainer.id = 'playerContainer';
        playerContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            background: #000;
        `;
        container.appendChild(playerContainer);
        
        console.log('播放器初始化完成');
    }
    
    /**
     * 播放视频
     * @param {string} videoUrl - 视频URL或页面URL
     * @param {Array} sources - 备用视频源列表
     * @param {string} mode - 播放模式: 'iframe' 或 'dplayer'
     */
    play(videoUrl, sources = [], mode = 'iframe') {
        if (!this.container) {
            console.error('播放器未初始化');
            return;
        }
        
        console.log(`播放视频: ${videoUrl}, 模式: ${mode}`);
        
        this.sources = sources;
        this.currentSourceIndex = 0;
        this.playMode = mode;
        
        const playerContainer = document.getElementById('playerContainer');
        if (!playerContainer) return;
        
        // 清空容器
        playerContainer.innerHTML = '';
        
        if (mode === 'dplayer' && this.isDirectVideoUrl(videoUrl)) {
            // 使用DPlayer直接播放
            this.playWithDPlayer(videoUrl, playerContainer);
        } else {
            // 使用iframe嵌入
            this.playWithIframe(videoUrl, playerContainer);
        }
        
        // 添加控制按钮
        this.addControlButtons(playerContainer);
        
        this.isPlaying = true;
    }
    
    /**
     * 判断是否是直接视频URL
     * @param {string} url - URL
     * @returns {boolean}
     */
    isDirectVideoUrl(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('.mp4') || 
               lowerUrl.includes('.m3u8') || 
               lowerUrl.includes('.flv') ||
               lowerUrl.includes('.webm') ||
               lowerUrl.includes('.mkv');
    }
    
    /**
     * 使用DPlayer播放
     * @param {string} videoUrl - 视频URL
     * @param {HTMLElement} container - 容器
     */
    playWithDPlayer(videoUrl, container) {
        // 检测视频类型
        const videoType = this.getVideoType(videoUrl);
        
        // 创建DPlayer容器
        const dpContainer = document.createElement('div');
        dpContainer.id = 'dplayer';
        dpContainer.style.width = '100%';
        dpContainer.style.height = '100%';
        container.appendChild(dpContainer);
        
        // 创建DPlayer实例
        this.dp = new DPlayer({
            container: dpContainer,
            autoplay: true,
            theme: '#FADFA3',
            lang: 'zh-cn',
            screenshot: true,
            hotkey: true,
            preload: 'auto',
            volume: 0.7,
            mutex: true,
            fullscreen: true,
            fullscreenWeb: true,
            video: {
                url: videoUrl,
                type: videoType,
                customType: {
                    customHls: function(video, player) {
                        if (Hls.isSupported()) {
                            const hls = new Hls({
                                maxBufferLength: 30,
                                maxMaxBufferLength: 60,
                                maxBufferSize: 60 * 1000 * 1000,
                                maxBufferHole: 0.5,
                                lowLatencyMode: false,
                                startLevel: -1,
                                abrEwmaDefaultEstimate: 500000,
                                abrEwmaFastEstimate: 500000,
                                abrEwmaSlowEstimate: 500000
                            });
                            hls.loadSource(video.src);
                            hls.attachMedia(video);
                            hls.on(Hls.Events.ERROR, function(event, data) {
                                if (data.fatal) {
                                    console.error('HLS错误:', data);
                                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                        hls.startLoad();
                                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                                        hls.recoverMediaError();
                                    }
                                }
                            });
                            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                                video.play();
                            });
                        }
                    }
                }
            }
        });
        
        // 添加错误处理
        this.dp.on('error', () => {
            console.error('播放错误，尝试切换源...');
            this.switchToNextSource();
        });
        
        this.dp.on('playing', () => {
            console.log('视频开始播放');
            this.isPlaying = true;
        });
        
        console.log('DPlayer播放器创建成功');
    }
    
    /**
     * 使用iframe播放
     * @param {string} pageUrl - 页面URL
     * @param {HTMLElement} container - 容器
     */
    playWithIframe(pageUrl, container) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
        `;
        iframe.src = pageUrl;
        iframe.allowFullscreen = true;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        
        // 添加加载事件
        iframe.onload = () => {
            console.log('iframe加载完成');
        };
        
        iframe.onerror = () => {
            console.error('iframe加载失败');
            this.switchToNextSource();
        };
        
        container.appendChild(iframe);
        console.log('iframe播放器创建成功');
    }
    
    /**
     * 获取视频类型
     * @param {string} url - 视频URL
     * @returns {string} 视频类型
     */
    getVideoType(url) {
        if (!url) return 'auto';
        
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.includes('.m3u8')) {
            return 'customHls';
        } else if (lowerUrl.includes('.mp4')) {
            return 'auto';
        } else if (lowerUrl.includes('.flv')) {
            return 'flv';
        } else if (lowerUrl.includes('.webm')) {
            return 'auto';
        }
        
        // 默认使用HLS
        return 'customHls';
    }
    
    /**
     * 切换到下一个源
     */
    switchToNextSource() {
        if (this.sources.length <= 1) return;
        
        this.currentSourceIndex = (this.currentSourceIndex + 1) % this.sources.length;
        const newUrl = this.sources[this.currentSourceIndex];
        
        console.log(`切换到源 ${this.currentSourceIndex + 1}: ${newUrl}`);
        
        this.play(newUrl, this.sources, this.playMode);
    }
    
    /**
     * 添加控制按钮
     * @param {HTMLElement} container - 容器
     */
    addControlButtons(container) {
        // 移除已有的控制按钮
        const existingBtns = container.querySelector('.custom-controls');
        if (existingBtns) {
            existingBtns.remove();
        }
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'custom-controls';
        buttonContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 99999;
            display: flex;
            gap: 8px;
            pointer-events: auto;
        `;
        
        // 全屏按钮
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 18px;
            pointer-events: auto;
            position: relative;
            z-index: 99999;
        `;
        fullscreenBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFullscreen();
        };
        buttonContainer.appendChild(fullscreenBtn);
        
        // 切换源按钮
        if (this.sources.length > 1) {
            const switchBtn = document.createElement('button');
            switchBtn.innerHTML = '切换源';
            switchBtn.style.cssText = `
                background: rgba(0,0,0,0.7);
                color: white;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                pointer-events: auto;
                position: relative;
                z-index: 99999;
            `;
            switchBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchToNextSource();
            };
            buttonContainer.appendChild(switchBtn);
        }
        
        container.appendChild(buttonContainer);
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
     * 暂停播放
     */
    pause() {
        if (this.dp) {
            this.dp.pause();
        }
        this.isPlaying = false;
    }
    
    /**
     * 停止播放
     */
    stop() {
        if (this.dp) {
            this.dp.destroy();
            this.dp = null;
        }
        this.isPlaying = false;
    }
    
    /**
     * 销毁播放器
     */
    destroy() {
        if (this.dp) {
            this.dp.destroy();
            this.dp = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.container = null;
        this.isPlaying = false;
        this.sources = [];
        
        console.log('播放器已销毁');
    }
}

// 创建全局播放模块实例
const playerModule = new PlayerModule();

// 导出播放模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayerModule, playerModule };
}