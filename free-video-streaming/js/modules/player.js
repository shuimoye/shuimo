/**
 * 播放模块
 * 管理视频播放功能
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
        this.videoElement.controls = false; // 使用自定义控制栏
        this.videoElement.preload = 'metadata';
        this.videoElement.playsInline = true;
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 添加到容器
        container.appendChild(this.videoElement);
        
        // 创建控制栏
        this.createControls(container);
        
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
            this.updatePlayButton();
            this.dispatchEvent('play');
        });
        
        // 暂停事件
        this.videoElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this.dispatchEvent('pause');
        });
        
        // 时间更新事件
        this.videoElement.addEventListener('timeupdate', () => {
            this.currentTime = this.videoElement.currentTime;
            this.updateProgressBar();
            this.updateTimeDisplay();
            this.dispatchEvent('timeupdate', { currentTime: this.currentTime });
        });
        
        // 加载元数据事件
        this.videoElement.addEventListener('loadedmetadata', () => {
            this.duration = this.videoElement.duration;
            this.updateTimeDisplay();
            this.dispatchEvent('loadedmetadata', { duration: this.duration });
        });
        
        // 结束事件
        this.videoElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this.dispatchEvent('ended');
        });
        
        // 错误事件
        this.videoElement.addEventListener('error', (e) => {
            this.error = this.videoElement.error;
            this.handleVideoError(this.error);
            this.dispatchEvent('error', { error: this.error });
        });
        
        // 音量变化事件
        this.videoElement.addEventListener('volumechange', () => {
            this.volume = this.videoElement.volume;
            this.updateVolumeSlider();
        });
    }
    
    /**
     * 创建控制栏
     * @param {HTMLElement} container - 容器元素
     */
    createControls(container) {
        const controls = document.createElement('div');
        controls.className = 'player-controls';
        controls.innerHTML = `
            <button class="control-btn play-pause-btn">▶</button>
            <div class="progress-bar">
                <div class="progress-fill"></div>
                <div class="progress-handle"></div>
            </div>
            <span class="time-display">00:00 / 00:00</span>
            <div class="volume-control">
                <button class="control-btn volume-btn">🔊</button>
                <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="1">
            </div>
            <button class="control-btn fullscreen-btn">⛶</button>
        `;
        
        container.appendChild(controls);
        
        // 绑定控制栏事件
        this.bindControlEvents(controls);
    }
    
    /**
     * 绑定控制栏事件
     * @param {HTMLElement} controls - 控制栏元素
     */
    bindControlEvents(controls) {
        // 播放/暂停按钮
        const playPauseBtn = controls.querySelector('.play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlay());
        }
        
        // 进度条点击
        const progressBar = controls.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.seekTo(percent * this.duration);
            });
        }
        
        // 音量滑块
        const volumeSlider = controls.querySelector('.volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(parseFloat(e.target.value));
            });
        }
        
        // 音量按钮
        const volumeBtn = controls.querySelector('.volume-btn');
        if (volumeBtn) {
            volumeBtn.addEventListener('click', () => this.toggleMute());
        }
        
        // 全屏按钮
        const fullscreenBtn = controls.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
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
        
        // 设置视频源
        this.videoElement.src = videoUrl;
        
        // 开始播放
        this.videoElement.play().catch(error => {
            console.error('播放失败:', error);
            this.handleVideoError(error);
        });
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
            this.updateVolumeButton();
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
     * 切换清晰度
     * @param {string} quality - 清晰度
     */
    switchQuality(quality) {
        if (!this.qualities.includes(quality)) {
            console.warn(`不支持的清晰度: ${quality}`);
            return;
        }
        
        const currentTime = this.currentTime;
        const wasPlaying = this.isPlaying;
        
        this.currentQuality = quality;
        
        // 这里需要根据实际实现切换清晰度
        // 通常需要重新加载视频源
        
        console.log(`切换清晰度: ${quality}`);
        
        // 恢复播放状态
        this.seekTo(currentTime);
        if (wasPlaying) {
            this.videoElement.play();
        }
    }
    
    /**
     * 更新播放按钮
     */
    updatePlayButton() {
        if (!this.container) return;
        
        const playPauseBtn = this.container.querySelector('.play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.textContent = this.isPlaying ? '⏸' : '▶';
        }
    }
    
    /**
     * 更新进度条
     */
    updateProgressBar() {
        if (!this.container || !this.duration) return;
        
        const progressFill = this.container.querySelector('.progress-fill');
        if (progressFill) {
            const percent = (this.currentTime / this.duration) * 100;
            progressFill.style.width = `${percent}%`;
        }
    }
    
    /**
     * 更新时间显示
     */
    updateTimeDisplay() {
        if (!this.container) return;
        
        const timeDisplay = this.container.querySelector('.time-display');
        if (timeDisplay) {
            timeDisplay.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(this.duration)}`;
        }
    }
    
    /**
     * 更新音量滑块
     */
    updateVolumeSlider() {
        if (!this.container) return;
        
        const volumeSlider = this.container.querySelector('.volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.volume;
        }
    }
    
    /**
     * 更新音量按钮
     */
    updateVolumeButton() {
        if (!this.container) return;
        
        const volumeBtn = this.container.querySelector('.volume-btn');
        if (volumeBtn) {
            volumeBtn.textContent = this.videoElement.muted ? '🔇' : '🔊';
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
                    errorMessage = '视频解码失败，格式可能不支持';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = '视频源不支持，请尝试其他源';
                    break;
            }
        }
        
        console.error(`视频错误: ${errorMessage}`);
        this.dispatchEvent('error', { message: errorMessage });
    }
    
    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
            videoId: '',
            url: this.videoElement ? this.videoElement.src : '',
            currentTime: this.currentTime,
            duration: this.duration,
            playing: this.isPlaying,
            volume: this.volume,
            quality: this.currentQuality,
            qualities: this.qualities,
            error: this.error ? this.error.message : ''
        };
    }
    
    /**
     * 销毁播放器
     */
    destroy() {
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