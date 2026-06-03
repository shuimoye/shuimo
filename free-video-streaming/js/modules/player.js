/**
 * 播放模块
 * 使用iframe嵌入方式播放，支持file://协议
 * 优化播放体验
 */

class PlayerModule {
    constructor() {
        this.container = null;
        this.iframe = null;
        this.isPlaying = false;
        this.currentSourceIndex = 0;
        this.sources = [];
    }
    
    /**
     * 初始化播放器
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     */
    initPlayer(container, options = {}) {
        this.container = container;
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.paddingBottom = '56.25%'; // 16:9 比例
        container.style.height = '0';
        container.style.overflow = 'hidden';
        container.style.backgroundColor = '#000';
        container.style.borderRadius = '8px';
        
        console.log('播放器初始化完成');
    }
    
    /**
     * 播放视频
     * @param {string} videoUrl - 视频URL（播放页面地址）
     * @param {Array} sources - 备用视频源列表
     */
    play(videoUrl, sources = []) {
        if (!this.container) {
            console.error('播放器未初始化');
            return;
        }
        
        console.log(`播放视频: ${videoUrl}`);
        
        this.sources = sources;
        this.currentSourceIndex = 0;
        
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建iframe
        this.iframe = document.createElement('iframe');
        this.iframe.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `;
        
        // 设置iframe属性
        this.iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
        this.iframe.setAttribute('frameborder', '0');
        this.iframe.setAttribute('scrolling', 'no');
        this.iframe.setAttribute('webkitallowfullscreen', '');
        this.iframe.setAttribute('mozallowfullscreen', '');
        
        // 加载播放页面
        this.iframe.src = videoUrl;
        
        // 添加到容器
        this.container.appendChild(this.iframe);
        
        // 添加控制按钮
        this.addControlButtons();
        
        this.isPlaying = true;
    }
    
    /**
     * 添加控制按钮
     */
    addControlButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
            display: flex;
            gap: 8px;
        `;
        
        // 全屏按钮
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.style.cssText = `
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 18px;
        `;
        fullscreenBtn.onclick = () => this.toggleFullscreen();
        buttonContainer.appendChild(fullscreenBtn);
        
        // 切换源按钮（如果有多个源）
        if (this.sources.length > 1) {
            const switchBtn = document.createElement('button');
            switchBtn.innerHTML = '切换源';
            switchBtn.style.cssText = `
                background: rgba(0,0,0,0.5);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
            `;
            switchBtn.onclick = () => this.switchSource();
            buttonContainer.appendChild(switchBtn);
        }
        
        this.container.appendChild(buttonContainer);
    }
    
    /**
     * 切换视频源
     */
    switchSource() {
        if (this.sources.length <= 1) return;
        
        this.currentSourceIndex = (this.currentSourceIndex + 1) % this.sources.length;
        const newUrl = this.sources[this.currentSourceIndex];
        
        console.log(`切换到源 ${this.currentSourceIndex + 1}: ${newUrl}`);
        
        if (this.iframe) {
            this.iframe.src = newUrl;
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
     * 暂停播放
     */
    pause() {
        this.isPlaying = false;
    }
    
    /**
     * 停止播放
     */
    stop() {
        if (this.iframe) {
            this.iframe.src = '';
        }
        this.isPlaying = false;
    }
    
    /**
     * 销毁播放器
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.style.paddingBottom = '';
            this.container.style.height = '';
        }
        
        this.iframe = null;
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