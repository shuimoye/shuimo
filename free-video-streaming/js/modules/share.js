/**
 * 分享模块
 * 处理网页分享功能
 */

class ShareModule {
    constructor() {
        this.shareUrl = window.location.href;
        this.shareTitle = '免费视频流媒体';
        this.shareText = '发现了一个免费视频流媒体应用，快来看看吧！';
    }
    
    /**
     * 生成分享链接
     * @param {string} videoId - 视频ID
     * @param {Object} params - 额外参数
     * @returns {string} 分享链接
     */
    generateShareLink(videoId, params = {}) {
        try {
            const url = new URL(window.location.href);
            
            // 添加视频ID参数
            if (videoId) {
                url.searchParams.set('video', videoId);
            }
            
            // 添加其他参数
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, value.toString());
                }
            });
            
            return url.toString();
            
        } catch (error) {
            console.error('生成分享链接失败:', error);
            return window.location.href;
        }
    }
    
    /**
     * 复制到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>} 是否成功
     */
    async copyToClipboard(text) {
        try {
            // 使用Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                console.log('已复制到剪贴板');
                return true;
            }
            
            // 降级方案
            return this.fallbackCopyToClipboard(text);
            
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            return false;
        }
    }
    
    /**
     * 降级复制方案
     * @param {string} text - 要复制的文本
     * @returns {boolean} 是否成功
     */
    fallbackCopyToClipboard(text) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                console.log('已复制到剪贴板（降级方案）');
            }
            
            return success;
            
        } catch (error) {
            console.error('降级复制方案失败:', error);
            return false;
        }
    }
    
    /**
     * 生成分享卡片
     * @param {Object} videoInfo - 视频信息
     * @returns {HTMLElement} 分享卡片元素
     */
    generateShareCard(videoInfo) {
        const card = document.createElement('div');
        card.className = 'share-card';
        card.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 20px;
            color: white;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        
        card.innerHTML = `
            <div style="text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 18px;">${videoInfo.title || '免费视频'}</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
                    ${videoInfo.description || '快来观看这个精彩视频'}
                </p>
                <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 12px;">长按识别二维码观看</p>
                </div>
                <p style="margin: 0; font-size: 12px; opacity: 0.7;">
                    来自免费视频流媒体
                </p>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 调用系统分享
     * @param {Object} data - 分享数据
     * @returns {Promise<boolean>} 是否成功
     */
    async invokeSystemShare(data = {}) {
        try {
            // 检查是否支持Web Share API
            if (!navigator.share) {
                console.warn('Web Share API不可用');
                return false;
            }
            
            const shareData = {
                title: data.title || this.shareTitle,
                text: data.text || this.shareText,
                url: data.url || this.shareUrl
            };
            
            await navigator.share(shareData);
            console.log('系统分享成功');
            return true;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('用户取消分享');
            } else {
                console.error('系统分享失败:', error);
            }
            return false;
        }
    }
    
    /**
     * 分享到微信
     * @param {Object} videoInfo - 视频信息
     */
    shareToWeChat(videoInfo) {
        // 生成分享链接
        const shareLink = this.generateShareLink(videoInfo.id);
        
        // 复制链接
        this.copyToClipboard(shareLink).then(success => {
            if (success) {
                this.showToast('链接已复制，请打开微信粘贴分享');
            } else {
                this.showToast('复制失败，请手动复制链接');
            }
        });
    }
    
    /**
     * 分享到QQ
     * @param {Object} videoInfo - 视频信息
     */
    shareToQQ(videoInfo) {
        const shareLink = this.generateShareLink(videoInfo.id);
        const shareText = `${videoInfo.title || '免费视频'} - ${shareLink}`;
        
        this.copyToClipboard(shareText).then(success => {
            if (success) {
                this.showToast('内容已复制，请打开QQ粘贴分享');
            } else {
                this.showToast('复制失败，请手动复制内容');
            }
        });
    }
    
    /**
     * 分享到微博
     * @param {Object} videoInfo - 视频信息
     */
    shareToWeibo(videoInfo) {
        const shareLink = this.generateShareLink(videoInfo.id);
        const shareText = `${videoInfo.title || '免费视频'} ${shareLink}`;
        
        // 打开微博分享页面
        const weiboUrl = `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}`;
        window.open(weiboUrl, '_blank');
    }
    
    /**
     * 显示分享对话框
     * @param {Object} videoInfo - 视频信息
     */
    showShareDialog(videoInfo) {
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'share-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 300px;
            width: 90%;
        `;
        
        content.innerHTML = `
            <h3 style="margin: 0 0 20px 0; text-align: center;">分享到</h3>
            <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
                <button class="share-option" data-type="wechat" style="background: none; border: none; cursor: pointer;">
                    <div style="width: 50px; height: 50px; background: #07c160; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <span style="color: white; font-size: 20px;">微</span>
                    </div>
                    <span style="font-size: 12px;">微信</span>
                </button>
                <button class="share-option" data-type="qq" style="background: none; border: none; cursor: pointer;">
                    <div style="width: 50px; height: 50px; background: #12b7f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <span style="color: white; font-size: 20px;">Q</span>
                    </div>
                    <span style="font-size: 12px;">QQ</span>
                </button>
                <button class="share-option" data-type="weibo" style="background: none; border: none; cursor: pointer;">
                    <div style="width: 50px; height: 50px; background: #e6162d; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <span style="color: white; font-size: 20px;">微</span>
                    </div>
                    <span style="font-size: 12px;">微博</span>
                </button>
                <button class="share-option" data-type="link" style="background: none; border: none; cursor: pointer;">
                    <div style="width: 50px; height: 50px; background: #666; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <span style="color: white; font-size: 20px;">链</span>
                    </div>
                    <span style="font-size: 12px;">复制链接</span>
                </button>
            </div>
            <button class="close-dialog" style="width: 100%; padding: 12px; background: #f5f5f5; border: none; border-radius: 8px; cursor: pointer;">取消</button>
        `;
        
        dialog.appendChild(content);
        document.body.appendChild(dialog);
        
        // 绑定事件
        const shareOptions = content.querySelectorAll('.share-option');
        shareOptions.forEach(option => {
            option.addEventListener('click', () => {
                const type = option.dataset.type;
                this.handleShareAction(type, videoInfo);
                document.body.removeChild(dialog);
            });
        });
        
        const closeBtn = content.querySelector('.close-dialog');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        // 点击背景关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }
    
    /**
     * 处理分享操作
     * @param {string} type - 分享类型
     * @param {Object} videoInfo - 视频信息
     */
    handleShareAction(type, videoInfo) {
        switch (type) {
            case 'wechat':
                this.shareToWeChat(videoInfo);
                break;
            case 'qq':
                this.shareToQQ(videoInfo);
                break;
            case 'weibo':
                this.shareToWeibo(videoInfo);
                break;
            case 'link':
                const shareLink = this.generateShareLink(videoInfo.id);
                this.copyToClipboard(shareLink).then(success => {
                    if (success) {
                        this.showToast('链接已复制到剪贴板');
                    } else {
                        this.showToast('复制失败');
                    }
                });
                break;
        }
    }
    
    /**
     * 显示提示信息
     * @param {string} message - 提示信息
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1001;
            font-size: 14px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
    
    /**
     * 获取分享URL
     * @returns {string} 当前分享URL
     */
    getShareUrl() {
        return this.shareUrl;
    }
    
    /**
     * 设置分享URL
     * @param {string} url - 分享URL
     */
    setShareUrl(url) {
        this.shareUrl = url;
    }
    
    /**
     * 获取分享标题
     * @returns {string} 分享标题
     */
    getShareTitle() {
        return this.shareTitle;
    }
    
    /**
     * 设置分享标题
     * @param {string} title - 分享标题
     */
    setShareTitle(title) {
        this.shareTitle = title;
    }
    
    /**
     * 获取分享文本
     * @returns {string} 分享文本
     */
    getShareText() {
        return this.shareText;
    }
    
    /**
     * 设置分享文本
     * @param {string} text - 分享文本
     */
    setShareText(text) {
        this.shareText = text;
    }
}

// 创建全局分享模块实例
const shareModule = new ShareModule();

// 导出分享模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShareModule, shareModule };
}