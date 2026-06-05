/**
 * 播放模块
 * 使用DPlayer播放器，提供更好的播放体验
 */

class PlayerModule {
    constructor() {
        this.container = null;
        this.dp = null; // DPlayer实例
        this.isPlaying = false;
        this.currentSourceIndex = 0;
        this.sources = [];
        this.playMode = 'iframe'; // 'iframe' 或 'dplayer'
        this.episodes = []; // 剧集列表
        this.currentEpisodeIndex = 0; // 当前剧集索引
        this.onEpisodeChange = null; // 剧集切换回调
    }
    
    /**
     * 初始化播放器
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     */
    initPlayer(container, options = {}) {
        this.container = container;
        container.innerHTML = '';
        
        console.log('播放器初始化完成');
    }
    
    /**
     * 播放视频
     * @param {string} videoUrl - 视频URL或页面URL
     * @param {Array} sources - 备用视频源列表
     * @param {string} mode - 播放模式: 'iframe' 或 'dplayer'
     * @param {Object} options - 额外选项，包含episodes和currentEpisodeIndex
     */
    play(videoUrl, sources = [], mode = 'iframe', options = {}) {
        if (!this.container) {
            console.error('播放器未初始化');
            return;
        }
        
        console.log(`播放视频: ${videoUrl}, 模式: ${mode}`);
        
        this.sources = sources;
        this.currentSourceIndex = 0;
        this.playMode = mode;
        
        // 设置剧集信息
        if (options.episodes) {
            this.episodes = options.episodes;
        }
        if (options.currentEpisodeIndex !== undefined) {
            this.currentEpisodeIndex = options.currentEpisodeIndex;
        }
        
        // 清空容器
        this.container.innerHTML = '';
        
        if (mode === 'dplayer' && this.isDirectVideoUrl(videoUrl)) {
            // 使用DPlayer直接播放
            this.playWithDPlayer(videoUrl, this.container);
        } else {
            // 使用iframe嵌入
            this.playWithIframe(videoUrl, this.container);
        }
        
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
        // 获取视频配置
        const videoConfig = this.getVideoConfig(videoUrl);
        
        // 创建DPlayer容器
        const dpContainer = document.createElement('div');
        dpContainer.id = 'dplayer';
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
            video: {
                url: videoUrl,
                type: videoConfig.type,
                customType: videoConfig.customType
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
        
        // 视频播放结束时自动播放下一集
        this.dp.on('ended', () => {
            console.log('视频播放结束，尝试播放下一集...');
            this.playNextEpisode();
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
     * @returns {Object} 包含type和customType
     */
    getVideoConfig(url) {
        if (!url) return { type: 'auto', customType: {} };
        
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.includes('.m3u8')) {
            return {
                type: 'customHls',
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
            };
        } else if (lowerUrl.includes('.mp4')) {
            return { type: 'auto', customType: {} };
        } else if (lowerUrl.includes('.flv')) {
            return { type: 'flv', customType: {} };
        } else if (lowerUrl.includes('.webm')) {
            return { type: 'auto', customType: {} };
        }
        
        // 默认使用auto
        return { type: 'auto', customType: {} };
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
     * 播放下一集
     */
    playNextEpisode() {
        if (!this.episodes || this.episodes.length === 0) {
            console.log('没有剧集信息');
            return;
        }
        
        const nextIndex = this.currentEpisodeIndex + 1;
        if (nextIndex >= this.episodes.length) {
            console.log('已经是最后一集');
            return;
        }
        
        const nextEpisode = this.episodes[nextIndex];
        if (!nextEpisode || !nextEpisode.url) {
            console.log('下一集URL无效');
            return;
        }
        
        console.log(`自动播放下一集: ${nextEpisode.name}`);
        this.currentEpisodeIndex = nextIndex;
        
        // 判断播放模式
        const isDirectVideo = this.isDirectVideoUrl(nextEpisode.url);
        const playMode = isDirectVideo ? 'dplayer' : 'iframe';
        
        // 播放下一集
        this.play(nextEpisode.url, this.sources, playMode);
        
        // 调用回调函数更新UI
        if (typeof this.onEpisodeChange === 'function') {
            this.onEpisodeChange(this.currentEpisodeIndex);
        }
    }
    
    /**
     * 设置剧集切换回调
     * @param {Function} callback - 回调函数
     */
    setOnEpisodeChange(callback) {
        this.onEpisodeChange = callback;
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